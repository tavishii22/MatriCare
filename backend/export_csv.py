import sqlite3
import pymysql
import csv
import os
from config import get_settings
from db import parse_database_url

def export_table_to_csv(conn, is_sqlite, table_name, csv_filename):
    try:
        cursor = conn.cursor()
        cursor.execute(f"SELECT * FROM {table_name}")
        rows = cursor.fetchall()
        
        # Get column headers
        headers = [col[0] for col in cursor.description]
        
        with open(csv_filename, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(headers)
            writer.writerows(rows)
            
        print(f"[+] Successfully exported '{table_name}' table to '{csv_filename}'")
        cursor.close()
    except Exception as e:
        print(f"[-] Error exporting table '{table_name}': {e}")

def main():
    settings = get_settings()
    db_url = settings.get("database_url", "")
    script_dir = settings.get("backend_dir")
    
    conn = None
    is_sqlite = True
    
    if db_url and db_url.startswith("mysql"):
        db_config = parse_database_url(db_url)
        print(f"[*] Connecting to MySQL database '{db_config['database']}' to export CSVs...")
        try:
            conn = pymysql.connect(
                host=db_config["host"],
                user=db_config["user"],
                password=db_config["password"],
                port=db_config["port"],
                database=db_config["database"]
            )
            is_sqlite = False
        except Exception as e:
            print(f"[-] Failed to connect to MySQL: {e}")
            return
    else:
        db_file = os.path.join(script_dir, "matricare.db")
        print(f"[*] Connecting to SQLite database '{db_file}' to export CSVs...")
        if not os.path.exists(db_file):
            print(f"[-] Database file not found at: {db_file}")
            return
        try:
            conn = sqlite3.connect(db_file)
        except Exception as e:
            print(f"[-] Failed to connect to SQLite: {e}")
            return
            
    # Export all three tables to CSV files in the script's directory
    export_table_to_csv(conn, is_sqlite, "user", os.path.join(script_dir, "users_dataset.csv"))
    export_table_to_csv(conn, is_sqlite, "mother_profile", os.path.join(script_dir, "mother_profile_dataset.csv"))
    export_table_to_csv(conn, is_sqlite, "risk_assessment", os.path.join(script_dir, "vitals_risk_assessment_dataset.csv"))
    
    conn.close()
    print("\n[!] All exports complete. You can open these CSV files in Excel or any CSV editor!")

if __name__ == "__main__":
    main()
