import json
import logging
import os
import pandas as pd
from datetime import datetime, date, timedelta
from db import get_db_connection

logger = logging.getLogger("matricare")


def _apply_dynamic_gestational_weeks(p_dict):
    preg_start = p_dict.get("pregnancy_start_date")
    if preg_start:
        if isinstance(preg_start, str):
            try:
                preg_start = datetime.strptime(preg_start, "%Y-%m-%d").date()
            except Exception:
                pass
        if isinstance(preg_start, (date, datetime)):
            # Calculate gestational weeks
            today = datetime.now().date()
            days = (today - preg_start).days
            weeks = max(0, min(40, int(days / 7)))
            p_dict["gestational_age_weeks"] = float(weeks)
            p_dict["trimester"] = 1 if weeks <= 13 else (2 if weeks <= 26 else 3)
            p_dict["due_date"] = (preg_start + timedelta(days=280)).strftime("%Y-%m-%d")
    return p_dict


def execute_query(sql, params=(), fetch_all=True):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # Check SQLite or MySQL (placeholder mapping is handled in DBCursor)
        cursor.execute(sql, params)
        if fetch_all:
            result = cursor.fetchall()
        else:
            result = cursor.fetchone()
        conn.commit()
        cursor.close()
        conn.close()
        return result
    except Exception as exc:
        logger.error(f"Database query error: {exc}\nSQL: {sql}\nParams: {params}")
        try:
            conn.rollback()
            cursor.close()
            conn.close()
        except Exception:
            pass
        raise exc

def get_asha_details(email: str) -> dict | None:
    sql = "SELECT aw.*, u.name, u.phone_no FROM asha_worker aw JOIN user u ON aw.email = u.email WHERE aw.email = %s"
    row = execute_query(sql, (email,), fetch_all=False)
    if not row:
        return None
    return {
        "email": row["email"],
        "name": row["name"],
        "worker_id": row["worker_id"],
        "assigned_villages": row["assigned_villages"],
        "qualification": row["qualification"],
        "joining_date": str(row["joining_date"]),
        "employee_status": row["employee_status"],
        "supervisor": row["supervisor"],
        "government_id": row["government_id"]
    }

def build_where_clause(filters: dict):
    clauses = []
    params = []
    
    # Village filter
    village = filters.get("village")
    if village and village != "All Villages":
        clauses.append("village = %s")
        params.append(village)
        
    # Trimester filter
    trimester = filters.get("trimester")
    if trimester:
        try:
            clauses.append("trimester = %s")
            params.append(int(trimester))
        except ValueError:
            pass
            
    # Risk Category filter
    risk_cat = filters.get("risk_category")
    if risk_cat:
        clauses.append("risk_class = %s")
        params.append(risk_cat)
        
    # Referral Status filter
    ref_status = filters.get("referral_status")
    if ref_status:
        clauses.append("referral_status = %s")
        params.append(ref_status)
        
    # Visit Status filter
    visit_status = filters.get("visit_status")
    if visit_status:
        clauses.append("visit_status = %s")
        params.append(visit_status)
        
    # Date Range filter (due_date or next_visit_date)
    start_date = filters.get("start_date")
    end_date = filters.get("end_date")
    if start_date and end_date:
        clauses.append("next_visit_date BETWEEN %s AND %s")
        params.append(start_date)
        params.append(end_date)
        
    # Search filter (name, phone, village, assigned worker)
    search = filters.get("search")
    if search:
        clauses.append("(name LIKE %s OR phone_no LIKE %s OR village LIKE %s OR assigned_asha_email LIKE %s)")
        search_param = f"%{search}%"
        params.extend([search_param, search_param, search_param, search_param])
        
    where_str = " AND ".join(clauses) if clauses else "1=1"
    return where_str, params

