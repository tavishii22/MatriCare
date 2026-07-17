import os
import json
import hashlib
import logging
from datetime import datetime, date, timedelta
import pandas as pd
import bcrypt

logger = logging.getLogger("matricare")

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def seed_database(conn, is_sqlite=False):
    cursor = conn.cursor()
    p_placeholder = "?" if is_sqlite else "%s"

    # 1. Alter user table if role column does not exist
    try:
        cursor.execute("ALTER TABLE user ADD COLUMN role VARCHAR(50) DEFAULT 'patient'")
        conn.commit()
    except Exception:
        # Column already exists or alter table not supported
        pass

    # 2. Seed dummy ASHA workers
    dummy_ashas = [
        {
            "email": "asha1@example.com",
            "name": "Sunita Devi",
            "phone_no": "9988776655",
            "address": "Primary Health Centre, Nandgaon",
            "worker_id": "ASHA2026001",
            "assigned_villages": "Nandgaon, Haripur, Basantpur, Bhawanipur, Khadar",
            "qualification": "12th Pass, ANM Certified",
            "joining_date": "2020-03-15",
            "employee_status": "Active",
            "supervisor": "Dr. Anupam Mishra",
            "government_id": "GOV-ASHA-998877"
        },
        {
            "email": "asha2@example.com",
            "name": "Rani Kumari",
            "phone_no": "9988776644",
            "address": "Community Health Centre, Lakshmipur",
            "worker_id": "ASHA2026002",
            "assigned_villages": "Lakshmipur, Madanpur, Shivpuri, Rampur, Devnagar",
            "qualification": "B.Sc Nursing",
            "joining_date": "2021-06-20",
            "employee_status": "Active",
            "supervisor": "Dr. Rajesh K. Singh",
            "government_id": "GOV-ASHA-445566"
        }
    ]

    for asha in dummy_ashas:
        # Check if user already exists
        cursor.execute(f"SELECT email FROM user WHERE email = {p_placeholder}", (asha["email"],))
        user_exists = cursor.fetchone()
        if not user_exists:
            p_hash = hash_password("password123")
            cursor.execute(
                f"""
                INSERT INTO user (email, password_hash, name, phone_no, address, role)
                VALUES ({p_placeholder}, {p_placeholder}, {p_placeholder}, {p_placeholder}, {p_placeholder}, 'asha_worker')
                """,
                (asha["email"], p_hash, asha["name"], asha["phone_no"], asha["address"])
            )
            cursor.execute(
                f"""
                INSERT INTO asha_worker (email, worker_id, assigned_villages, qualification, joining_date, employee_status, supervisor, government_id)
                VALUES ({p_placeholder}, {p_placeholder}, {p_placeholder}, {p_placeholder}, {p_placeholder}, {p_placeholder}, {p_placeholder}, {p_placeholder})
                """,
                (asha["email"], asha["worker_id"], asha["assigned_villages"], asha["qualification"], asha["joining_date"], asha["employee_status"], asha["supervisor"], asha["government_id"])
            )
            conn.commit()
            logger.info(f"Seeded dummy ASHA Worker: {asha['email']}")

    # 3. Seed pregnancy records from CSV dataset
    csv_path = os.path.join(os.path.dirname(__file__), "high_risk_pregnancy_realistic_2000.csv")

    # Only seed if table is empty
    cursor.execute("SELECT COUNT(*) FROM pregnancy_record")
    row = cursor.fetchone()
    count = list(row.values())[0] if isinstance(row, dict) else row[0]
    if count > 0:
        logger.info(f"pregnancy_record table already has {count} rows, skipping seed.")
        cursor.close()
        return

    logger.info(f"Seeding pregnancy database from: {csv_path}")
    try:
        df = pd.read_csv(csv_path)
    except Exception as exc:
        logger.error(f"Failed to read CSV dataset: {exc}")
        cursor.close()
        return

    # Data Preprocessing
    # A. Remove duplicates
    df = df.drop_duplicates(subset=["patient_id"])

    # B. Fix inconsistent village names & Clean columns
    df["village"] = df["village"].apply(lambda x: str(x).strip().title() if pd.notnull(x) else "Unknown")

    # C. Median Imputation for numerical columns
    numeric_cols = [
        "age_years", "gravida_G", "para_P", "live_child_L", "abortion_A", "death_D", 
        "gestational_age_weeks", "systolic_bp_mmHg", "diastolic_bp_mmHg", "random_blood_sugar_mg_dL", 
        "body_temperature_F", "heart_rate_bpm", "hemoglobin_g_dL", "hba1c_percent", 
        "respiratory_rate_bpm", "bmi", "spo2_percent", "symptoms_score_0_10"
    ]
    for col in numeric_cols:
        if col in df.columns:
            median_val = df[col].median()
            df[col] = df[col].fillna(median_val)

    # Standardize categorical edema_severity
    df["edema_severity"] = df["edema_severity"].fillna("None")

    # D. Seed constants
    ref_date = date(2026, 7, 1) # Project baseline date
    first_names = ["Anjali", "Priya", "Kiran", "Sita", "Sunita", "Rani", "Rekha", "Suman", "Meena", "Lata", 
                   "Geeta", "Babita", "Kavita", "Radha", "Pooja", "Jyoti", "Preeti", "Aarti", "Pinky", "Mamta",
                   "Ritu", "Neetu", "Sarla", "Kusum", "Maya", "Anita", "Seema", "Kamla", "Vimla", "Usha"]
    last_names = ["Devi", "Bai", "Sharma", "Verma", "Singh", "Kumari", "Lata", "Joshi", "Yadav", "Gupta"]

    records_to_insert = []
    visit_logs_to_insert = []
    referral_logs_to_insert = []

    for _, row in df.iterrows():
        pid = row["patient_id"]
        h = int(hashlib.md5(pid.encode()).hexdigest(), 16)
        
        # Deterministic name and phone
        first = first_names[h % len(first_names)]
        last = last_names[(h // len(first_names)) % len(last_names)]
        name = f"{first} {last}"
        phone = f"98765{h % 100000:05d}"

        # Trimester calculation
        ga = row["gestational_age_weeks"]
        if ga <= 12:
            trimester = 1
        elif ga <= 26:
            trimester = 2
        else:
            trimester = 3

        # Due date: (40 - ga) * 7 days from baseline ref_date
        days_left = int((40.0 - ga) * 7)
        due_date = ref_date + timedelta(days=days_left)

        # Risk Reasons Assessment (Clinical guidelines)
        reasons = []
        bp_systolic = row["systolic_bp_mmHg"]
        bp_diastolic = row["diastolic_bp_mmHg"]
        sugar = row["random_blood_sugar_mg_dL"]
        hb = row["hemoglobin_g_dL"]
        hba1c = row["hba1c_percent"]
        age = row["age_years"]
        bmi = row["bmi"]
        temp = row["body_temperature_F"]
        spo2 = row["spo2_percent"]
        symptoms = row["symptoms_score_0_10"]
        
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
        if row["abortion_A"] > 0 or row["death_D"] > 0 or row["gravida_G"] > (row["para_P"] + row["abortion_A"] + row["death_D"] + 1):
            reasons.append("Previous Pregnancy Complications")
        if temp > 100.4 or spo2 < 95.0 or symptoms > 5.0:
            reasons.append("Other Risk Factors")

        risk_reasons_str = ", ".join(reasons) if reasons else "None"

        # Risk Class Mapping
        original_class = row["risk_class"] # 'Risk' or 'No Risk'
        risk_class = "High Risk" if original_class == "Risk" or len(reasons) > 0 else "Normal"

        # ASHA Worker allocation based on village
        vil = row["village"]
        if vil in ["Nandgaon", "Haripur", "Basantpur", "Bhawanipur", "Khadar"]:
            assigned_asha = "asha1@example.com"
        else:
            assigned_asha = "asha2@example.com"

        # Deterministic visit status
        # Visited: 60%, Pending: 20%, Missed: 10%, Rescheduled: 10%
        v_mod = h % 10
        if v_mod < 6:
            visit_status = "Visited"
        elif v_mod < 8:
            visit_status = "Pending"
        elif v_mod == 8:
            visit_status = "Missed"
        else:
            visit_status = "Rescheduled"

        # Visits count
        anc_visits = (h % 4) + 1 # 1 to 4 visits

        # Deterministic Next Visit Date
        if visit_status in ["Pending", "Rescheduled"]:
            next_visit = ref_date + timedelta(days=(h % 15) + 1)
        elif visit_status == "Missed":
            next_visit = ref_date - timedelta(days=(h % 5) + 1)
        else:
            next_visit = ref_date + timedelta(days=(h % 30) + 15)

        # Deterministic Referral status
        # If High Risk: Referral Pending (20%), Referred (20%), Referral Completed (40%), Not Referred (20%)
        if risk_class == "High Risk":
            ref_mod = h % 5
            if ref_mod == 0:
                referral_status = "Not Referred"
            elif ref_mod == 1:
                referral_status = "Referral Pending"
            elif ref_mod == 2:
                referral_status = "Referred"
            else:
                referral_status = "Referral Completed"
        else:
            referral_status = "Not Referred"

        records_to_insert.append((
            pid, name, phone, vil, int(age), int(row["gravida_G"]), int(row["para_P"]), 
            int(row["live_child_L"]), int(row["abortion_A"]), int(row["death_D"]), 
            float(ga), trimester, float(bp_systolic), float(bp_diastolic), float(sugar), 
            float(temp), float(row["heart_rate_bpm"]), float(hb), float(hba1c), 
            float(row["respiratory_rate_bpm"]), float(bmi), float(spo2), row["edema_severity"], 
            float(symptoms), risk_class, risk_reasons_str, assigned_asha, 
            anc_visits, visit_status, next_visit.strftime("%Y-%m-%d"), referral_status, due_date.strftime("%Y-%m-%d")
        ))

        # Generate some dummy visit logs
        # If Visited or Completed, we add historical logs
        for idx in range(anc_visits):
            past_visit_date = ref_date - timedelta(days=(idx + 1) * 30 + (h % 10))
            visit_logs_to_insert.append((
                pid, past_visit_date.strftime("%Y-%m-%d"), "10:00:00", "Visited", f"Routine checkup {idx+1} completed successfully."
            ))
        
        # If Referral Pending, Referred, or Completed, insert referral logs
        if referral_status != "Not Referred":
            r_status = "Pending"
            if referral_status == "Referred":
                r_status = "Accepted"
            elif referral_status == "Referral Completed":
                r_status = "Completed"
                
            ref_date_log = ref_date - timedelta(days=(h % 10) + 1)
            hospitals = ["District General Hospital", "Maternal Care Clinic", "City Civil Hospital", "Saint Mary Motherhood Care"]
            doctors = ["Dr. Shobha Sharma", "Dr. Kavita Vyas", "Dr. Anjali Patil", "Dr. Preeti Deshmukh"]
            
            referral_logs_to_insert.append((
                pid, "Referred", ref_date_log.strftime("%Y-%m-%d"), hospitals[h % len(hospitals)], doctors[h % len(doctors)], r_status, f"Referred due to {risk_reasons_str}."
            ))

    # Insert Patients
    insert_patient_sql = f"""
        INSERT INTO pregnancy_record (
            patient_id, name, phone_no, village, age_years, gravida_G, para_P, 
            live_child_L, abortion_A, death_D, gestational_age_weeks, trimester, 
            systolic_bp_mmHg, diastolic_bp_mmHg, random_blood_sugar_mg_dL, 
            body_temperature_F, heart_rate_bpm, hemoglobin_g_dL, hba1c_percent, 
            respiratory_rate_bpm, bmi, spo2_percent, edema_severity, 
            symptoms_score_0_10, risk_class, risk_reasons, assigned_asha_email, 
            anc_visits, visit_status, next_visit_date, referral_status, due_date
        ) VALUES (
            {p_placeholder}, {p_placeholder}, {p_placeholder}, {p_placeholder}, {p_placeholder}, {p_placeholder}, {p_placeholder}, {p_placeholder}, {p_placeholder}, {p_placeholder}, {p_placeholder}, {p_placeholder}, {p_placeholder}, {p_placeholder}, {p_placeholder}, {p_placeholder}, {p_placeholder}, {p_placeholder}, {p_placeholder}, {p_placeholder}, {p_placeholder}, {p_placeholder}, {p_placeholder}, {p_placeholder}, {p_placeholder}, {p_placeholder}, {p_placeholder}, {p_placeholder}, {p_placeholder}, {p_placeholder}, {p_placeholder}, {p_placeholder}
        )
    """
    
    # Batch insert to stay highly efficient
    for rec in records_to_insert:
        cursor.execute(insert_patient_sql, rec)

    # Insert Visit Logs
    insert_visit_sql = f"""
        INSERT INTO visit_log (patient_id, visit_date, visit_time, visit_status, remarks)
        VALUES ({p_placeholder}, {p_placeholder}, {p_placeholder}, {p_placeholder}, {p_placeholder})
    """
    for v_log in visit_logs_to_insert:
        cursor.execute(insert_visit_sql, v_log)

    # Insert Referral Logs
    insert_referral_sql = f"""
        INSERT INTO referral_log (patient_id, referred, referral_date, hospital_name, doctor, referral_status, remarks)
        VALUES ({p_placeholder}, {p_placeholder}, {p_placeholder}, {p_placeholder}, {p_placeholder}, {p_placeholder}, {p_placeholder})
    """
    for r_log in referral_logs_to_insert:
        cursor.execute(insert_referral_sql, r_log)

    conn.commit()
    logger.info(f"Successfully seeded {len(records_to_insert)} pregnancy records.")
    cursor.close()
