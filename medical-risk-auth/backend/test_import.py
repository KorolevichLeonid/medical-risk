import sys
import os

# Add the backend directory to Python path to fix relative imports
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(backend_dir)

print("Current path:", backend_dir)
print("Files in backend:", os.listdir(backend_dir))

try:
    from app.init_db import init_database
    print('Import successful')
except Exception as e:
    print(f'Import failed: {e}')
    app_dir = os.path.join(backend_dir, 'app')
    if os.path.exists(app_dir):
        print('Available modules:', [f for f in os.listdir(app_dir) if f.endswith('.py')])
    else:
        print('App directory not found')