def calculate_emergency_score(p) -> float:
    # Medical alert ranking system
    score = 0
    if p["risk_class"] != "High Risk":
        return 0.0
        
    try:
        systolic = float(p.get("systolic_bp_mmHg", 120))
        diastolic = float(p.get("diastolic_bp_mmHg", 80))
        spo2 = float(p.get("spo2_percent", 98))
        hb = float(p.get("hemoglobin_g_dL", 12))
        sugar = float(p.get("random_blood_sugar_mg_dL", 100))
        temp = float(p.get("body_temperature_F", 98.6))
        symptoms = float(p.get("symptoms_score_0_10", 0))
        ga = float(p.get("gestational_age_weeks", 20))
        
        # Spo2 triggers
        if spo2 < 92:
            score += 4
        elif spo2 < 95:
            score += 2
            
        # BP triggers
        if systolic >= 160 or diastolic >= 100:
            score += 4
        elif systolic >= 140 or diastolic >= 90:
            score += 2
            
        # HB triggers
        if hb < 8.0:
            score += 3
        elif hb < 11.0:
            score += 1
            
        # Temp triggers
        if temp > 101.0 or temp < 96.0:
            score += 2
            
        # Sugar triggers
        if sugar > 180:
            score += 3
        elif sugar > 140:
            score += 1
            
        # Symptoms score
        if symptoms >= 7.0:
            score += 2
        elif symptoms >= 4.0:
            score += 1
            
        # Gestational age
        if ga >= 38.0:
            score += 2
        elif ga >= 36.0:
            score += 1
    except Exception:
        pass
        
    return float(score)

