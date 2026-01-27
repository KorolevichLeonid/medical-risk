#!/usr/bin/env bash
set -euo pipefail

echo "Initializing database..."
python -m app.init_db

echo "Starting API server..."
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
