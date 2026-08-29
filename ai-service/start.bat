@echo off
REM ============================================================
REM  Unfazed AI Service — Windows Startup Script
REM ============================================================
REM
REM  Prerequisites:
REM    Python 3.10+ installed and in PATH
REM    Run once: pip install -r requirements.txt
REM    Run once: python datasets/generate_synthetic_data.py
REM    Run once: python training/train_no_show.py
REM
REM  Usage:
REM    cd ai-service
REM    start.bat

cd /d "%~dp0"

IF NOT EXIST ".env" (
  echo [WARNING] .env file not found. Copy .env.example to .env and set AI_SERVICE_API_KEY.
  echo Creating .env from .env.example...
  copy .env.example .env
)

echo.
echo  Starting Unfazed AI Service on http://localhost:8001
echo  Docs available at http://localhost:8001/docs
echo.

python -m uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload
