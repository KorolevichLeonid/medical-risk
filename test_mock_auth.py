from backend.app.core.azure_auth_mock import verify_azure_token_mock

# Test the mock authentication
def test_mock_auth():
    mock_azure_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJrb3Rsb3Zza2l5MjAwNkBtYWlsLnJ1IiwibmFtZSI6Ik5zZXZlbiBBenVyZSIsImVtYWlsIjoia290bG92c2tpeTIwMDZAbWFpbC5ydSIsIm9pZCI6InRlc3Qtb2JqZWN0LWlkLTEifQ.test"

    print("Testing mock Azure token verification...")
    try:
        result = verify_azure_token_mock(mock_azure_token)
        print("✅ Mock verification successful:")
        print(f"  Email: {result.get('email')}")
        print(f"  Object ID: {result.get('object_id')}")
        print(f"  Name: {result.get('name')}")
    except Exception as e:
        print(f"❌ Mock verification failed: {e}")

if __name__ == "__main__":
    test_mock_auth()
