import sys
from datetime import datetime, timezone

from fastapi import APIRouter, Request

from models import AuthPayload, AshaSignupPayload, AdminSignupPayload
from utils import (
    append_prediction,
    get_history_payload,
    login_user,
    signup_user,
    get_user_profile_data,
    update_user_profile_data,
)
import asha_utils


router = APIRouter()


@router.get("/")
def home():
    return {"massage": "backend running"}


@router.post("/signup")
def signup(payload: AuthPayload):
    try:
        success, message, email = signup_user(payload)
        if not success:
            return {"success": False, "message": message}

        return {"success": True, "message": message, "email": email}
    except Exception:
        print("Signup error", file=sys.stderr)
        return {"success": False, "message": "Signup failed"}


@router.post("/signup/asha")
def signup_asha(payload: AshaSignupPayload):
    try:
        # Check if user already exists
        conn = asha_utils.get_db_connection()
        cursor = conn.cursor()
        p_placeholder = "?" if conn.is_sqlite else "%s"
        
        cursor.execute(f"SELECT email FROM user WHERE email = {p_placeholder}", (payload.email.strip().lower(),))
        exists = cursor.fetchone()
        if exists:
            cursor.close()
            conn.close()
            return {"success": False, "message": "User already exists with this email."}
            
        cursor.execute(f"SELECT email FROM asha_worker WHERE worker_id = {p_placeholder}", (payload.worker_id.strip(),))
        w_exists = cursor.fetchone()
        if w_exists:
            cursor.close()
            conn.close()
            return {"success": False, "message": "ASHA Worker ID already registered."}
            
        from utils import _hash_password, _write_users, _read_users, _json_safe_value
        p_hash = _hash_password(payload.password.strip())
        
        cursor.execute(
            f"""
            INSERT INTO user (email, password_hash, name, phone_no, address, role)
            VALUES ({p_placeholder}, {p_placeholder}, {p_placeholder}, {p_placeholder}, {p_placeholder}, 'asha_worker')
            """,
            (payload.email.strip().lower(), p_hash, payload.name, payload.phone_no, payload.address)
        )
        
        cursor.execute(
            f"""
            INSERT INTO asha_worker (email, worker_id, assigned_villages, qualification, joining_date, employee_status, supervisor, government_id)
            VALUES ({p_placeholder}, {p_placeholder}, {p_placeholder}, {p_placeholder}, {p_placeholder}, 'Active', {p_placeholder}, {p_placeholder})
            """,
            (
                payload.email.strip().lower(), 
                payload.worker_id.strip(), 
                payload.assigned_villages.strip(), 
                payload.qualification.strip(), 
                datetime.now().strftime("%Y-%m-%d"), 
                payload.supervisor.strip(), 
                payload.government_id.strip()
            )
        )
        
        conn.commit()
        cursor.close()
        conn.close()
        
        # Sync to local JSON fallback
        try:
            users = _read_users()
            users[payload.email.strip().lower()] = _json_safe_value({
                "email": payload.email.strip().lower(),
                "password_hash": p_hash,
                "hashed_password": p_hash,
                "role": "asha_worker",
                "name": payload.name,
                "phone_no": payload.phone_no,
                "address": payload.address,
                "asha_profile": {
                    "email": payload.email.strip().lower(),
                    "worker_id": payload.worker_id.strip(),
                    "assigned_villages": payload.assigned_villages.strip(),
                    "qualification": payload.qualification.strip(),
                    "joining_date": datetime.now().strftime("%Y-%m-%d"),
                    "employee_status": "Active",
                    "supervisor": payload.supervisor.strip(),
                    "government_id": payload.government_id.strip()
                },
                "history": []
            })
            _write_users(users)
        except Exception as e:
            print("Failed to sync asha worker to JSON:", e, file=sys.stderr)
            
        return {"success": True, "message": "ASHA Worker registered successfully!"}
    except Exception as exc:
        print("ASHA worker signup error", exc, file=sys.stderr)
        return {"success": False, "message": f"Signup failed: {exc}"}



