from pathlib import Path
from typing import Optional
from datetime import datetime
import pandas as pd
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
CSV_PATH = DATA_DIR / "incidents.csv"

COLUMNS = ["id", "date", "site_id", "location", "issue", "downtime_hours", "team", "status", "description"]

app = FastAPI(title="Telecom Network Analysis API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class IncidentCreate(BaseModel):
    date: str
    site_id: str = Field(min_length=2)
    location: str = ""
    issue: str
    downtime_hours: float = Field(ge=0)
    team: str
    status: str = "Resolved"
    description: str = ""

def ensure_data():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if not CSV_PATH.exists():
        sample = [
            ["INC001", "2026-10-28", "CTG001", "Agrabad", "Fiber Cut", 3, "Team A", "Resolved", "UG fiber damaged during road work"],
            ["INC002", "2026-10-28", "CTG002", "Hathazari", "Power Failure", 2, "Team B", "Resolved", "Commercial power interruption"],
            ["INC003", "2026-10-29", "CTG003", "EPZ", "Fiber Cut", 5, "Team A", "Resolved", "Excavator damaged fiber cable"],
            ["INC004", "2026-10-29", "CTG004", "Bohaddarhat", "Equipment Fault", 4, "Team C", "Resolved", "Access switch hardware issue"],
            ["INC005", "2026-10-30", "CTG005", "Sitakunda", "Power Failure", 1, "Team B", "Resolved", "Generator fuel issue"],
            ["INC006", "2026-10-30", "CTG006", "Potenga", "Fiber Cut", 6, "Team A", "Resolved", "Third-party construction damage"],
            ["INC007", "2026-10-31", "CTG007", "Jubilee Road", "Equipment Fault", 2, "Team C", "Resolved", "Optical module replacement"],
            ["INC008", "2026-10-31", "CTG008", "Tigerpass", "Fiber Cut", 3, "Team B", "Resolved", "Manhole cable damage"],
            ["INC009", "2026-11-01", "CTG009", "Chawkbazar", "Power Failure", 4, "Team A", "Open", "Awaiting permanent power restoration"],
            ["INC010", "2026-11-01", "CTG010", "Nasirabad", "Equipment Fault", 2, "Team C", "Resolved", "Device reboot and configuration check"],
        ]
        pd.DataFrame(sample, columns=COLUMNS).to_csv(CSV_PATH, index=False)

def read_data():
    ensure_data()
    df = pd.read_csv(CSV_PATH).fillna("")
    for col in COLUMNS:
        if col not in df.columns:
            df[col] = ""
    return df[COLUMNS]

def write_data(df: pd.DataFrame):
    df[COLUMNS].to_csv(CSV_PATH, index=False)

@app.get("/")
def root():
    return {"message": "Telecom Network Analysis API is running"}

@app.get("/api/incidents")
def get_incidents():
    df = read_data()
    df["downtime_hours"] = pd.to_numeric(df["downtime_hours"], errors="coerce").fillna(0)
    return df.to_dict(orient="records")

@app.post("/api/incidents")
def create_incident(item: IncidentCreate):
    df = read_data()
    next_num = 1
    existing = df["id"].astype(str).tolist()
    while f"INC{next_num:03d}" in existing:
        next_num += 1
    new_row = {
        "id": f"INC{next_num:03d}",
        **item.model_dump()
    }
    df = pd.concat([df, pd.DataFrame([new_row])], ignore_index=True)
    write_data(df)
    return new_row

@app.delete("/api/incidents/{incident_id}")
def delete_incident(incident_id: str):
    df = read_data()
    if incident_id not in df["id"].astype(str).values:
        raise HTTPException(status_code=404, detail="Incident not found")
    df = df[df["id"].astype(str) != incident_id]
    write_data(df)
    return {"message": f"{incident_id} deleted"}

@app.post("/api/incidents/upload")
async def upload_csv(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Please upload a CSV file")
    try:
        df = pd.read_csv(file.file)
        missing = [c for c in COLUMNS if c not in df.columns]
        if missing:
            raise HTTPException(status_code=400, detail=f"Missing columns: {', '.join(missing)}")
        df = df[COLUMNS]
        write_data(df)
        return {"message": "CSV uploaded successfully", "rows": len(df)}
    except pd.errors.ParserError:
        raise HTTPException(status_code=400, detail="Invalid CSV format")

@app.get("/api/health")
def health():
    ensure_data()
    return {"status": "ok", "csv_file": str(CSV_PATH)}
