import requests
import json

# Test the projects API
def test_projects_api():
    # First, try to authenticate with mock Azure token for an existing user
    # Using email from database: kotlovskiy2006@mail.ru
    mock_azure_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJrb3Rsb3Zza2l5MjAwNkBtYWlsLnJ1IiwibmFtZSI6Ik5zZXZlbiBBenVyZSIsImVtYWlsIjoia290bG92c2tpeTIwMDZAbWFpbC5ydSIsIm9pZCI6InRlc3Qtb2JqZWN0LWlkLTEifQ.test"

    print("🔐 Attempting authentication...")
    auth_response = requests.post('http://localhost:8000/api/auth/azure-login', json={
        'azure_token': mock_azure_token
    })

    if auth_response.status_code == 200:
        auth_data = auth_response.json()
        token = auth_data['access_token']
        print("✅ Authentication successful")

        # First try to get user info
        print("👤 Getting user info...")
        user_response = requests.get('http://localhost:8000/api/auth/me', headers={
            'Authorization': f'Bearer {token}'
        })
        print(f"User info response status: {user_response.status_code}")
        if user_response.status_code == 200:
            user_data = user_response.json()
            print(f"✅ User: {user_data.get('email')} (Role: {user_data.get('role')})")
        else:
            print(f"❌ Failed to get user info: {user_response.text}")

        # Now try to fetch projects
        print("📊 Fetching projects...")
        projects_response = requests.get('http://localhost:8000/api/projects/', headers={
            'Authorization': f'Bearer {token}'
        })

        print(f"Projects API response status: {projects_response.status_code}")
        if projects_response.status_code == 200:
            projects = projects_response.json()
            print(f"✅ Found {len(projects)} projects")
            for project in projects[:3]:  # Show first 3
                print(f"  - {project.get('name', 'Unnamed')} (ID: {project.get('id')})")
        else:
            print(f"❌ Failed to fetch projects: {projects_response.text}")

        # Try to get a specific project
        print("🔍 Trying to get project with ID 1...")
        single_project_response = requests.get('http://localhost:8000/api/projects/1', headers={
            'Authorization': f'Bearer {token}'
        })
        print(f"Single project response status: {single_project_response.status_code}")
        if single_project_response.status_code == 200:
            project_data = single_project_response.json()
            print(f"✅ Got project: {project_data.get('name')}")
        else:
            print(f"❌ Failed to get single project: {single_project_response.text}")

    else:
        print(f"❌ Authentication failed: {auth_response.status_code} - {auth_response.text}")

if __name__ == "__main__":
    test_projects_api()