@router.post("/signup/admin")
def signup_admin(payload: AdminSignupPayload):
    try:
        conn = asha_utils.get_db_connection()
        cursor = conn.cursor()
        p_placeholder = "?" if conn.is_sqlite else "%s"

        cursor.execute(f"SELECT email FROM user WHERE email = {p_placeholder}", (payload.email.strip().lower(),))
        if cursor.fetchone():
            cursor.close(); conn.close()
            return {"success": False, "message": "An account already exists with this email."}

        cursor.execute(f"SELECT email FROM admin WHERE admin_id = {p_placeholder}", (payload.admin_id.strip(),))
        if cursor.fetchone():
            cursor.close(); conn.close()
            return {"success": False, "message": "Admin ID is already registered."}

        from utils import _hash_password
        p_hash = _hash_password(payload.password.strip())

        cursor.execute(
            f"""
            INSERT INTO user (email, password_hash, name, phone_no, role)
            VALUES ({p_placeholder}, {p_placeholder}, {p_placeholder}, {p_placeholder}, 'admin')
            """,
            (payload.email.strip().lower(), p_hash, payload.name.strip(), payload.phone_no.strip())
        )
        cursor.execute(
            f"""
            INSERT INTO admin (email, admin_id, name, phone_no, department, designation, government_id, joining_date)
            VALUES ({p_placeholder}, {p_placeholder}, {p_placeholder}, {p_placeholder}, {p_placeholder}, {p_placeholder}, {p_placeholder}, {p_placeholder})
            """,
            (
                payload.email.strip().lower(),
                payload.admin_id.strip(),
                payload.name.strip(),
                payload.phone_no.strip(),
                payload.department.strip(),
                payload.designation.strip(),
                payload.government_id.strip(),
                datetime.now().strftime("%Y-%m-%d"),
            )
        )
        conn.commit()
        cursor.close()
        conn.close()
        return {"success": True, "message": "Admin account registered successfully!"}
    except Exception as exc:
        print("Admin signup error", exc, file=sys.stderr)
        return {"success": False, "message": f"Signup failed: {exc}"}


@router.post("/login")
def login(payload: AuthPayload):
    try:
        success, message, user_id, history, role, asha_profile = login_user(payload)
        if not success:
            return {"success": False, "message": message}

        profile_name = ""
        try:
            success_prof, prof = get_user_profile_data(user_id)
            if success_prof:
                profile_name = prof.get("name") or ""
        except Exception:
            pass

        return {
            "success": True, 
            "message": message, 
            "user_id": user_id, 
            "history": history,
            "role": role,
            "asha_profile": asha_profile,
            "name": profile_name
        }
    except Exception as exc:
        print("Login error", exc, file=sys.stderr)
        return {"success": False, "message": "Login failed"}


@router.get("/history/{user_id}")
def user_history(user_id: str):
    try:
        success, history = get_history_payload(user_id)
        if not success:
            return {"success": False, "message": "User not found", "history": []}

        return {"success": True, "history": history}
    except Exception:
        print("History error", file=sys.stderr)
        return {"success": False, "message": "Failed to load history", "history": []}


