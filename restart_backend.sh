#!/bin/bash

echo "=== Restarting Backend Server ==="
echo "This will restart the backend server with the changes."

# Kill any running uvicorn processes
pkill -f uvicorn

# Wait a moment for processes to terminate
sleep 2

# Start the backend server with debugging
cd backend
source venv/bin/activate
python -m app.main --debug

# Find the backend process
echo "Finding backend process..."
BACKEND_PID=$(ps aux | grep "uvicorn app.main:app" | grep -v grep | awk '{print $2}')

if [ -n "$BACKEND_PID" ]; then
  echo "Stopping backend process (PID: $BACKEND_PID)..."
  kill $BACKEND_PID
  sleep 2
  
  # Check if process is still running
  if ps -p $BACKEND_PID > /dev/null; then
    echo "Process still running, force killing..."
    kill -9 $BACKEND_PID
  fi
  
  echo "Backend process stopped."
else
  echo "No running backend process found."
fi

# Start the backend in a new terminal or background
echo "Starting backend server..."
cd backend
nohup uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 > backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend server started with PID: $BACKEND_PID"
echo "You can check the logs with: tail -f backend/backend.log"

echo "=== Backend Restart Complete ==="
echo "Wait a few seconds for the server to fully initialize before accessing." 