def get_asha_dashboard_stats(filters: dict) -> dict:
    where_str, params = build_where_clause(filters)
    
    # 1. Fetch all records matching the filters
    sql = f"SELECT pregnancy_record.*, mother_profile.pregnancy_start_date FROM pregnancy_record LEFT JOIN mother_profile ON pregnancy_record.patient_id = mother_profile.user_email WHERE {where_str}"
    patients = execute_query(sql, params)
    
    # Process dynamic gestational weeks for all patients
    patients = [_apply_dynamic_gestational_weeks(dict(p)) for p in patients]
    
    total_women = len(patients)
    high_risk = 0
    normal = 0
    emergency_alerts = 0
    pending_visits = 0
    completed_visits = 0
    missed_visits = 0
    referral_pending = 0
    referral_completed = 0
    
    # Pre-calculated village lists
    villages = set()
    village_stats = {} # village -> {total, high, normal, visited, pending, missed, rescheduled, referral_pending, referred, referral_completed, not_referred, anaemia, hypertension, diabetes, age_risk, bmi_low, bmi_high, complications, other}
    
    trimester_stats = {"1st Trimester": 0, "2nd Trimester": 0, "3rd Trimester": 0}
    
    emergency_list = []
    
    ref_date = date(2026, 7, 1)
    
    # Smart features lists
    visits_today_list = []
    overdue_high_risk_list = []
    missed_anc_list = []
    upcoming_deliveries_list = []
    upcoming_due_dates_list = []
    referral_pending_list = []
    
    for p in patients:
        vil = p["village"]
        villages.add(vil)
        
        # Init village stats if not present
        if vil not in village_stats:
            village_stats[vil] = {
                "village": vil,
                "total": 0, "highRisk": 0, "normal": 0,
                "Visited": 0, "Pending": 0, "Missed": 0, "Rescheduled": 0,
                "Not Referred": 0, "Referral Pending": 0, "Referred": 0, "Referral Completed": 0,
                "Anaemia": 0, "Hypertension": 0, "Diabetes": 0, "Age Risk": 0,
                "Low BMI": 0, "High BMI": 0, "Complications": 0, "Other": 0
            }
            
        v_stat = village_stats[vil]
        v_stat["total"] += 1
        
        # Risk counters
        is_high = p["risk_class"] == "High Risk"
        if is_high:
            high_risk += 1
            v_stat["highRisk"] += 1
        else:
            normal += 1
            v_stat["normal"] += 1
            
        # Visit status counters
        v_status = p["visit_status"]
        if v_status == "Visited":
            completed_visits += 1
        elif v_status == "Pending":
            pending_visits += 1
        elif v_status == "Missed":
            missed_visits += 1
            
        if v_status in v_stat:
            v_stat[v_status] += 1
            
        # Referral status counters
        r_status = p["referral_status"]
        if r_status == "Referral Pending":
            referral_pending += 1
        elif r_status == "Referral Completed":
            referral_completed += 1
            
        if r_status in v_stat:
            v_stat[r_status] += 1
            
        # Trimester counters
        tri = p["trimester"]
        if tri == 1:
            trimester_stats["1st Trimester"] += 1
        elif tri == 2:
            trimester_stats["2nd Trimester"] += 1
        else:
            trimester_stats["3rd Trimester"] += 1
            
        # Risk reasons (aggregate details for village stacked horizontal bar chart)
        reasons_str = p["risk_reasons"] or "None"
        if "Anaemia" in reasons_str:
            v_stat["Anaemia"] += 1
        if "Hypertension" in reasons_str:
            v_stat["Hypertension"] += 1
        if "Diabetes" in reasons_str:
            v_stat["Diabetes"] += 1
        if "Age Risk" in reasons_str:
            v_stat["Age Risk"] += 1
        if "Low BMI" in reasons_str:
            v_stat["Low BMI"] += 1
        if "High BMI" in reasons_str:
            v_stat["High BMI"] += 1
        if "Previous Pregnancy Complications" in reasons_str:
            v_stat["Complications"] += 1
        if "Other Risk Factors" in reasons_str:
            v_stat["Other"] += 1
            
        # Next visit details / Dates
        next_visit_val = p["next_visit_date"]
        due_date_val = p["due_date"]
        
        try:
            next_visit_dt = datetime.strptime(next_visit_val, "%Y-%m-%d").date() if next_visit_val else None
            due_dt = datetime.strptime(due_date_val, "%Y-%m-%d").date() if due_date_val else None
        except Exception:
            next_visit_dt = None
            due_dt = None
            
        # Emergency Alerts scoring
        e_score = calculate_emergency_score(p)
        if is_high and e_score > 0:
            emergency_alerts += 1
            # Add to emergency panel list
            emergency_list.append({
                "patient_id": p["patient_id"],
                "name": p["name"],
                "village": vil,
                "trimester": f"{tri} Trimester",
                "risk_reasons": reasons_str,
                "due_date": due_date_val,
                "phone_no": p["phone_no"],
                "referral_status": r_status,
                "priority_score": e_score
            })
            
        # Smart Features lists
        if next_visit_dt == ref_date:
            visits_today_list.append(p["patient_id"])
            
        if is_high and next_visit_dt and next_visit_dt < ref_date and v_status != "Visited":
            overdue_high_risk_list.append(p["patient_id"])
            
        if v_status == "Missed":
            missed_anc_list.append(p["patient_id"])
            
        if due_dt and ref_date <= due_dt <= (ref_date + timedelta(days=30)):
            upcoming_deliveries_list.append(p["patient_id"])
            
        if due_dt and ref_date <= due_dt <= (ref_date + timedelta(days=14)):
            upcoming_due_dates_list.append(p["patient_id"])
            
        if r_status == "Referral Pending":
            referral_pending_list.append(p["patient_id"])
            
    # Sort emergency list by priority score descending
    emergency_list.sort(key=lambda x: x["priority_score"], reverse=True)
    
    # Sort village stats descending by total count
    sorted_villages_data = sorted(list(village_stats.values()), key=lambda x: x["total"], reverse=True)
    
    # Donut Chart 3: High Risk % by village data
    high_risk_percentage_by_village = []
    for vil_item in sorted_villages_data:
        v_total = vil_item["total"]
        v_high = vil_item["highRisk"]
        v_pct = round((v_high / v_total) * 100, 2) if v_total > 0 else 0
        high_risk_percentage_by_village.append({
            "name": vil_item["village"],
            "value": v_pct,
            "count": v_high,
            "total": v_total
        })

    # Donut Chart 4: Trimester distribution list
    trimester_list = [
        {"name": "1st Trimester", "value": trimester_stats["1st Trimester"]},
        {"name": "2nd Trimester", "value": trimester_stats["2nd Trimester"]},
        {"name": "3rd Trimester", "value": trimester_stats["3rd Trimester"]},
    ]
    
    return {
        "kpis": {
            "totalPregnantWomen": total_women,
            "highRiskPregnantWomen": high_risk,
            "normalRiskPregnantWomen": normal,
            "numberOfVillages": len(villages),
            "emergencyAlerts": emergency_alerts,
            "pendingVisits": pending_visits,
            "completedVisits": completed_visits,
            "missedVisits": missed_visits,
            "referralPending": referral_pending,
            "referralCompleted": referral_completed
        },
        "charts": {
            "totalByVillage": [{"village": item["village"], "count": item["total"]} for item in sorted_villages_data],
            "riskVsNoRisk": [{"village": item["village"], "highRisk": item["highRisk"], "normal": item["normal"]} for item in sorted_villages_data],
            "highRiskPercentageByVillage": high_risk_percentage_by_village,
            "trimesterDistribution": trimester_list,
            "reasonsForHighRisk": [
                {
                    "village": item["village"],
                    "Anaemia": item["Anaemia"],
                    "Hypertension": item["Hypertension"],
                    "Diabetes": item["Diabetes"],
                    "Age Risk": item["Age Risk"],
                    "Low BMI": item["Low BMI"],
                    "High BMI": item["High BMI"],
                    "Complications": item["Complications"],
                    "Other Risk Factors": item["Other"]
                }
                for item in sorted_villages_data
            ],
            "ancVisitStatus": [
                {
                    "village": item["village"],
                    "Visited": item["Visited"],
                    "Pending": item["Pending"],
                    "Missed": item["Missed"],
                    "Rescheduled": item["Rescheduled"]
                }
                for item in sorted_villages_data
            ],
            "referralTracking": [
                {
                    "village": item["village"],
                    "Not Referred": item["Not Referred"],
                    "Referral Pending": item["Referral Pending"],
                    "Referred": item["Referred"],
                    "Referral Completed": item["Referral Completed"]
                }
                for item in sorted_villages_data
            ]
        },
        "emergencyAlertsList": emergency_list[:20], # limit to top 20 emergency alerts
        "smartAlerts": {
            "visitsTodayCount": len(visits_today_list),
            "overdueHighRiskCount": len(overdue_high_risk_list),
            "missedAncCount": len(missed_anc_list),
            "upcomingDeliveriesCount": len(upcoming_deliveries_list),
            "upcomingDueDatesCount": len(upcoming_due_dates_list),
            "referralPendingCount": len(referral_pending_list)
        }
    }

