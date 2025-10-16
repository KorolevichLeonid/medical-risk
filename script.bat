@echo off
cd backend
call venv\Scripts\activate
pip install -r requirements.txt
python -m app.init_db
timeout /t 5
python run.py
