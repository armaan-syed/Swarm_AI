import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

def diagnose():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not url or not key:
        print("ERROR: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing from .env")
        return

    try:
        supabase: Client = create_client(url, key)
        print("Connected to Supabase")
        
        tables = ["companies", "company_documents", "circulars", "impact_reports", "departments"]
        
        for table in tables:
            try:
                res = supabase.table(table).select("*").limit(1).execute()
                print(f"Table '{table}' exists.")
                if table == "impact_reports" and len(res.data) > 0:
                    print(f"Columns in impact_reports: {list(res.data[0].keys())}")
            except Exception as e:
                print(f"Table '{table}' ERROR: {e}")

    except Exception as e:
        print(f"Connection failed: {e}")

if __name__ == "__main__":
    diagnose()