@router.post("/predict")
def predict(data: dict, request: Request):
    try:
        import os
        import sys
        import warnings
        
        current_dir = os.path.dirname(os.path.abspath(__file__))
        xai_dir = os.path.join(current_dir, "HighRiskPregnancy_XAI_V2")

        # Ensure XAI directory is first on the path
        if xai_dir in sys.path:
            sys.path.remove(xai_dir)
        sys.path.insert(0, xai_dir)

        # Clear ALL cached XAI/pipeline modules so re-import always works
        # (important if the server started before dependencies were installed)
        xai_modules = [
            key for key in list(sys.modules.keys())
            if key in (
                "config", "pipeline", "pandas",
                "xai", "xai.predictor", "xai.shap_engine",
                "xai.risk_mapper", "xai.output_builder",
                "llm", "llm.llm_engine",
                "rag", "rag.rag_pipeline", "rag.vector_store",
                "preloaded_knowledge",
            )
        ]
        for mod in xai_modules:
            del sys.modules[mod]

        # Suppress sklearn version mismatch warnings (model trained on 1.6.1, running on 1.9.0)
        warnings.filterwarnings(
            "ignore",
            message=".*InconsistentVersionWarning.*",
            category=UserWarning,
        )
        from sklearn.exceptions import InconsistentVersionWarning
        warnings.filterwarnings("ignore", category=InconsistentVersionWarning)

        from pipeline import run_complete_pipeline, pipeline_result_to_json

        required_features = [
            "Age", "G", "P", "L", "A", "D", "SystolicBP", "DiastolicBP",
            "RBS", "BodyTemp", "HeartRate", "HB", "HBA1C", "RR"
        ]

        missing = [name for name in required_features if name not in data]
        if missing:
            return {"error": f"Missing required fields: {', '.join(missing)}"}

        patient_data = {name: float(data[name]) for name in required_features}
        
        # Execute the pipeline
        raw_result = run_complete_pipeline(patient_data, xai_dir)
        result = pipeline_result_to_json(raw_result)

        prediction_label = result.get("prediction", "Low Risk")
        db_prediction_label = "No Risk" if prediction_label == "Low Risk" else prediction_label

        user_id_raw = data.get("user_id")
        user_id = str(user_id_raw).strip().lower() if user_id_raw is not None else ""

        if user_id:
            # Package XAI details inside parameters so database structure is preserved
            xai_details = {
                "confidence": result.get("confidence"),
                "high_risk_probability": result.get("high_risk_probability"),
                "low_risk_probability": result.get("low_risk_probability"),
                "risk_table": result.get("risk_table"),
                "top_risks": result.get("top_risks"),
                "xai_output": result.get("xai_output"),
                "reports": result.get("reports"),
                "execution_time": result.get("execution_time"),
                "disclaimer": result.get("disclaimer"),
            }
            
            prediction_data = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "prediction": db_prediction_label,
                "parameters": {
                    **patient_data,
                    "_xai_details": xai_details
                },
            }
            append_prediction(user_id, prediction_data)

        # Return full prediction output to frontend
        return result
    except Exception as exc:
        print(f"Prediction error: {exc}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return {"error": f"Prediction failed: {exc}"}


@router.get("/profile/{user_id}")
def get_profile(user_id: str):
    try:
        success, profile = get_user_profile_data(user_id)
        if not success:
            return {"success": False, "message": "User not found"}
        return {"success": True, "profile": profile}
    except Exception:
        print("Get profile error", file=sys.stderr)
        return {"success": False, "message": "Failed to load profile"}


@router.post("/profile/{user_id}")
def update_profile(user_id: str, payload: dict):
    try:
        success, message = update_user_profile_data(user_id, payload)
        if not success:
            return {"success": False, "message": message}
        return {"success": True, "message": message}
    except Exception:
        print("Update profile error", file=sys.stderr)
        return {"success": False, "message": "Failed to update profile"}


# ASHA DASHBOARD ENDPOINTS

@router.get("/asha/dashboard-stats")
def get_dashboard_stats(request: Request):
    try:
        params = dict(request.query_params)
        stats = asha_utils.get_asha_dashboard_stats(params)
        return {"success": True, "data": stats}
    except Exception as exc:
        print("Error getting dashboard stats", exc, file=sys.stderr)
        return {"success": False, "message": str(exc)}


@router.get("/asha/patients")
def get_patients(request: Request):
    try:
        params = dict(request.query_params)
        page = int(params.get("page", 1))
        page_size = int(params.get("page_size", 20))
        sort_by = params.get("sort_by", "patient_id")
        sort_dir = params.get("sort_dir", "ASC")
        
        result = asha_utils.get_asha_patients(params, page, page_size, sort_by, sort_dir)
        return {"success": True, "data": result}
    except Exception as exc:
        print("Error getting patients registry", exc, file=sys.stderr)
        return {"success": False, "message": str(exc)}


@router.get("/asha/patients/{patient_id}")
def get_patient_detail(patient_id: str):
    try:
        detail = asha_utils.get_asha_patient_detail(patient_id)
        if not detail:
            return {"success": False, "message": "Patient not found"}
        return {"success": True, "data": detail}
    except Exception as exc:
        print("Error getting patient details", exc, file=sys.stderr)
        return {"success": False, "message": str(exc)}


@router.put("/asha/patients/{patient_id}")
def update_patient_detail(patient_id: str, request: Request, data: dict):
    try:
        updater_email = request.headers.get("X-Asha-Email", "").strip().lower()
        if not updater_email:
            return {"success": False, "message": "Missing authentication header X-Asha-Email"}
            
        model = getattr(request.app.state, "model", None)
        success, message = asha_utils.update_asha_patient(patient_id, updater_email, data, model)
        return {"success": success, "message": message}
    except Exception as exc:
        print("Error updating patient detail", exc, file=sys.stderr)
        return {"success": False, "message": str(exc)}


@router.post("/asha/patients/{patient_id}/visit")
def add_patient_visit_route(patient_id: str, request: Request, data: dict):
    try:
        updater_email = request.headers.get("X-Asha-Email", "").strip().lower()
        if not updater_email:
            return {"success": False, "message": "Missing authentication header X-Asha-Email"}
            
        success, message = asha_utils.add_patient_visit(patient_id, updater_email, data)
        return {"success": success, "message": message}
    except Exception as exc:
        print("Error adding patient visit log", exc, file=sys.stderr)
        return {"success": False, "message": str(exc)}


@router.post("/asha/patients/{patient_id}/referral")
def add_patient_referral_route(patient_id: str, request: Request, data: dict):
    try:
        updater_email = request.headers.get("X-Asha-Email", "").strip().lower()
        if not updater_email:
            return {"success": False, "message": "Missing authentication header X-Asha-Email"}
            
        success, message = asha_utils.add_patient_referral(patient_id, updater_email, data)
        return {"success": success, "message": message}
    except Exception as exc:
        print("Error adding patient referral log", exc, file=sys.stderr)
        return {"success": False, "message": str(exc)}


@router.get("/asha/preprocessing-summary")
def get_preprocessing_summary_route():
    try:
        summary = asha_utils.get_preprocessing_summary()
        return {"success": True, "data": summary}
    except Exception as exc:
        print("Error getting preprocessing summary", exc, file=sys.stderr)
        return {"success": False, "message": str(exc)}


# ──────────────────────────────────────────────
# NEW ENDPOINTS FOR PATIENT DASHBOARD
# ──────────────────────────────────────────────

@router.get("/stats/user-count")
def get_user_count():
    """Return total number of registered patient accounts from the database."""
    try:
        conn = asha_utils.get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) as cnt FROM user WHERE role = 'patient'")
        row = cursor.fetchone()
        cursor.close()
        conn.close()
        count = row["cnt"] if isinstance(row, dict) else row[0]
        return {"success": True, "count": int(count)}
    except Exception as exc:
        print("Error getting user count", exc, file=sys.stderr)
        # Graceful fallback
        return {"success": True, "count": 0}


