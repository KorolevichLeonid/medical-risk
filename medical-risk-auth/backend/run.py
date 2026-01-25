"""
Application runner script
"""
import sys
import os

# Add the backend directory to Python path to fix relative imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import uvicorn
from app.init_db import init_database

if __name__ == "__main__":
    # Initialize database
    init_database()

    # Run the application
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )