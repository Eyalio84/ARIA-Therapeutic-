#!/bin/bash
# Start both backend (FastAPI) and frontend (Next.js) for Cloud Run
# Cloud Run provides PORT env var (default 8080)

FRONTEND_PORT="${PORT:-8080}"
BACKEND_PORT=8095

echo "Starting backend on port $BACKEND_PORT..."
cd /app
/opt/venv/bin/python3 -c "
import uvicorn
import sys
sys.path.insert(0, 'backend')
# Override the port in config before importing app
import backend.config as cfg
cfg.PORT = $BACKEND_PORT
from backend.main import app
uvicorn.run(app, host='0.0.0.0', port=$BACKEND_PORT, log_level='info')
" &

# Wait for backend to be ready
for i in $(seq 1 30); do
  if curl -sf http://localhost:$BACKEND_PORT/api/docs/list > /dev/null 2>&1; then
    echo "Backend ready."
    break
  fi
  sleep 1
done

echo "Starting frontend on port $FRONTEND_PORT..."
exec npx next start --port $FRONTEND_PORT
