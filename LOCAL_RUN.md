# Run Locally (One Command)

Open PowerShell in the repo root and run:

```powershell
cd "C:\xampp\htdocs\Smart Attendance Monitoring"
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
./run-local.ps1
```

This starts Postgres via Docker when available, plus the Node API and Vite frontend in this terminal (logs interleaved).
If Docker is not installed, make sure Postgres is running on localhost:5432.

Frontend: `http://localhost:5000`
API: `http://localhost:3001`
