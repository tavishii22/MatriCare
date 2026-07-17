import pymysql
import pymysql.cursors
import sqlite3
import os
import logging
from urllib.parse import urlparse
from config import get_settings

logger = logging.getLogger("matricare")

class DBUnavailableError(RuntimeError):
    pass

# Dict factory for SQLite to return dictionary rows
def dict_factory(cursor, row):
    d = {}
    for idx, col in enumerate(cursor.description):
        d[col[0]] = row[idx]
    return d

class DBConnection:
    def __init__(self, conn, is_sqlite=False):
        self.conn = conn
        self.is_sqlite = is_sqlite
        
    def cursor(self):
        return DBCursor(self.conn.cursor(), self.is_sqlite)
        
    def commit(self):
        self.conn.commit()
        
    def rollback(self):
        try:
            self.conn.rollback()
        except Exception:
            pass
            
    def close(self):
        self.conn.close()

class DBCursor:
    def __init__(self, cursor, is_sqlite=False):
        self.cursor = cursor
        self.is_sqlite = is_sqlite
        
    def execute(self, sql, params=()):
        if self.is_sqlite:
            # Map MySQL placeholder %s to SQLite placeholder ?
            sql = sql.replace("%s", "?")
        self.cursor.execute(sql, params)
        
    def fetchone(self):
        return self.cursor.fetchone()
        
    def fetchall(self):
        return self.cursor.fetchall()
        
    def close(self):
        self.cursor.close()

def parse_database_url(url: str) -> dict:
    try:
        parsed = urlparse(url)
        username = parsed.username or "root"
        password = parsed.password or ""
        hostname = parsed.hostname or "localhost"
        port = parsed.port or 3306
        database = parsed.path.lstrip("/")
        
        return {
            "host": hostname,
            "user": username,
            "password": password,
            "port": port,
            "database": database
        }
    except Exception as exc:
        raise ValueError(f"Invalid database URL: {exc}")

