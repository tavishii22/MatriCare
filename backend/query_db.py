import sqlite3
import sys
import os

def print_table(title, headers, rows):
    print(f"\n=== {title} ===")
    if not rows:
        print("  (Empty table)")
        return
        
    # Calculate column widths
    widths = [len(h) for h in headers]
    for row in rows:
        for idx, val in enumerate(row):
            val_str = str(val)
            # Truncate very long values (like raw JSON or base64) for clean display
            if len(val_str) > 40:
                val_str = val_str[:37] + "..."
            widths[idx] = max(widths[idx], len(val_str))
            
    # Format headers and row strings
    header_str = " | ".join(f"{headers[idx]:<{widths[idx]}}" for idx in range(len(headers)))
    print(header_str)
    print("-" * len(header_str))
    
    for row in rows:
        formatted_vals = []
        for idx, val in enumerate(row):
            val_str = str(val)
            if len(val_str) > 40:
                val_str = val_str[:37] + "..."
            formatted_vals.append(val_str)
            
        row_str = " | ".join(f"{formatted_vals[idx]:<{widths[idx]}}" for idx in range(len(headers)))
        print(row_str)

def main():
    # Make sure we read from the script's directory database
    db_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "matricare.db")
    if not os.path.exists(db_file):
        print(f"[-] Database file not found at: {db_file}")
        sys.exit(1)
        
    try:
        conn = sqlite3.connect(db_file)
        cursor = conn.cursor()
        
        # Query User
        cursor.execute("SELECT email, name, phone_no, address, created_at FROM user")
        user_rows = cursor.fetchall()
        print_table("USER TABLE (Accounts)", ["Email", "Name", "Phone", "Address", "Created At"], user_rows)
        
        # Query Mother Profile
        cursor.execute("SELECT user_email, dob, gravida, para, live_births, abortions, deaths FROM mother_profile")
        profile_rows = cursor.fetchall()
        print_table("MOTHER_PROFILE TABLE (Obstetric Stats)", ["User Email", "DOB", "Gravida", "Para", "Live Births", "Abortions", "Deaths"], profile_rows)
        
        # Query Risk Assessment
        cursor.execute("SELECT id, user_email, prediction, timestamp, parameters FROM risk_assessment")
        risk_rows = cursor.fetchall()
        print_table("RISK_ASSESSMENT TABLE (Vitals Logs)", ["ID", "User Email", "Prediction", "Timestamp", "Parameters (JSON)"], risk_rows)
        
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"[-] Error reading database: {e}", file=sys.stderr)

if __name__ == "__main__":
    main()
