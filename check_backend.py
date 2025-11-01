import requests
import sys

try:
    response = requests.get('http://localhost:8000/health', timeout=5)
    if response.status_code == 200:
        print("Backend is running")
        data = response.json()
        print(f"Status: {data.get('status')}")
        print(f"Database: {data.get('database')}")
    else:
        print(f"Backend returned status {response.status_code}")
except requests.exceptions.RequestException as e:
    print(f"Backend not running or not accessible: {e}")
    sys.exit(1)
