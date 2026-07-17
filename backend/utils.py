import bcrypt
import hashlib
import json
import logging
from datetime import datetime, timezone, timedelta, date
from pathlib import Path
from typing import Any

import joblib

from config import get_settings
from db import DBUnavailableError, get_db_connection


logger = logging.getLogger("matricare")


def load_model(model_file: Path) -> Any | None:
    try:
        if not model_file.exists():
            logger.warning("Model file not found at %s", model_file)
            return None

        return joblib.load(model_file)
    except Exception:
        logger.exception("Failed to load model from %s", model_file)
        return None


def calculate_gestational_weeks(pregnancy_start_date) -> int:
    if not pregnancy_start_date:
        return 0
    if isinstance(pregnancy_start_date, str):
        try:
            pregnancy_start_date = datetime.strptime(pregnancy_start_date, "%Y-%m-%d").date()
        except Exception:
            return 0
    elif isinstance(pregnancy_start_date, datetime):
        pregnancy_start_date = pregnancy_start_date.date()
    elif isinstance(pregnancy_start_date, date):
        pass
    else:
        return 0
        
    today = datetime.now().date()
    days = (today - pregnancy_start_date).days
    weeks = int(days / 7)
    return max(0, min(40, weeks))



def _read_users() -> dict:
    users_file = get_settings()["users_file"]
    if not users_file.exists():
        return {}

    try:
        with users_file.open("r", encoding="utf-8") as file_handle:
            data = json.load(file_handle)
        return data if isinstance(data, dict) else {}
    except Exception:
        logger.exception("Failed to read users file")
        return {}


def _write_users(users: dict) -> None:
    users_file = get_settings()["users_file"]
    try:
        with users_file.open("w", encoding="utf-8") as file_handle:
            json.dump(users, file_handle, indent=2)
    except Exception:
        logger.exception("Failed to write users file")


def _json_safe_value(value: Any):
    if isinstance(value, datetime):
        return value.astimezone(timezone.utc).isoformat()

    if isinstance(value, dict):
        return {
            key: _json_safe_value(inner_value)
            for key, inner_value in value.items()
            if key != "_id"
        }

    if isinstance(value, list):
        return [_json_safe_value(item) for item in value]

    return value


def _hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def _verify_password(password: str, password_hash: str) -> bool:
    try:
        if password_hash.startswith(("$2a$", "$2b$", "$2y$")):
            return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))

        legacy_hash = hashlib.sha256(password.encode("utf-8")).hexdigest()
        return password_hash == legacy_hash
    except Exception:
        return False


def _normalize_user_record(user_record: dict | str | None) -> dict:
    if isinstance(user_record, dict):
        password_hash = user_record.get("password_hash")
        if not isinstance(password_hash, str) or not password_hash:
            password_hash = user_record.get("hashed_password")
        if not isinstance(password_hash, str) or not password_hash:
            password_hash = user_record.get("password")

        history = user_record.get("history")
        if not isinstance(history, list):
            history = []

        profile = user_record.get("profile")
        if not isinstance(profile, dict):
            profile = {}

        return {
            "email": str(user_record.get("email", "")).strip().lower(),
            "password_hash": password_hash if isinstance(password_hash, str) else "",
            "hashed_password": password_hash if isinstance(password_hash, str) else "",
            "history": history,
            "profile": profile,
        }

    if isinstance(user_record, str):
        return {
            "email": "",
            "password_hash": user_record,
            "hashed_password": user_record,
            "history": [],
            "profile": {},
        }

    return {
        "email": "",
        "password_hash": "",
        "hashed_password": "",
        "history": [],
        "profile": {},
    }


def _sorted_history(history: list | None) -> list:
    if not isinstance(history, list):
        return []

    return sorted(
        history,
        key=lambda item: item.get("timestamp", "") if isinstance(item, dict) else "",
        reverse=True,
    )


def _get_history_entry_fingerprint(entry: dict) -> str:
    params = entry.get("parameters") or {}
    params_normalized = {}
    for k, v in params.items():
        if k.startswith("_") or k == "xai_details":
            continue
        try:
            params_normalized[k] = float(v)
        except Exception:
            params_normalized[k] = v
            
    params_str = json.dumps(params_normalized, sort_keys=True)
    
    ts_str = str(entry.get("timestamp") or "").strip()
    norm_ts = ""
    if ts_str:
        try:
            if " " in ts_str and "T" not in ts_str:
                clean_ts = ts_str.split(".")[0]
                dt = datetime.strptime(clean_ts, "%Y-%m-%d %H:%M:%S")
            else:
                dt = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
            
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
                
            dt = dt.astimezone(timezone.utc)
            norm_ts = dt.strftime("%Y-%m-%d %H:%M")
        except Exception:
            norm_ts = ts_str[:16]
            
    return f"{norm_ts}_{params_str}"


