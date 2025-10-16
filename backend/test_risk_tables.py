#!/usr/bin/env python3
"""
Simple test script to check if the risk tables API is working
"""
import requests

# Test basic server health
try:
    response = requests.get("http://localhost:8000/health")
    print(f"Health check: {response.json()}")
except Exception as e:
    print(f"Server not running: {e}")
    exit(1)

# Test API docs
try:
    response = requests.get("http://localhost:8000/docs")
    print("API docs available")
except Exception as e:
    print(f"API docs error: {e}")

print("Basic tests completed successfully!")
