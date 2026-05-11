#!/bin/bash
# One-time setup for Wind Simulator
# Run once before first ./start.sh

set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "============================================"
echo "  Wind Simulator — Setup"
echo "============================================"
echo ""

# ── 1. Check Python ──────────────────────────────
echo "[1/3] Checking Python..."
if ! command -v python3 &>/dev/null; then
    echo "ERROR: python3 not found."
    echo "  Mac:    brew install python"
    echo "  Linux:  sudo apt install python3 python3-venv"
    exit 1
fi
PYTHON_VERSION=$(python3 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
echo "Found python3 $PYTHON_VERSION"
# Require 3.8+
python3 -c "import sys; sys.exit(0 if sys.version_info >= (3,8) else 1)" || {
    echo "ERROR: Python 3.8+ required (got $PYTHON_VERSION)"
    exit 1
}

# ── 2. Check Node ─────────────────────────────────
echo "[2/3] Checking Node.js..."
if ! command -v node &>/dev/null; then
    echo "ERROR: node not found."
    echo "  Mac:    brew install node"
    echo "  Linux:  sudo apt install nodejs npm"
    echo "  Or use: https://nodejs.org"
    exit 1
fi
NODE_VERSION=$(node -v)
echo "Found node $NODE_VERSION"

if ! command -v npm &>/dev/null; then
    echo "ERROR: npm not found (should ship with Node)."
    exit 1
fi

# ── 3. Python venv + deps ─────────────────────────
echo ""
echo "[3a/3] Setting up Python virtual environment..."
if [ -d "$DIR/.venv" ]; then
    # Verify it's a valid Mac venv (not Windows-format)
    if [ ! -f "$DIR/.venv/bin/activate" ]; then
        echo "Stale/invalid .venv detected — rebuilding..."
        rm -rf "$DIR/.venv"
    else
        echo ".venv already exists, skipping creation."
    fi
fi

if [ ! -d "$DIR/.venv" ]; then
    python3 -m venv "$DIR/.venv"
    echo "Created .venv"
fi

source "$DIR/.venv/bin/activate"
echo "Installing Python dependencies..."
pip install --upgrade pip -q
pip install -r "$DIR/backend/requirements.txt"
echo "Python deps installed."

# ── 4. Node deps ──────────────────────────────────
echo ""
echo "[3b/3] Installing Node.js dependencies..."
cd "$DIR/frontend"
npm install
echo "Node deps installed."

echo ""
echo "============================================"
echo "Setup complete!"
echo ""
echo "To run the app:"
echo "  ./start.sh     — start backend + frontend"
echo "  ./kill.sh      — stop all servers"
echo ""
echo "URLs (after starting):"
echo "  Frontend:  http://localhost:5173"
echo "  Backend:   http://localhost:8000"
echo "  API docs:  http://localhost:8000/docs"
echo "============================================"
