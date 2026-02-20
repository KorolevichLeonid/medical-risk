#!/usr/bin/env bash
set -euo pipefail

echo "=== Starting Medical Risk Backend ==="

echo "Step 1: Initializing database schema and migrations..."
# This will also call init_permissions() internally
python -m app.init_db

echo "Step 2: Ensuring permissions are up to date..."
# Double-check permissions initialization (idempotent operation)
python init_permissions.py || {
    echo "Warning: Standalone init_permissions.py failed, but continuing..."
    echo "Note: Permissions should have been initialized in Step 1"
}

echo "Step 3: Starting API server on port ${PORT:-8000}..."
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