def _merge_history_entries(*histories: list | None) -> list:
    merged: list = []
    seen: set[str] = set()

    for history in histories:
        if not isinstance(history, list):
            continue

        for entry in history:
            if not isinstance(entry, dict):
                continue

            fingerprint = _get_history_entry_fingerprint(entry)
            if fingerprint in seen:
                continue

            seen.add(fingerprint)
            merged.append(entry)

    return _sorted_history(merged)


def _db_conn():
    try:
        return get_db_connection()
    except DBUnavailableError as exc:
        logger.warning("Database unavailable: %s", exc)
    except Exception as exc:
        logger.warning("Failed to connect to Database: %s", exc)
    return None


def _read_user_from_db(user_id: str, conn) -> dict | None:
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM user WHERE email = %s", (user_id,))
        db_user = cursor.fetchone()
        if not db_user:
            cursor.close()
            return None
        
        cursor.execute(
            "SELECT * FROM risk_assessment WHERE user_email = %s ORDER BY timestamp DESC",
            (user_id,)
        )
        predictions = cursor.fetchall()
        history_list = []
        for pred in predictions:
            params = pred.get("parameters")
            if isinstance(params, str):
                try:
                    params = json.loads(params)
                except Exception:
                    params = {}
            elif params is None:
                params = {}
                
            ts = pred.get("timestamp")
            if isinstance(ts, datetime):
                if ts.tzinfo is None:
                    ts = ts.replace(tzinfo=timezone.utc)
                timestamp_str = ts.isoformat()
            else:
                timestamp_str = str(ts)
            
            history_list.append({
                "timestamp": timestamp_str,
                "prediction": pred.get("prediction", "No Risk"),
                "parameters": params,
            })
            
        cursor.execute("SELECT * FROM mother_profile WHERE user_email = %s", (user_id,))
        p = cursor.fetchone()
        
        address_raw = db_user.get("address") or ""
        profile_dict = {
            "name": db_user.get("name") or "",
            "phone_no": db_user.get("phone_no") or "",
            "address": address_raw
        }
        
        if address_raw.startswith("{") and address_raw.endswith("}"):
            try:
                addr_data = json.loads(address_raw)
                profile_dict.update({
                    "address_line1": addr_data.get("address_line1", ""),
                    "locality": addr_data.get("locality", ""),
                    "city": addr_data.get("city", ""),
                    "state": addr_data.get("state", ""),
                    "pincode": addr_data.get("pincode", ""),
                    "address": addr_data.get("combined", address_raw)
                })
            except Exception:
                pass
        
        if p:
            dob_val = p.get("dob")
            dob_str = dob_val.isoformat() if hasattr(dob_val, "isoformat") else str(dob_val)
            preg_start = p.get("pregnancy_start_date")
            preg_start_str = preg_start.isoformat() if hasattr(preg_start, "isoformat") else (str(preg_start) if preg_start else None)
            
            # Calculate dynamic gestational weeks based on pregnancy_start_date
            gest_weeks = calculate_gestational_weeks(preg_start) if preg_start else (p.get("gestational_weeks") or 0)
            
            profile_dict.update({
                "dob": dob_str,
                "gravida": p.get("gravida", 0),
                "para": p.get("para", 0),
                "live_births": p.get("live_births", 0),
                "abortions": p.get("abortions", 0),
                "deaths": p.get("deaths", 0),
                "avatar": p.get("avatar"),
                "gestational_weeks": gest_weeks,
                "pregnancy_start_date": preg_start_str
            })
            
        cursor.close()
        return {
            "email": db_user.get("email"),
            "password_hash": db_user.get("password_hash"),
            "hashed_password": db_user.get("password_hash"),
            "history": history_list,
            "profile": profile_dict
        }
    except Exception as exc:
        logger.warning("Failed to read user from DB: %s", exc)
        return None


