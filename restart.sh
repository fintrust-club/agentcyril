#!/bin/bash

echo "=== Restarting Agent Ciril Application ==="

# Stop existing processes
echo "Stopping existing processes..."

# Find and stop backend
BACKEND_PID=$(ps aux | grep "uvicorn app.main:app" | grep -v grep | awk '{print $2}')
if [ -n "$BACKEND_PID" ]; then
  echo "Stopping backend process (PID: $BACKEND_PID)..."
  kill $BACKEND_PID
  sleep 2
  if ps -p $BACKEND_PID > /dev/null; then
    echo "Process still running, force killing..."
    kill -9 $BACKEND_PID
  fi
fi

# Find and stop frontend
FRONTEND_PID=$(ps aux | grep "next dev" | grep -v grep | awk '{print $2}')
if [ -n "$FRONTEND_PID" ]; then
  echo "Stopping frontend process (PID: $FRONTEND_PID)..."
  kill $FRONTEND_PID
  sleep 2
  if ps -p $FRONTEND_PID > /dev/null; then
    echo "Process still running, force killing..."
    kill -9 $FRONTEND_PID
  fi
fi

# Install dependencies
echo "Installing frontend dependencies..."
cd frontend
npm install
cd ..

# Start backend
echo "Starting backend server..."
cd backend
nohup uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 > backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend server started with PID: $!"
cd ..

# Wait for backend to initialize
echo "Waiting for backend to initialize..."
sleep 5

# Start frontend
echo "Starting frontend server..."
cd frontend
nohup npm run dev > frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend server started with PID: $!"
cd ..

echo "=== Application Restart Complete ==="
echo ""
echo "Backend is running at: http://localhost:8000"
echo "Frontend is running at: http://localhost:3000"
echo ""
echo "You can check the logs with:"
echo "- Backend: tail -f backend/backend.log"
echo "- Frontend: tail -f frontend/frontend.log"
echo ""
echo "Remember to update your Supabase schema by following the instructions in update_supabase_schema.md" 