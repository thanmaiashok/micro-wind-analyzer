#!/bin/bash

echo "Stopping Wind Simulator..."
echo ""

# Get the script directory
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Kill Frontend
echo "[1/2] Stopping Frontend..."
if [ -f "$DIR/frontend/frontend.pid" ]; then
    PID=$(cat "$DIR/frontend/frontend.pid")
    if ps -p $PID > /dev/null; then
        kill $PID
        echo "Frontend (PID $PID) stopped."
    else
        echo "Frontend process not found (already stopped?)."
    fi
    rm "$DIR/frontend/frontend.pid"
else
    # Fallback just in case
    pkill -f "vite" && echo "Vite processes killed." || echo "Frontend was not running."
fi

# Kill Backend
echo "[2/2] Stopping Backend..."
if [ -f "$DIR/backend/backend.pid" ]; then
    PID=$(cat "$DIR/backend/backend.pid")
    if ps -p $PID > /dev/null; then
        kill $PID
        echo "Backend (PID $PID) stopped."
    else
        echo "Backend process not found (already stopped?)."
    fi
    rm "$DIR/backend/backend.pid"
else
    # Fallback just in case
    pkill -f "python3 main.py" && echo "Python backend processes killed." || echo "Backend was not running."
fi

echo ""
echo "All processes stopped."