def init_db_tables():
    database_url = get_settings()["database_url"]
    
    if database_url and database_url.startswith("mysql"):
        # Initialize MySQL
        db_config = parse_database_url(database_url)
        db_name = db_config["database"]
        
        # 1. Connect without selecting database to ensure database exists
        try:
            conn = pymysql.connect(
                host=db_config["host"],
                user=db_config["user"],
                password=db_config["password"],
                port=db_config["port"]
            )
            cursor = conn.cursor()
            cursor.execute(f"CREATE DATABASE IF NOT EXISTS `{db_name}`")
            conn.commit()
            cursor.close()
            conn.close()
        except Exception as exc:
            raise DBUnavailableError(f"Failed to check/create database: {exc}")

        # 2. Reconnect and select database to create tables
        try:
            conn = pymysql.connect(
                host=db_config["host"],
                user=db_config["user"],
                password=db_config["password"],
                port=db_config["port"],
                database=db_name
            )
            cursor = conn.cursor()
            
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS user (
                    email VARCHAR(255) PRIMARY KEY,
                    password_hash VARCHAR(255) NOT NULL,
                    name VARCHAR(255) NULL,
                    phone_no VARCHAR(50) NULL,
                    address TEXT NULL,
                    role VARCHAR(50) DEFAULT 'patient',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS mother_profile (
                    user_email VARCHAR(255) PRIMARY KEY,
                    dob DATE NOT NULL,
                    gravida INT NOT NULL DEFAULT 0,
                    para INT NOT NULL DEFAULT 0,
                    live_births INT NOT NULL DEFAULT 0,
                    abortions INT NOT NULL DEFAULT 0,
                    deaths INT NOT NULL DEFAULT 0,
                    avatar LONGTEXT NULL,
                    gestational_weeks INT DEFAULT 0,
                    pregnancy_start_date DATE NULL,
                    FOREIGN KEY (user_email) REFERENCES user(email) ON DELETE CASCADE
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS risk_assessment (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_email VARCHAR(255) NOT NULL,
                    prediction VARCHAR(50) NOT NULL,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    parameters JSON NOT NULL,
                    FOREIGN KEY (user_email) REFERENCES user(email) ON DELETE CASCADE
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS asha_worker (
                    email VARCHAR(255) PRIMARY KEY,
                    worker_id VARCHAR(50) UNIQUE NOT NULL,
                    assigned_villages TEXT NULL,
                    qualification VARCHAR(255) NULL,
                    joining_date DATE NULL,
                    employee_status VARCHAR(50) NULL,
                    supervisor VARCHAR(255) NULL,
                    government_id VARCHAR(100) NULL,
                    FOREIGN KEY (email) REFERENCES user(email) ON DELETE CASCADE
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS pregnancy_record (
                    patient_id VARCHAR(50) PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    phone_no VARCHAR(50) NULL,
                    village VARCHAR(255) NOT NULL,
                    age_years INT NOT NULL,
                    gravida_G INT NOT NULL,
                    para_P INT NOT NULL,
                    live_child_L INT NOT NULL,
                    abortion_A INT NOT NULL,
                    death_D INT NOT NULL,
                    gestational_age_weeks FLOAT NOT NULL,
                    trimester INT NOT NULL,
                    systolic_bp_mmHg FLOAT NOT NULL,
                    diastolic_bp_mmHg FLOAT NOT NULL,
                    random_blood_sugar_mg_dL FLOAT NOT NULL,
                    body_temperature_F FLOAT NOT NULL,
                    heart_rate_bpm FLOAT NOT NULL,
                    hemoglobin_g_dL FLOAT NOT NULL,
                    hba1c_percent FLOAT NOT NULL,
                    respiratory_rate_bpm FLOAT NOT NULL,
                    bmi FLOAT NOT NULL,
                    spo2_percent FLOAT NOT NULL,
                    edema_severity VARCHAR(50) NULL,
                    symptoms_score_0_10 FLOAT NOT NULL,
                    risk_class VARCHAR(50) NOT NULL,
                    risk_reasons TEXT NULL,
                    assigned_asha_email VARCHAR(255) NULL,
                    anc_visits INT NOT NULL DEFAULT 0,
                    visit_status VARCHAR(50) NOT NULL DEFAULT 'Pending',
                    next_visit_date DATE NULL,
                    referral_status VARCHAR(50) NOT NULL DEFAULT 'Not Referred',
                    due_date DATE NULL,
                    FOREIGN KEY (assigned_asha_email) REFERENCES user(email) ON DELETE SET NULL
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS visit_log (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    patient_id VARCHAR(50) NOT NULL,
                    visit_date DATE NOT NULL,
                    visit_time TIME NOT NULL,
                    visit_status VARCHAR(50) NOT NULL,
                    remarks TEXT NULL,
                    FOREIGN KEY (patient_id) REFERENCES pregnancy_record(patient_id) ON DELETE CASCADE
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS referral_log (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    patient_id VARCHAR(50) NOT NULL,
                    referred VARCHAR(50) NOT NULL DEFAULT 'Not Referred',
                    referral_date DATE NULL,
                    hospital_name VARCHAR(255) NULL,
                    doctor VARCHAR(255) NULL,
                    referral_status VARCHAR(50) NULL,
                    remarks TEXT NULL,
                    FOREIGN KEY (patient_id) REFERENCES pregnancy_record(patient_id) ON DELETE CASCADE
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS admin (
                    email VARCHAR(255) PRIMARY KEY,
                    admin_id VARCHAR(50) UNIQUE NOT NULL,
                    name VARCHAR(255) NOT NULL,
                    phone_no VARCHAR(50) NULL,
                    department VARCHAR(255) NULL,
                    designation VARCHAR(255) NULL,
                    government_id VARCHAR(100) NULL,
                    joining_date DATE NULL,
                    FOREIGN KEY (email) REFERENCES user(email) ON DELETE CASCADE
                )
            """)
            
            # Migration check: add gestational_weeks and pregnancy_start_date if not present
            try:
                cursor.execute("ALTER TABLE mother_profile ADD COLUMN gestational_weeks INT DEFAULT 0")
                conn.commit()
            except Exception:
                pass
            try:
                cursor.execute("ALTER TABLE mother_profile ADD COLUMN pregnancy_start_date DATE NULL")
                conn.commit()
            except Exception:
                pass

            conn.commit()
            
            # Seed the database
            try:
                from seeder import seed_database
                seed_database(conn, is_sqlite=False)
            except Exception as e:
                logger.warning(f"Failed to seed MySQL database: {e}")
                
            cursor.close()
            conn.close()
        except Exception as exc:
            raise DBUnavailableError(f"Failed to initialize MySQL tables: {exc}")
    else:
        # Initialize SQLite
        try:
            db_path = os.path.join(get_settings()["backend_dir"], "matricare.db")
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            cursor.execute("PRAGMA foreign_keys = ON;")
            
            # Create user table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS user (
                    email VARCHAR(255) PRIMARY KEY,
                    password_hash VARCHAR(255) NOT NULL,
                    name VARCHAR(255) NULL,
                    phone_no VARCHAR(50) NULL,
                    address TEXT NULL,
                    role VARCHAR(50) DEFAULT 'patient',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Create mother_profile table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS mother_profile (
                    user_email VARCHAR(255) PRIMARY KEY,
                    dob DATE NOT NULL,
                    gravida INT NOT NULL DEFAULT 0,
                    para INT NOT NULL DEFAULT 0,
                    live_births INT NOT NULL DEFAULT 0,
                    abortions INT NOT NULL DEFAULT 0,
                    deaths INT NOT NULL DEFAULT 0,
                    avatar TEXT NULL,
                    gestational_weeks INT DEFAULT 0,
                    pregnancy_start_date DATE NULL,
                    FOREIGN KEY (user_email) REFERENCES user(email) ON DELETE CASCADE
                )
            """)
            
            # Create risk_assessment table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS risk_assessment (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_email VARCHAR(255) NOT NULL,
                    prediction VARCHAR(50) NOT NULL,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    parameters TEXT NOT NULL,
                    FOREIGN KEY (user_email) REFERENCES user(email) ON DELETE CASCADE
                )
            """)
            
            # Create asha_worker table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS asha_worker (
                    email VARCHAR(255) PRIMARY KEY,
                    worker_id VARCHAR(50) UNIQUE NOT NULL,
                    assigned_villages TEXT NULL,
                    qualification VARCHAR(255) NULL,
                    joining_date DATE NULL,
                    employee_status VARCHAR(50) NULL,
                    supervisor VARCHAR(255) NULL,
                    government_id VARCHAR(100) NULL,
                    FOREIGN KEY (email) REFERENCES user(email) ON DELETE CASCADE
                )
            """)
            
            # Create pregnancy_record table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS pregnancy_record (
                    patient_id VARCHAR(50) PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    phone_no VARCHAR(50) NULL,
                    village VARCHAR(255) NOT NULL,
                    age_years INT NOT NULL,
                    gravida_G INT NOT NULL,
                    para_P INT NOT NULL,
                    live_child_L INT NOT NULL,
                    abortion_A INT NOT NULL,
                    death_D INT NOT NULL,
                    gestational_age_weeks FLOAT NOT NULL,
                    trimester INT NOT NULL,
                    systolic_bp_mmHg FLOAT NOT NULL,
                    diastolic_bp_mmHg FLOAT NOT NULL,
                    random_blood_sugar_mg_dL FLOAT NOT NULL,
                    body_temperature_F FLOAT NOT NULL,
                    heart_rate_bpm FLOAT NOT NULL,
                    hemoglobin_g_dL FLOAT NOT NULL,
                    hba1c_percent FLOAT NOT NULL,
                    respiratory_rate_bpm FLOAT NOT NULL,
                    bmi FLOAT NOT NULL,
                    spo2_percent FLOAT NOT NULL,
                    edema_severity VARCHAR(50) NULL,
                    symptoms_score_0_10 FLOAT NOT NULL,
                    risk_class VARCHAR(50) NOT NULL,
                    risk_reasons TEXT NULL,
                    assigned_asha_email VARCHAR(255) NULL,
                    anc_visits INT NOT NULL DEFAULT 0,
                    visit_status VARCHAR(50) NOT NULL DEFAULT 'Pending',
                    next_visit_date DATE NULL,
                    referral_status VARCHAR(50) NOT NULL DEFAULT 'Not Referred',
                    due_date DATE NULL,
                    FOREIGN KEY (assigned_asha_email) REFERENCES user(email) ON DELETE SET NULL
                )
            """)
            
            # Create visit_log table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS visit_log (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    patient_id VARCHAR(50) NOT NULL,
                    visit_date DATE NOT NULL,
                    visit_time TIME NOT NULL,
                    visit_status VARCHAR(50) NOT NULL,
                    remarks TEXT NULL,
                    FOREIGN KEY (patient_id) REFERENCES pregnancy_record(patient_id) ON DELETE CASCADE
                )
            """)
            
            # Create referral_log table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS referral_log (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    patient_id VARCHAR(50) NOT NULL,
                    referred VARCHAR(50) NOT NULL DEFAULT 'Not Referred',
                    referral_date DATE NULL,
                    hospital_name VARCHAR(255) NULL,
                    doctor VARCHAR(255) NULL,
                    referral_status VARCHAR(50) NULL,
                    remarks TEXT NULL,
                    FOREIGN KEY (patient_id) REFERENCES pregnancy_record(patient_id) ON DELETE CASCADE
                )
            """)
            
            # Create admin table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS admin (
                    email VARCHAR(255) PRIMARY KEY,
                    admin_id VARCHAR(50) UNIQUE NOT NULL,
                    name VARCHAR(255) NOT NULL,
                    phone_no VARCHAR(50) NULL,
                    department VARCHAR(255) NULL,
                    designation VARCHAR(255) NULL,
                    government_id VARCHAR(100) NULL,
                    joining_date DATE NULL,
                    FOREIGN KEY (email) REFERENCES user(email) ON DELETE CASCADE
                )
            """)
            
            # Migration check: add gestational_weeks and pregnancy_start_date if not present
            try:
                cursor.execute("ALTER TABLE mother_profile ADD COLUMN gestational_weeks INT DEFAULT 0")
                conn.commit()
            except Exception:
                pass
            try:
                cursor.execute("ALTER TABLE mother_profile ADD COLUMN pregnancy_start_date DATE NULL")
                conn.commit()
            except Exception:
                pass

            conn.commit()
            
            # Seed the database
            try:
                from seeder import seed_database
                seed_database(conn, is_sqlite=True)
            except Exception as e:
                logger.warning(f"Failed to seed SQLite database: {e}")
                
            cursor.close()
            conn.close()
        except Exception as exc:
            raise DBUnavailableError(f"Failed to initialize SQLite tables: {exc}")

def get_db_connection():
    database_url = get_settings()["database_url"]
    
    if database_url and database_url.startswith("mysql"):
        db_config = parse_database_url(database_url)
        try:
            conn = pymysql.connect(
                host=db_config["host"],
                user=db_config["user"],
                password=db_config["password"],
                port=db_config["port"],
                database=db_config["database"],
                cursorclass=pymysql.cursors.DictCursor
            )
            return DBConnection(conn, is_sqlite=False)
        except Exception as exc:
            raise DBUnavailableError(f"Failed to connect to MySQL: {exc}")
    else:
        try:
            db_path = os.path.join(get_settings()["backend_dir"], "matricare.db")
            conn = sqlite3.connect(db_path)
            conn.row_factory = dict_factory
            cursor = conn.cursor()
            cursor.execute("PRAGMA foreign_keys = ON;")
            cursor.close()
            return DBConnection(conn, is_sqlite=True)
        except Exception as exc:
            raise DBUnavailableError(f"Failed to connect to SQLite: {exc}")