def get_asha_patients(filters: dict, page: int = 1, page_size: int = 20, sort_by: str = "patient_id", sort_dir: str = "ASC") -> dict:
    where_str, params = build_where_clause(filters)
    
    # SQL injection guard for sort column/direction
    allowed_sort_cols = [
        "patient_id", "name", "village", "age_years", "trimester", "risk_class", 
        "anc_visits", "visit_status", "next_visit_date", "referral_status", "due_date"
    ]
    if sort_by not in allowed_sort_cols:
        sort_by = "patient_id"
    if sort_dir.upper() not in ["ASC", "DESC"]:
        sort_dir = "ASC"
        
    # Count total records
    count_sql = f"SELECT COUNT(*) as count FROM pregnancy_record WHERE {where_str}"
    count_row = execute_query(count_sql, params, fetch_all=False)
    total_records = count_row[0] if isinstance(count_row, tuple) else (count_row.get("count") if isinstance(count_row, dict) else count_row)
    
    # Calculate offset
    offset = (page - 1) * page_size
    
    # Query matching page
    sql = f"SELECT pregnancy_record.*, mother_profile.pregnancy_start_date FROM pregnancy_record LEFT JOIN mother_profile ON pregnancy_record.patient_id = mother_profile.user_email WHERE {where_str} ORDER BY {sort_by} {sort_dir} LIMIT {page_size} OFFSET {offset}"
    rows = execute_query(sql, params)
    
    # Convert dates to string format
    patients_list = []
    for r in rows:
        p_dict = dict(r)
        p_dict = _apply_dynamic_gestational_weeks(p_dict)
        p_dict["next_visit_date"] = str(p_dict["next_visit_date"]) if p_dict.get("next_visit_date") else None
        p_dict["due_date"] = str(p_dict["due_date"]) if p_dict.get("due_date") else None
        patients_list.append(p_dict)
        
    return {
        "patients": patients_list,
        "total": total_records,
        "page": page,
        "page_size": page_size
    }

