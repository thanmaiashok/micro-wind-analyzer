#!/bin/bash

echo "Starting Wind Simulator..."
echo ""

# Get the script directory
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Start Backend
echo "[1/2] Starting Backend (FastAPI on port 8000)..."
cd "$DIR/backend"

# Ensure virtual environment is activated if it exists, otherwise just run python3
# Detect venv type: Mac uses bin/activate, Windows uses Scripts/activate
if [ -f "$DIR/.venv/bin/activate" ]; then
    # Proper Mac venv - activate directly
    source "$DIR/.venv/bin/activate"
    echo "Using virtual environment: $DIR/.venv"
elif [ -f "$DIR/.venv/Scripts/activate" ]; then
    # Windows-format venv detected - must rebuild it for Mac
    echo "⚠️  Windows-format .venv detected. Rebuilding for Mac..."
    rm -rf "$DIR/.venv"
    python3 -m venv "$DIR/.venv"
    source "$DIR/.venv/bin/activate"
    echo "Installing dependencies..."
    pip install -r "$DIR/backend/requirements.txt" -q && echo "✅ Dependencies installed."
elif [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
    echo "Using virtual environment: backend/venv"
else
    echo "No virtual environment found — creating one now..."
    python3 -m venv "$DIR/.venv"
    source "$DIR/.venv/bin/activate"
    pip install -r "$DIR/backend/requirements.txt" -q && echo "✅ Dependencies installed."
fi

# Start backend in the background
nohup python3 main.py > backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > backend.pid
echo "Backend started with PID $BACKEND_PID (logs in backend/backend.log)"

# Wait a few seconds for backend to initialize
sleep 3

# Start Frontend
echo "[2/2] Starting Frontend (Vite on port 5173)..."
cd "$DIR/frontend"

# Start frontend in the background
nohup npm run dev > frontend.log 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > frontend.pid
echo "Frontend started with PID $FRONTEND_PID (logs in frontend/frontend.log)"

echo ""
echo "============================================"
echo "Wind Simulator is starting in the background!"
echo ""
echo "Backend:  http://localhost:8000"
echo "Frontend: http://localhost:5173"
echo "API Docs: http://localhost:8000/docs"
echo "============================================"
echo ""
echo "Waiting for servers to start (this may take a few seconds)..."
sleep 5

# Detect the actual port Vite is using (it may shift if 5173/5174 are busy)
FRONTEND_PORT=5173
for PORT in 5173 5174 5175 5176 5177; do
    if lsof -i ":$PORT" -sTCP:LISTEN -t &>/dev/null; then
        FRONTEND_PORT=$PORT
        break
    fi
done

echo "Opening browser at http://localhost:$FRONTEND_PORT..."
open "http://localhost:$FRONTEND_PORT"

echo ""
echo "Run ./kill.sh to stop the background servers."
