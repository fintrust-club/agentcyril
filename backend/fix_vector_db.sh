#!/bin/bash

# Stop any running backend server
echo "Stopping any running backend server..."
ps aux | grep 'uvicorn app.main:app' | grep -v grep | awk '{print $2}' | xargs -r kill -9
sleep 2

# Set the environment variable to use a persistent storage for ChromaDB
export CHROMA_DB_PATH="./chroma_db"

# Create the directory if it doesn't exist
mkdir -p "$CHROMA_DB_PATH"

# Run the reindexing script with the force flag
echo "Running reindexing script..."
cd backend
python reindex_vector_db.py --force

# Restart the backend server
echo "Restarting the backend server..."
nohup python -m uvicorn app.main:app --reload > backend.log 2>&1 &

echo "Done! The vector database has been fixed and the backend server restarted."
echo "Check backend.log and reindex_documents.log for details." 