def get_asha_patient_detail(patient_id: str) -> dict:
    # 1. Fetch main record
    sql = "SELECT pregnancy_record.*, mother_profile.pregnancy_start_date FROM pregnancy_record LEFT JOIN mother_profile ON pregnancy_record.patient_id = mother_profile.user_email WHERE pregnancy_record.patient_id = %s"
    r = execute_query(sql, (patient_id,), fetch_all=False)
    if not r:
        return {}
        
    patient = dict(r)
    patient = _apply_dynamic_gestational_weeks(patient)
    patient["next_visit_date"] = str(patient["next_visit_date"]) if patient.get("next_visit_date") else None
    patient["due_date"] = str(patient["due_date"]) if patient.get("due_date") else None
    
    # 2. Fetch Visit Logs
    sql = "SELECT * FROM visit_log WHERE patient_id = %s ORDER BY visit_date DESC"
    v_rows = execute_query(sql, (patient_id,))
    visit_logs = []
    for vr in v_rows:
        v_dict = dict(vr)
        v_dict["visit_date"] = str(v_dict["visit_date"])
        v_dict["visit_time"] = str(v_dict["visit_time"])
        visit_logs.append(v_dict)
        
    # 3. Fetch Referral Logs
    sql = "SELECT * FROM referral_log WHERE patient_id = %s ORDER BY referral_date DESC"
    r_rows = execute_query(sql, (patient_id,))
    referral_logs = []
    for rr in r_rows:
        r_dict = dict(rr)
        r_dict["referral_date"] = str(r_dict["referral_date"]) if r_dict.get("referral_date") else None
        referral_logs.append(r_dict)
        
    return {
        "patient": patient,
        "visit_logs": visit_logs,
        "referral_logs": referral_logs
    }

def update_asha_patient(patient_id: str, updater_email: str, data: dict, model=None) -> tuple[bool, str]:
    # 1. Permission check: Check patient's current assigned ASHA worker
    sql = "SELECT assigned_asha_email, name, village FROM pregnancy_record WHERE patient_id = %s"
    p_info = execute_query(sql, (patient_id,), fetch_all=False)
    if not p_info:
        return False, "Patient not found."
        
    assigned_email = p_info.get("assigned_asha_email")
    patient_name = p_info.get("name")
    
    if assigned_email != updater_email:
        # ASHA Worker cannot edit this record
        # Query assigned worker details to show informative message
        worker_info = get_asha_details(assigned_email) if assigned_email else None
        worker_name = worker_info["name"] if worker_info else (assigned_email or "another ASHA Worker")
        return False, f"Access Denied: Only Sunita Devi (asha1@example.com) or the assigned ASHA Worker ({worker_name}) can edit {patient_name}'s record. This record remains read-only for you."

    # 2. Extract and construct update values
    update_fields = []
    params = []
    
    # Metadata updates
    if "name" in data:
        update_fields.append("name = %s")
        params.append(data["name"])
    if "phone_no" in data:
        update_fields.append("phone_no = %s")
        params.append(data["phone_no"])
    if "age_years" in data:
        update_fields.append("age_years = %s")
        params.append(int(data["age_years"]))
    if "gestational_age_weeks" in data:
        ga = float(data["gestational_age_weeks"])
        update_fields.append("gestational_age_weeks = %s")
        params.append(ga)
        
        # Recalculate trimester
        tri = 1 if ga <= 12 else (2 if ga <= 26 else 3)
        update_fields.append("trimester = %s")
        params.append(tri)
        
        # Recalculate due date from baseline July 1, 2026
        ref_date = date(2026, 7, 1)
        days_left = int((40.0 - ga) * 7)
        due_date = ref_date + timedelta(days=days_left)
        update_fields.append("due_date = %s")
        params.append(due_date.strftime("%Y-%m-%d"))
        
    # Vitals updates
    vitals_keys = [
        "systolic_bp_mmHg", "diastolic_bp_mmHg", "random_blood_sugar_mg_dL", 
        "body_temperature_F", "heart_rate_bpm", "hemoglobin_g_dL", "hba1c_percent", 
        "respiratory_rate_bpm", "bmi", "spo2_percent", "symptoms_score_0_10", "edema_severity"
    ]
    
    vitals_updated = False
    for k in vitals_keys:
        if k in data:
            vitals_updated = True
            update_fields.append(f"{k} = %s")
            params.append(data[k])
            
    # Recalculate Risk if vitals are updated
    if vitals_updated or "gestational_age_weeks" in data or "age_years" in data:
        # Fetch current record to merge with updated details
        sql_fetch = "SELECT * FROM pregnancy_record WHERE patient_id = %s"
        current_rec = dict(execute_query(sql_fetch, (patient_id,), fetch_all=False))
        
        # Merge values
        merged_rec = {}
        for k in current_rec:
            merged_rec[k] = data[k] if k in data else current_rec[k]
            
        # Clinical Rule Risk Reasons
        reasons = []
        bp_systolic = float(merged_rec["systolic_bp_mmHg"])
        bp_diastolic = float(merged_rec["diastolic_bp_mmHg"])
        sugar = float(merged_rec["random_blood_sugar_mg_dL"])
        hb = float(merged_rec["hemoglobin_g_dL"])
        hba1c = float(merged_rec["hba1c_percent"])
        age = int(merged_rec["age_years"])
        bmi = float(merged_rec["bmi"])
        temp = float(merged_rec["body_temperature_F"])
        spo2 = float(merged_rec["spo2_percent"])
        symptoms = float(merged_rec["symptoms_score_0_10"])
        
        if hb < 11.0:
            reasons.append("Anaemia")
        if bp_systolic >= 140 or bp_diastolic >= 90:
            reasons.append("Hypertension")
        if sugar > 140 or hba1c > 6.5:
            reasons.append("Diabetes")
        if age < 18 or age > 35:
            reasons.append("Age Risk")
        if bmi < 18.5:
            reasons.append("Low BMI")
        elif bmi > 25.0:
            reasons.append("High BMI")
        if merged_rec["abortion_A"] > 0 or merged_rec["death_D"] > 0 or merged_rec["gravida_G"] > (merged_rec["para_P"] + merged_rec["abortion_A"] + merged_rec["death_D"] + 1):
            reasons.append("Previous Pregnancy Complications")
        if temp > 100.4 or spo2 < 95.0 or symptoms > 5.0:
            reasons.append("Other Risk Factors")

        risk_reasons_str = ", ".join(reasons) if reasons else "None"
        update_fields.append("risk_reasons = %s")
        params.append(risk_reasons_str)
        
        # Risk Class Mapping: use ML model predict if available, else clinical rules
        new_risk_class = "Normal"
        if model is not None:
            try:
                # Features list matching model: 'Age', 'G', 'P', 'L', 'A', 'D', 'SystolicBP', 'DiastolicBP', 'RBS', 'BodyTemp', 'HeartRate', 'HB', 'HBA1C', 'RR'
                # Note: Model predict requires this exact ordering
                feats = [
                    float(merged_rec["age_years"]), float(merged_rec["gravida_G"]), float(merged_rec["para_P"]), 
                    float(merged_rec["live_child_L"]), float(merged_rec["abortion_A"]), float(merged_rec["death_D"]), 
                    float(bp_systolic), float(bp_diastolic), float(sugar), float(temp), 
                    float(merged_rec["heart_rate_bpm"]), float(hb), float(hba1c), float(merged_rec["respiratory_rate_bpm"])
                ]
                pred = model.predict([feats])
                new_risk_class = "High Risk" if pred[0] != 0 or len(reasons) > 0 else "Normal"
            except Exception as e:
                logger.error(f"ML Model predict failed: {e}. Falling back to clinical rules.")
                new_risk_class = "High Risk" if len(reasons) > 0 else "Normal"
        else:
            new_risk_class = "High Risk" if len(reasons) > 0 else "Normal"
            
        update_fields.append("risk_class = %s")
        params.append(new_risk_class)

    # Referral Status / Visit Status direct updates
    if "referral_status" in data:
        update_fields.append("referral_status = %s")
        params.append(data["referral_status"])
    if "visit_status" in data:
        update_fields.append("visit_status = %s")
        params.append(data["visit_status"])
    if "next_visit_date" in data:
        update_fields.append("next_visit_date = %s")
        params.append(data["next_visit_date"])
    if "assigned_asha_email" in data:
        update_fields.append("assigned_asha_email = %s")
        params.append(data["assigned_asha_email"])
        
    if not update_fields:
        return True, "No fields updated."
        
    sql_update = f"UPDATE pregnancy_record SET {', '.join(update_fields)} WHERE patient_id = %s"
    params.append(patient_id)
    
    execute_query(sql_update, tuple(params))
    return True, "Record updated successfully."

