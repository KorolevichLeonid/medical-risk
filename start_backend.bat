@echo off
cd backend
venv\Scripts\activate.bat
pip install -r requirements.txt
python app/init_db.py
timeout /t 3 /nobreak > nul
python run.py