@router.get("/health-score/{user_id}")
def get_health_score(user_id: str):
    """
    Compute a 0-100 health score from the user's latest risk assessment.
    Each clinical parameter is compared against its normal range and contributes
    a weighted penalty if outside the normal range.
    """
    try:
        from utils import get_history_payload
        success, history = get_history_payload(user_id)
        if not success or not history:
            return {"success": False, "message": "No assessment data found"}

        # Latest entry (history is newest-first)
        latest = history[0]
        params = latest.get("parameters", {})
        prediction = latest.get("prediction", "No Risk")

        # Clinical normal ranges and weights
        ranges = {
            "SystolicBP":  (90, 139, 15),
            "DiastolicBP": (60, 89,  12),
            "RBS":         (70, 140, 12),
            "BodyTemp":    (97.0, 99.5, 8),
            "HeartRate":   (60, 100,  8),
            "HB":          (11.0, 16.0, 15),
            "HBA1C":       (3.0, 5.9, 12),
            "RR":          (12, 20,  8),
            "Age":         (18, 35,  5),
            "G":           (0, 3,    5),
        }

        total_weight = sum(w for _, _, w in ranges.values())
        penalty = 0.0

        for field, (lo, hi, weight) in ranges.items():
            val = params.get(field)
            if val is None:
                continue
            val = float(val)
            if val < lo:
                deviation = (lo - val) / max(lo, 1)
                penalty += weight * min(deviation, 1.0)
            elif val > hi:
                deviation = (val - hi) / max(hi, 1)
                penalty += weight * min(deviation, 1.0)

        score = max(0, round(100 - (penalty / total_weight) * 100))

        if score >= 80:
            status = "Excellent"
            color = "green"
            recommendation = "Your vitals are looking great. Keep up your healthy routine!"
        elif score >= 60:
            status = "Good"
            color = "yellow"
            recommendation = "Most parameters are healthy. Monitor the flagged ones closely."
        elif score >= 40:
            status = "Moderate"
            color = "orange"
            recommendation = "Some parameters need attention. Consult your healthcare provider."
        else:
            status = "High Risk"
            color = "red"
            recommendation = "Critical parameters detected. Please seek immediate medical attention."

        return {
            "success": True,
            "score": score,
            "status": status,
            "color": color,
            "recommendation": recommendation,
            "prediction": prediction,
            "timestamp": latest.get("timestamp"),
        }
    except Exception as exc:
        print("Error computing health score", exc, file=sys.stderr)
        return {"success": False, "message": str(exc)}