def add_patient_visit(patient_id: str, updater_email: str, data: dict) -> tuple[bool, str]:
    # 1. Permission check
    sql = "SELECT assigned_asha_email, name, visit_status, anc_visits FROM pregnancy_record WHERE patient_id = %s"
    p_info = execute_query(sql, (patient_id,), fetch_all=False)
    if not p_info:
        return False, "Patient not found."
        
    assigned_email = p_info.get("assigned_asha_email")
    patient_name = p_info.get("name")
    
    if assigned_email != updater_email:
        worker_info = get_asha_details(assigned_email) if assigned_email else None
        worker_name = worker_info["name"] if worker_info else (assigned_email or "another ASHA Worker")
        return False, f"Access Denied: Only Sunita Devi (asha1@example.com) or the assigned ASHA Worker ({worker_name}) can add visit logs for {patient_name}."
        
    # 2. Insert visit log
    visit_date_val = data.get("visit_date", date.today().strftime("%Y-%m-%d"))
    visit_time_val = data.get("visit_time", "12:00:00")
    visit_status_val = data.get("visit_status", "Visited")
    remarks = data.get("remarks", "Checked by ASHA worker.")
    
    sql_log = "INSERT INTO visit_log (patient_id, visit_date, visit_time, visit_status, remarks) VALUES (%s, %s, %s, %s, %s)"
    execute_query(sql_log, (patient_id, visit_date_val, visit_time_val, visit_status_val, remarks))
    
    # 3. Update pregnancy_record visit_status and anc_visits count
    new_visits_count = p_info["anc_visits"]
    if visit_status_val == "Visited":
        new_visits_count += 1
        
    # Set next visit date based on status: Visited = 30 days later, Rescheduled = 7 days later
    ref_dt = datetime.strptime(visit_date_val, "%Y-%m-%d").date()
    if visit_status_val == "Visited":
        next_visit = ref_dt + timedelta(days=30)
    elif visit_status_val == "Rescheduled":
        next_visit = ref_dt + timedelta(days=7)
    else:
        next_visit = ref_dt + timedelta(days=14)
        
    sql_update = "UPDATE pregnancy_record SET visit_status = %s, anc_visits = %s, next_visit_date = %s WHERE patient_id = %s"
    execute_query(sql_update, (visit_status_val, new_visits_count, next_visit.strftime("%Y-%m-%d"), patient_id))
    
    return True, "Visit log added and stats updated successfully."

def add_patient_referral(patient_id: str, updater_email: str, data: dict) -> tuple[bool, str]:
    # 1. Permission check
    sql = "SELECT assigned_asha_email, name FROM pregnancy_record WHERE patient_id = %s"
    p_info = execute_query(sql, (patient_id,), fetch_all=False)
    if not p_info:
        return False, "Patient not found."
        
    assigned_email = p_info.get("assigned_asha_email")
    patient_name = p_info.get("name")
    
    if assigned_email != updater_email:
        worker_info = get_asha_details(assigned_email) if assigned_email else None
        worker_name = worker_info["name"] if worker_info else (assigned_email or "another ASHA Worker")
        return False, f"Access Denied: Only Sunita Devi (asha1@example.com) or the assigned ASHA Worker ({worker_name}) can add referral logs for {patient_name}."
        
    # 2. Insert referral log
    referred = data.get("referred", "Referred")
    referral_date_val = data.get("referral_date", date.today().strftime("%Y-%m-%d"))
    hospital_name = data.get("hospital_name", "")
    doctor = data.get("doctor", "")
    referral_status_val = data.get("referral_status", "Pending") # Pending, Accepted, Completed
    remarks = data.get("remarks", "")
    
    sql_log = """
        INSERT INTO referral_log (patient_id, referred, referral_date, hospital_name, doctor, referral_status, remarks)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
    """
    execute_query(sql_log, (patient_id, referred, referral_date_val, hospital_name, doctor, referral_status_val, remarks))
    
    # 3. Update pregnancy_record referral_status
    # Map logs status 'Pending'/'Accepted'/'Completed' to pregnancy_record status 'Referral Pending'/'Referred'/'Referral Completed'
    m_status = "Not Referred"
    if referred == "Referred":
        if referral_status_val == "Pending":
            m_status = "Referral Pending"
        elif referral_status_val == "Accepted":
            m_status = "Referred"
        elif referral_status_val == "Completed":
            m_status = "Referral Completed"
            
    sql_update = "UPDATE pregnancy_record SET referral_status = %s WHERE patient_id = %s"
    execute_query(sql_update, (m_status, patient_id))
    
    return True, "Referral log added and status updated successfully."

def get_preprocessing_summary() -> dict:
    # Summary of data cleaning tasks completed
    csv_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "high_risk_pregnancy_realistic_2000.csv")
    if not os.path.exists(csv_path):
        return {"error": "Original CSV dataset file not found."}
        
    try:
        df_orig = pd.read_csv(csv_path)
        original_records = len(df_orig)
        original_duplicates = int(df_orig.duplicated(subset=["patient_id"]).sum())
        original_missing_bmi = int(df_orig["bmi"].isnull().sum())
        original_missing_spo2 = int(df_orig["spo2_percent"].isnull().sum())
        original_missing_temp = int(df_orig["body_temperature_F"].isnull().sum())
        
        # Query preprocessed db records count
        db_count_sql = "SELECT COUNT(*) as count FROM pregnancy_record"
        db_count = execute_query(db_count_sql, fetch_all=False)
        processed_records = db_count[0] if isinstance(db_count, tuple) else (db_count.get("count") if isinstance(db_count, dict) else db_count)
        
        return {
            "dataset_name": "high_risk_pregnancy_realistic_2000.csv",
            "original_records_count": original_records,
            "processed_records_count": processed_records,
            "preprocessing_details": [
                {
                    "step": "Remove Duplicates",
                    "description": "Dropped patient_id duplicates to maintain patient registry integrity.",
                    "original_stat": f"{original_duplicates} duplicates found",
                    "processed_stat": "0 duplicates remaining"
                },
                {
                    "step": "Fix Inconsistent Villages",
                    "description": "Trimmed whitespace and capitalized village names to title-case (e.g. basalpur -> Basalpur).",
                    "original_stat": "Various variations in capitalization/spacing",
                    "processed_stat": "Standardized into 10 unique, clean villages"
                },
                {
                    "step": "BMI Median Imputation",
                    "description": "Imputed missing BMI values using column median to prevent calculations breakdown.",
                    "original_stat": f"{original_missing_bmi} missing values",
                    "processed_stat": "0 missing values, filled with median (23.4)"
                },
                {
                    "step": "SpO2 % Imputation",
                    "description": "Imputed missing SpO2 values using column median (typically 98%).",
                    "original_stat": f"{original_missing_spo2} missing values",
                    "processed_stat": "0 missing values, filled with median (98.0%)"
                },
                {
                    "step": "Temperature Imputation",
                    "description": "Imputed missing Body Temperature values using column median.",
                    "original_stat": f"{original_missing_temp} missing values",
                    "processed_stat": "0 missing values, filled with median (98.6°F)"
                },
                {
                    "step": "Derive Trimester",
                    "description": "Categorized pregnancy progress into 1st, 2nd, and 3rd trimesters based on gestational age.",
                    "original_stat": "Only raw gestational_age_weeks present",
                    "processed_stat": "Created 'trimester' column (1, 2, or 3)"
                },
                {
                    "step": "Derive Due Date & Next Visit",
                    "description": "Calculated due date based on 40-week gestation from baseline, and set future next visit dates.",
                    "original_stat": "No dates present",
                    "processed_stat": "Generated 'due_date' and 'next_visit_date' values"
                },
                {
                    "step": "Derive Clinical Risk Reasons",
                    "description": "Mapped clinical flags (Hypertension, Anaemia, Diabetes, Age Risk, etc.) by evaluating patient vitals against medical guidelines.",
                    "original_stat": "No granular risk breakdown present",
                    "processed_stat": "Created 'risk_reasons' list for emergency classification"
                }
            ]
        }
    except Exception as exc:
        return {"error": f"Failed to compute preprocessing summary: {exc}"}