def _write_user_to_db(
    user_id: str,
    password_hash: str | None = None,
    history: list | None = None,
    profile: dict | None = None,
) -> bool:
    conn = _db_conn()
    if conn is None:
        return False
        
    try:
        cursor = conn.cursor()
        
        cursor.execute("SELECT email FROM user WHERE email = %s", (user_id,))
        exists = cursor.fetchone()
        
        if not exists:
            cursor.execute(
                "INSERT INTO user (email, password_hash) VALUES (%s, %s)",
                (user_id, password_hash or "")
            )
        else:
            if password_hash is not None:
                cursor.execute(
                    "UPDATE user SET password_hash = %s WHERE email = %s",
                    (password_hash, user_id)
                )
                
        if profile is not None:
            name = profile.get("name")
            phone_no = profile.get("phone_no")
            
            # Save address as JSON if structured fields are present
            if "address_line1" in profile or "locality" in profile:
                address_json = {
                    "address_line1": profile.get("address_line1", ""),
                    "locality": profile.get("locality", ""),
                    "city": profile.get("city", ""),
                    "state": profile.get("state", ""),
                    "pincode": profile.get("pincode", ""),
                    "combined": profile.get("address", "")
                }
                address = json.dumps(address_json)
            else:
                address = profile.get("address")
            
            cursor.execute(
                "UPDATE user SET name = %s, phone_no = %s, address = %s WHERE email = %s",
                (name, phone_no, address, user_id)
            )
            
            cursor.execute("SELECT user_email FROM mother_profile WHERE user_email = %s", (user_id,))
            prof_exists = cursor.fetchone()
            
            dob_str = profile.get("dob")
            gravida = profile.get("gravida", 0)
            para = profile.get("para", 0)
            live_births = profile.get("live_births", 0)
            abortions = profile.get("abortions", 0)
            deaths = profile.get("deaths", 0)
            avatar = profile.get("avatar")
            
            if dob_str:
                try:
                    dob = datetime.strptime(dob_str, "%Y-%m-%d").date()
                except Exception:
                    dob = datetime.now().date()
            else:
                dob = datetime.now().date()
                
            gestational_weeks = profile.get("gestational_weeks", 0)
            pregnancy_start_date = profile.get("pregnancy_start_date")
            if pregnancy_start_date:
                try:
                    preg_start = datetime.strptime(pregnancy_start_date, "%Y-%m-%d").date()
                except Exception:
                    preg_start = None
            else:
                preg_start = None
                
            # Calculate dynamic gestational weeks on save too
            if preg_start:
                gestational_weeks = calculate_gestational_weeks(preg_start)
                
            if not prof_exists:
                cursor.execute(
                    """
                    INSERT INTO mother_profile 
                    (user_email, dob, gravida, para, live_births, abortions, deaths, avatar, gestational_weeks, pregnancy_start_date) 
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (user_id, dob, gravida, para, live_births, abortions, deaths, avatar, gestational_weeks, preg_start)
                )
            else:
                cursor.execute(
                    """
                    UPDATE mother_profile 
                    SET dob = %s, gravida = %s, para = %s, live_births = %s, abortions = %s, deaths = %s, avatar = %s, gestational_weeks = %s, pregnancy_start_date = %s
                    WHERE user_email = %s
                    """,
                    (dob, gravida, para, live_births, abortions, deaths, avatar, gestational_weeks, preg_start, user_id)
                )

        if history is not None:
            cursor.execute("DELETE FROM risk_assessment WHERE user_email = %s", (user_id,))
            for entry in history:
                timestamp_val = datetime.now()
                if entry.get("timestamp"):
                    try:
                        timestamp_val = datetime.fromisoformat(entry["timestamp"].replace("Z", "+00:00"))
                    except Exception:
                        pass
                
                prediction = entry.get("prediction", "No Risk")
                parameters = entry.get("parameters", {})
                
                cursor.execute(
                    """
                    INSERT INTO risk_assessment (user_email, prediction, timestamp, parameters)
                    VALUES (%s, %s, %s, %s)
                    """,
                    (user_id, prediction, timestamp_val, json.dumps(parameters))
                )
                
        conn.commit()
        cursor.close()
        conn.close()
        return True
    except Exception as exc:
        logger.warning("Failed to write user to DB: %s", exc)
        try:
            conn.rollback()
            cursor.close()
            conn.close()
        except Exception:
            pass
        return False


def _sync_user_to_json(user_id: str, user_record: dict | str | None) -> None:
    users = _read_users()
    users[user_id] = _json_safe_value(_normalize_user_record(user_record))
    _write_users(users)


def _append_prediction_to_user_history(user_id: str, prediction_data: dict) -> None:
    conn = _db_conn()
    db_user = None

    if conn is not None:
        try:
            cursor = conn.cursor()
            timestamp_val = datetime.now()
            if prediction_data.get("timestamp"):
                try:
                    timestamp_val = datetime.fromisoformat(prediction_data["timestamp"].replace("Z", "+00:00"))
                except Exception:
                    pass
                    
            prediction = prediction_data.get("prediction", "No Risk")
            parameters = prediction_data.get("parameters", {})
            
            cursor.execute(
                """
                INSERT INTO risk_assessment (user_email, prediction, timestamp, parameters)
                VALUES (%s, %s, %s, %s)
                """,
                (user_id, prediction, timestamp_val, json.dumps(parameters))
            )
            conn.commit()
            cursor.close()
            
            db_user = _read_user_from_db(user_id, conn)
            conn.close()
        except Exception as exc:
            logger.warning("Failed to append prediction to DB: %s", exc)
            try:
                conn.rollback()
                cursor.close()
                conn.close()
            except Exception:
                pass

    if db_user:
        _sync_user_to_json(user_id, db_user)
    else:
        users = _read_users()
        raw_user = users.get(user_id)
        if raw_user:
            user = _normalize_user_record(raw_user)
            user["history"].append(prediction_data)
            users[user_id] = user
            _write_users(users)


def _get_user_profile(user_id: str) -> dict | None:
    db_user = None
    conn = _db_conn()
    if conn is not None:
        try:
            db_user = _read_user_from_db(user_id, conn)
            conn.close()
        except Exception:
            try:
                conn.close()
            except Exception:
                pass

    users = _read_users()
    raw_user = users.get(user_id)


    if db_user:
        normalized_user = _normalize_user_record(db_user)
        json_user = _normalize_user_record(raw_user) if raw_user else {"password_hash": "", "history": []}
        merged_history = _merge_history_entries(normalized_user.get("history", []), json_user.get("history", []))
        profile = normalized_user.get("profile") or json_user.get("profile", {})
        preg_start = profile.get("pregnancy_start_date")
        if preg_start:
            profile["gestational_weeks"] = calculate_gestational_weeks(preg_start)
            
        merged_user = {
            "email": normalized_user.get("email") or user_id,
            "password_hash": normalized_user.get("password_hash") or json_user.get("password_hash", ""),
            "hashed_password": normalized_user.get("hashed_password") or json_user.get("hashed_password", ""),
            "history": merged_history,
            "profile": profile,
        }
        _sync_user_to_json(user_id, merged_user)
        
        # Self-healing database cleanup: if duplicates were found, clean them up in the SQLite DB
        if len(merged_history) < len(normalized_user.get("history", [])):
            try:
                _write_user_to_db(
                    user_id,
                    password_hash=merged_user["password_hash"],
                    history=merged_history,
                    profile=merged_user["profile"]
                )
            except Exception as e:
                logger.warning("Failed self-healing database deduplication: %s", e)

        return merged_user

    if raw_user:
        normalized_user = _normalize_user_record(raw_user)
        users[user_id] = normalized_user
        _write_users(users)
        return normalized_user

    return None


def _normalize_auth_email(payload) -> str:
    return (payload.email or payload.user_id or "").strip().lower()


def signup_user(payload) -> tuple[bool, str, str]:
    email = _normalize_auth_email(payload)
    password = payload.password.strip()

    if not email or not password:
        return False, "Email and password are required", email

    conn = _db_conn()
    db_user = None
    if conn is not None:
        try:
            db_user = _read_user_from_db(email, conn)
        finally:
            conn.close()

    if db_user:
        return False, "User already exists", email

    users = _read_users()
    if email in users:
        return False, "User already exists", email

    password_hash = _hash_password(password)
    user_record = {
        "email": email,
        "password_hash": password_hash,
        "hashed_password": password_hash,
        "history": [],
        "created_at": datetime.now(timezone.utc),
    }

    if _write_user_to_db(email, password_hash, []):
        _sync_user_to_json(email, user_record)
    else:
        users[email] = _json_safe_value(user_record)
        _write_users(users)

    return True, "Signup successful", email


def login_user(payload) -> tuple[bool, str, str, list, str, dict | None]:
    user_id = _normalize_auth_email(payload)
    password = payload.password.strip()

    if not user_id or not password:
        return False, "Email and password are required", user_id, [], "patient", None

    conn = _db_conn()
    db_user = None
    role = "patient"
    asha_profile = None

    if conn is not None:
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT role FROM user WHERE email = %s", (user_id,))
            role_row = cursor.fetchone()
            if role_row:
                role = role_row.get("role", "patient") if isinstance(role_row, dict) else role_row[0]
            
            if role == "asha_worker":
                cursor.execute(
                    "SELECT asha_worker.*, user.name, user.phone_no FROM asha_worker JOIN user ON asha_worker.email = user.email WHERE asha_worker.email = %s",
                    (user_id,)
                )
                asha_row = cursor.fetchone()
                if asha_row:
                    # Convert to standard dictionary
                    asha_profile = dict(asha_row)
                    # Convert dates/times to string for json serialization
                    if "joining_date" in asha_profile and asha_profile["joining_date"]:
                        asha_profile["joining_date"] = str(asha_profile["joining_date"])
            cursor.close()
            db_user = _read_user_from_db(user_id, conn)
        except Exception as exc:
            logger.warning("Error loading role/ASHA details during login: %s", exc)
        finally:
            conn.close()

    if db_user:
        db_user_record = _normalize_user_record(db_user)
        stored_hash = db_user_record.get("password_hash") or db_user_record.get("hashed_password")
        if isinstance(stored_hash, str) and _verify_password(password, stored_hash):
            json_user = _normalize_user_record(_read_users().get(user_id))
            merged_user = {
                "email": user_id,
                "password_hash": db_user_record.get("password_hash") or json_user.get("password_hash", ""),
                "hashed_password": db_user_record.get("hashed_password") or json_user.get("hashed_password", ""),
                "history": _merge_history_entries(db_user_record.get("history", []), json_user.get("history", [])),
                "profile": db_user_record.get("profile") or json_user.get("profile", {}),
                "role": role,
                "asha_profile": asha_profile
            }
            _sync_user_to_json(user_id, merged_user)
            return True, "Login successful", user_id, merged_user["history"], role, asha_profile

        return False, "Invalid password", user_id, [], "patient", None

    users = _read_users()
    raw_user = users.get(user_id)
    if not raw_user:
        return False, "User not found. Please sign up first", user_id, [], "patient", None

    user = _normalize_user_record(raw_user)
    stored_hash = user.get("password_hash") or user.get("hashed_password")
    if not isinstance(stored_hash, str) or not _verify_password(password, stored_hash):
        return False, "Invalid password", user_id, [], "patient", None

    # Load from local JSON fallback if present
    role = raw_user.get("role", "patient")
    asha_profile = raw_user.get("asha_profile", None)

    users[user_id] = user
    _write_users(users)
    _write_user_to_db(user_id, stored_hash, user.get("history", []))

    return True, "Login successful", user_id, _sorted_history(user.get("history", [])), role, asha_profile


def get_history_payload(user_id: str) -> tuple[bool, list]:
    normalized_user_id = user_id.strip().lower()
    user = _get_user_profile(normalized_user_id)
    if not user:
        return False, []

    return True, _sorted_history(user.get("history", []))


def append_prediction(user_id: str, prediction_data: dict) -> None:
    _append_prediction_to_user_history(user_id, prediction_data)
    try:
        sync_to_pregnancy_record(user_id)
    except Exception as e:
        logger.exception("Failed to trigger sync after prediction: %s", e)


def get_user_profile_data(user_id: str) -> tuple[bool, dict]:
    normalized_user_id = user_id.strip().lower()
    user = _get_user_profile(normalized_user_id)
    if not user:
        return False, {}
    return True, user.get("profile", {})


def update_user_profile_data(user_id: str, profile_data: dict) -> tuple[bool, str]:
    normalized_user_id = user_id.strip().lower()
    user = _get_user_profile(normalized_user_id)
    if not user:
        return False, "User not found"

    user["profile"] = profile_data

    # Save to SQL Database if available
    _write_user_to_db(
        normalized_user_id,
        password_hash=user.get("password_hash"),
        history=user.get("history"),
        profile=profile_data
    )

    # Always sync to local JSON
    _sync_user_to_json(normalized_user_id, user)

    try:
        sync_to_pregnancy_record(normalized_user_id)
    except Exception as e:
        logger.exception("Failed to trigger sync after profile update: %s", e)

    return True, "Profile updated successfully"


def sync_to_pregnancy_record(user_id: str) -> None:
    # 1. Fetch user profile
    user = _get_user_profile(user_id)
    if not user:
        return
        
    profile = user.get("profile", {})
    history = user.get("history", [])
    
    latest_prediction = history[0] if history else {}
    params = latest_prediction.get("parameters", {})
    prediction_result = latest_prediction.get("prediction", "No Risk")
    
    # 2. Map fields
    name = profile.get("name") or user.get("name") or user_id
    phone_no = profile.get("phone_no") or user.get("phone_no") or ""
    address = profile.get("address") or user.get("address") or "Nandgaon" # Fallback village
    
    # Extract locality / village
    locality = profile.get("locality") or "Nandgaon"
    if not profile.get("locality") and (profile.get("address") or user.get("address")):
        raw_addr = profile.get("address") or user.get("address") or ""
        if raw_addr.startswith("{") and raw_addr.endswith("}"):
            try:
                addr_data = json.loads(raw_addr)
                locality = addr_data.get("locality") or "Nandgaon"
            except Exception:
                locality = raw_addr
        else:
            locality = raw_addr
            
    locality = locality.split(",")[0].strip() or "Nandgaon"
    
    # Extract variables
    age = params.get("Age") or 25
    g = params.get("G") or profile.get("gravida") or 0
    p = params.get("P") or profile.get("para") or 0
    l = params.get("L") or profile.get("live_births") or 0
    a = params.get("A") or profile.get("abortions") or 0
    d = params.get("D") or profile.get("deaths") or 0
    
    systolic = params.get("SystolicBP") or 120.0
    diastolic = params.get("DiastolicBP") or 80.0
    rbs = params.get("RBS") or 90.0
    temp = params.get("BodyTemp") or 98.6
    hr = params.get("HeartRate") or 72.0
    hb = params.get("HB") or 12.0
    hba1c = params.get("HBA1C") or 5.5
    rr = params.get("RR") or 16.0
    
    # Calculate some helper fields
    bmi = 22.0
    spo2 = 98.0
    edema = "None"
    symptoms_score = 0.0
    
    # Determine risk reasons based on vital triggers
    reasons = []
    if systolic >= 140 or diastolic >= 90:
        reasons.append("Hypertension")
    if rbs > 140 or hba1c > 6.0:
        reasons.append("Diabetes")
    if hb < 11.0:
        reasons.append("Anaemia")
    if age >= 35 or age <= 18:
        reasons.append("Age Risk")
    if g >= 4:
        reasons.append("Grand Multiparity")
    if a > 0:
        reasons.append("Previous Pregnancy Complications")
        
    risk_reasons = ", ".join(reasons) if reasons else "None"
    
    # Calculate gestational age & trimester
    preg_start = profile.get("pregnancy_start_date")
    if preg_start:
        gestational_age = float(calculate_gestational_weeks(preg_start))
    else:
        gestational_age = float(profile.get("gestational_weeks") or params.get("gestational_age_weeks") or 20.0)
    trimester = 1 if gestational_age <= 13 else (2 if gestational_age <= 26 else 3)
    
    # 3. Connect to DB and insert/update pregnancy_record
    conn = _db_conn()
    if conn is None:
        return
        
    try:
        cursor = conn.cursor()
        p_placeholder = "?" if conn.is_sqlite else "%s"
        
        # Check if record already exists
        cursor.execute(f"SELECT patient_id FROM pregnancy_record WHERE patient_id = {p_placeholder}", (user_id,))
        exists = cursor.fetchone()
        
        # Appoint the user to an ASHA worker according to their locality
        asha_email = "asha1@example.com"
        try:
            cursor.execute("SELECT email, assigned_villages FROM asha_worker")
            ashas = cursor.fetchall()
            
            matched = False
            patient_locality = locality.strip().lower()
            
            for asha in ashas:
                assigned_vils = asha.get("assigned_villages") or ""
                if isinstance(assigned_vils, str):
                    vils_list = [v.strip().lower() for v in assigned_vils.replace(",", " ").split() if v.strip()]
                    if patient_locality in vils_list or any(pat_v in vils_list for pat_v in patient_locality.split()):
                        asha_email = asha.get("email")
                        matched = True
                        break
            
            if not matched and ashas:
                asha_email = ashas[0].get("email")
        except Exception as e:
            logger.warning("Failed to assign ASHA worker dynamically: %s", e)
        
        # Due date and next visit date
        preg_start = profile.get("pregnancy_start_date")
        if preg_start:
            if isinstance(preg_start, str):
                try:
                    preg_start_dt = datetime.strptime(preg_start, "%Y-%m-%d").date()
                except Exception:
                    preg_start_dt = datetime.now().date()
            else:
                preg_start_dt = preg_start
            due_date = (preg_start_dt + timedelta(days=280)).strftime("%Y-%m-%d")
        else:
            due_date = (datetime.now() + timedelta(days=140)).strftime("%Y-%m-%d")
            
        next_visit = (datetime.now() + timedelta(days=14)).strftime("%Y-%m-%d")
        
        if exists:
            # Update existing record
            cursor.execute(
                f"""
                UPDATE pregnancy_record SET 
                    name = {p_placeholder}, phone_no = {p_placeholder}, village = {p_placeholder}, 
                    age_years = {p_placeholder}, gravida_G = {p_placeholder}, para_P = {p_placeholder}, 
                    live_child_L = {p_placeholder}, abortion_A = {p_placeholder}, death_D = {p_placeholder}, 
                    gestational_age_weeks = {p_placeholder}, trimester = {p_placeholder}, 
                    systolic_bp_mmHg = {p_placeholder}, diastolic_bp_mmHg = {p_placeholder}, 
                    random_blood_sugar_mg_dL = {p_placeholder}, body_temperature_F = {p_placeholder}, 
                    heart_rate_bpm = {p_placeholder}, hemoglobin_g_dL = {p_placeholder}, 
                    hba1c_percent = {p_placeholder}, respiratory_rate_bpm = {p_placeholder}, 
                    bmi = {p_placeholder}, spo2_percent = {p_placeholder}, edema_severity = {p_placeholder}, 
                    symptoms_score_0_10 = {p_placeholder}, risk_class = {p_placeholder}, 
                    risk_reasons = {p_placeholder}
                WHERE patient_id = {p_placeholder}
                """,
                (
                    name, phone_no, locality, age, g, p, l, a, d, 
                    gestational_age, trimester, systolic, diastolic, 
                    rbs, temp, hr, hb, hba1c, rr, bmi, spo2, edema, 
                    symptoms_score, prediction_result, risk_reasons, user_id
                )
            )
        else:
            # Insert new record
            cursor.execute(
                f"""
                INSERT INTO pregnancy_record (
                    patient_id, name, phone_no, village, age_years, gravida_G, para_P, 
                    live_child_L, abortion_A, death_D, gestational_age_weeks, trimester, 
                    systolic_bp_mmHg, diastolic_bp_mmHg, random_blood_sugar_mg_dL, 
                    body_temperature_F, heart_rate_bpm, hemoglobin_g_dL, hba1c_percent, 
                    respiratory_rate_bpm, bmi, spo2_percent, edema_severity, 
                    symptoms_score_0_10, risk_class, risk_reasons, assigned_asha_email, 
                    anc_visits, visit_status, next_visit_date, referral_status, due_date
                ) VALUES (
                    {p_placeholder}, {p_placeholder}, {p_placeholder}, {p_placeholder}, {p_placeholder}, 
                    {p_placeholder}, {p_placeholder}, {p_placeholder}, {p_placeholder}, {p_placeholder}, 
                    {p_placeholder}, {p_placeholder}, {p_placeholder}, {p_placeholder}, {p_placeholder}, 
                    {p_placeholder}, {p_placeholder}, {p_placeholder}, {p_placeholder}, {p_placeholder}, 
                    {p_placeholder}, {p_placeholder}, {p_placeholder}, {p_placeholder}, {p_placeholder}, 
                    {p_placeholder}, {p_placeholder}, 0, 'Pending', {p_placeholder}, 'Not Referred', {p_placeholder}
                )
                """,
                (
                    user_id, name, phone_no, locality, age, g, p, l, a, d, 
                    gestational_age, trimester, systolic, diastolic, 
                    rbs, temp, hr, hb, hba1c, rr, bmi, spo2, edema, 
                    symptoms_score, prediction_result, risk_reasons, asha_email, 
                    next_visit, due_date
                )
            )
            
        conn.commit()
        cursor.close()
        conn.close()
    except Exception as exc:
        logger.exception("Failed to sync patient to pregnancy_record: %s", exc)
        try:
            conn.rollback()
            cursor.close()
            conn.close()
        except Exception:
            pass

