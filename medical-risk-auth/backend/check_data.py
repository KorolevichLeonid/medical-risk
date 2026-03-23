#!/usr/bin/env python3
import sys
import os
sys.path.append('.')

from app.models.project import Project
from app.database import get_db

def check_hazard_checklist_data():
    db = next(get_db())
    project = db.query(Project).first()
    
    print('Project found:', project.id if project else 'None')
    if project:
        print('Hazard checklist answers:', repr(project.hazard_checklist_answers))
        print('Type:', type(project.hazard_checklist_answers))
        
        # Check if it's JSON
        if project.hazard_checklist_answers:
            try:
                import json
                data = json.loads(project.hazard_checklist_answers)
                print('Parsed JSON data:', data)
                print('Keys:', list(data.keys()) if isinstance(data, dict) else 'Not a dict')
            except Exception as e:
                print('JSON parsing error:', e)

if __name__ == '__main__':
    check_hazard_checklist_data()