@router.get("/patient-info/{user_id}")
def get_patient_info(user_id: str):
    """
    Return pregnancy record info (gestational age, due date) and assigned
    ASHA worker details for the logged-in patient.
    """
    try:
        from utils import calculate_gestational_weeks
        from datetime import date, timedelta
        normalized_id = user_id.strip().lower()
        conn = asha_utils.get_db_connection()
        cursor = conn.cursor()

        # Get pregnancy_start_date from mother_profile to calculate gestational age and due date dynamically
        cursor.execute(
            "SELECT pregnancy_start_date, gestational_weeks FROM mother_profile WHERE user_email = %s",
            (normalized_id,)
        )
        m_profile = cursor.fetchone()

        dynamic_ga = None
        dynamic_due = None
        if m_profile:
            # Handle dict cursor or tuple cursor
            preg_start = m_profile.get("pregnancy_start_date") if isinstance(m_profile, dict) else m_profile[0]
            if preg_start:
                dynamic_ga = calculate_gestational_weeks(preg_start)
                
                # Calculate due date: preg_start + 280 days
                if isinstance(preg_start, str):
                    try:
                        preg_start_dt = datetime.strptime(preg_start, "%Y-%m-%d").date()
                    except Exception:
                        preg_start_dt = datetime.now().date()
                else:
                    preg_start_dt = preg_start
                dynamic_due = (preg_start_dt + timedelta(days=280)).strftime("%Y-%m-%d")
            else:
                dynamic_ga = m_profile.get("gestational_weeks") if isinstance(m_profile, dict) else m_profile[1]
                if dynamic_ga is None:
                    dynamic_ga = 0

        # Look up pregnancy_record by patient_id (which equals user email)
        cursor.execute(
            "SELECT * FROM pregnancy_record WHERE patient_id = %s",
            (normalized_id,)
        )
        record = cursor.fetchone()

        if not record:
            cursor.close()
            conn.close()
            if m_profile:
                return {
                    "success": True,
                    "gestational_age_weeks": dynamic_ga,
                    "due_date": dynamic_due,
                    "asha_worker": None
                }
            return {"success": False, "message": "No pregnancy record found"}

        gestational_age = dynamic_ga if dynamic_ga is not None else record.get("gestational_age_weeks")
        due_date = dynamic_due if dynamic_due is not None else (str(record.get("due_date")) if record.get("due_date") else None)
        assigned_asha_email = record.get("assigned_asha_email")

        asha_info = None
        if assigned_asha_email:
            cursor.execute(
                "SELECT u.name, u.phone_no, u.email, aw.assigned_villages, aw.worker_id "
                "FROM user u JOIN asha_worker aw ON u.email = aw.email "
                "WHERE u.email = %s",
                (assigned_asha_email,)
            )
            asha_row = cursor.fetchone()
            if asha_row:
                asha_info = {
                    "name": asha_row.get("name", "ASHA Worker"),
                    "phone": asha_row.get("phone_no", ""),
                    "email": asha_row.get("email", ""),
                    "village": asha_row.get("assigned_villages", ""),
                    "worker_id": asha_row.get("worker_id", ""),
                }

        cursor.close()
        conn.close()

        return {
            "success": True,
            "gestational_age_weeks": gestational_age,
            "due_date": due_date,
            "asha_worker": asha_info,
        }
    except Exception as exc:
        print("Error getting patient info", exc, file=sys.stderr)
        return {"success": False, "message": str(exc)}


@router.get("/admin/stats")
def get_admin_stats():
    """
    Return aggregate statistics for the Admin Dashboard:
    - Total pregnant women registered
    - Total ASHA workers registered
    - Assigned vs unassigned women
    - Village-wise: total women, high-risk, normal, ASHA workers, assigned women
    """
    try:
        conn = asha_utils.get_db_connection()
        cursor = conn.cursor()

        # --- Overall KPIs ---
        cursor.execute("SELECT COUNT(*) AS cnt FROM pregnancy_record")
        total_women = (cursor.fetchone() or {}).get("cnt", 0)

        cursor.execute("SELECT COUNT(*) AS cnt FROM asha_worker")
        total_asha = (cursor.fetchone() or {}).get("cnt", 0)

        cursor.execute("SELECT COUNT(*) AS cnt FROM pregnancy_record WHERE assigned_asha_email IS NOT NULL AND assigned_asha_email != ''")
        assigned_women = (cursor.fetchone() or {}).get("cnt", 0)

        cursor.execute("SELECT COUNT(*) AS cnt FROM pregnancy_record WHERE risk_class = 'High Risk'")
        total_high_risk = (cursor.fetchone() or {}).get("cnt", 0)

        cursor.execute("SELECT COUNT(*) AS cnt FROM pregnancy_record WHERE risk_class != 'High Risk' OR risk_class IS NULL")
        total_normal = (cursor.fetchone() or {}).get("cnt", 0)

        # --- Village-wise breakdown ---
        cursor.execute("""
            SELECT 
                village,
                COUNT(*) AS total_women,
                SUM(CASE WHEN risk_class = 'High Risk' THEN 1 ELSE 0 END) AS high_risk,
                SUM(CASE WHEN risk_class != 'High Risk' OR risk_class IS NULL THEN 1 ELSE 0 END) AS normal,
                SUM(CASE WHEN assigned_asha_email IS NOT NULL AND assigned_asha_email != '' THEN 1 ELSE 0 END) AS assigned,
                SUM(CASE WHEN assigned_asha_email IS NULL OR assigned_asha_email = '' THEN 1 ELSE 0 END) AS unassigned
            FROM pregnancy_record
            GROUP BY village
            ORDER BY village
        """)
        village_rows = cursor.fetchall() or []

        # Village-wise ASHA worker counts (from asha_worker.assigned_villages field)
        cursor.execute("SELECT assigned_villages FROM asha_worker WHERE assigned_villages IS NOT NULL")
        asha_village_rows = cursor.fetchall() or []
        village_asha_counts: dict = {}
        for row in asha_village_rows:
            villages_str = row.get("assigned_villages", "") or ""
            for v in villages_str.split(","):
                v = v.strip()
                if v:
                    village_asha_counts[v] = village_asha_counts.get(v, 0) + 1

        village_data = []
        for row in village_rows:
            v = row.get("village", "")
            village_data.append({
                "village": v,
                "total_women": row.get("total_women", 0),
                "high_risk": row.get("high_risk", 0),
                "normal": row.get("normal", 0),
                "assigned": row.get("assigned", 0),
                "unassigned": row.get("unassigned", 0),
                "asha_workers": village_asha_counts.get(v, 0),
            })

        cursor.close()
        conn.close()

        return {
            "success": True,
            "kpis": {
                "total_women": total_women,
                "total_asha_workers": total_asha,
                "assigned_women": assigned_women,
                "unassigned_women": total_women - assigned_women,
                "high_risk": total_high_risk,
                "normal": total_normal,
            },
            "village_data": village_data,
        }
    except Exception as exc:
        print("Admin stats error", exc, file=sys.stderr)
        return {"success": False, "message": str(exc)}