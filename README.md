# NetPulse — Telecom Network Analysis

Starter web application for telecom O&M incident analysis.

## Stack
- Frontend: React + Vite
- Backend: FastAPI
- Data analysis/storage: Pandas + CSV
- Charts: CSS-based starter chart (can later move to Plotly/Recharts)

## Requirements
- Python 3.10+
- Node.js 18+

## 1. Run the backend

Open a terminal:

```bash
cd backend
python -m venv .venv
```

Activate the environment:

Windows PowerShell:
```powershell
.venv\Scripts\Activate.ps1
```

Windows CMD:
```bat
.venv\Scripts\activate.bat
```

Install and run:
```bash
pip install -r requirements.txt
uvicorn main:app --reload
```

Backend API: http://localhost:8000
API documentation: http://localhost:8000/docs

## 2. Run the frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL shown by Vite, normally http://localhost:5173.

## Included features
- KPI cards: incident count, total downtime, average downtime, fiber-cut count
- Issue-wise downtime chart
- Incident search
- Add and delete incidents
- Import a CSV file
- CSV persistence at `backend/data/incidents.csv`

## CSV columns
`id,date,site_id,location,issue,downtime_hours,team,status,description`

CSV upload replaces the current dataset. Keep a backup before importing.

## Important
This is a local development starter, not production-ready. CSV is suitable for a small single-user prototype. For concurrent users, audit history, authentication and stronger data integrity, migrate to a database such as PostgreSQL.
