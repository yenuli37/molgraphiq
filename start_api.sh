#!/bin/bash
# MolGraphIQ API Startup Script
# ─────────────────────────────────────────────────────────────
# Activates the venv and starts the FastAPI server at port 8000.
# Frontend must run at localhost:5173 (CORS is pre-configured).
#
# Usage:
#   chmod +x start_api.sh
#   ./start_api.sh
# ─────────────────────────────────────────────────────────────

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
VENV_PYTHON="/Users/yenulibimanya/IIT/L6/FYP/prototype 2/backend/venv/bin/python3"
VENV_UVICORN="/Users/yenulibimanya/IIT/L6/FYP/prototype 2/backend/venv/bin/uvicorn"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  MolGraphIQ API"
echo "  Models: $SCRIPT_DIR/molgraphiq_models/"
echo "  URL:    http://localhost:8000"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd "$SCRIPT_DIR"

"$VENV_UVICORN" molgraphiq-api.main:app \
    --host 0.0.0.0 \
    --port 8000 \
    --reload \
    --reload-dir molgraphiq-api
