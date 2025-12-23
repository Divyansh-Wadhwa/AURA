#!/bin/bash

# ╔═══════════════════════════════════════════════════════════════╗
# ║     AURA - AI-Based Unified Response Assessment               ║
# ║     Startup Script - Launches all services                    ║
# ╚═══════════════════════════════════════════════════════════════╝

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                    Starting AURA Services                     ║"
echo "╠═══════════════════════════════════════════════════════════════╣"
echo "║  1. Perception Layer  → http://localhost:5001                 ║"
echo "║  2. Decision Layer    → http://localhost:8000                 ║"
echo "║  3. Express Server    → http://localhost:5002                 ║"
echo "║  4. React Client      → http://localhost:5173                 ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Function to check if a port is in use
check_port() {
    lsof -i:$1 > /dev/null 2>&1
    return $?
}

# Kill any existing processes on our ports (except system processes)
echo "🧹 Cleaning up any existing processes..."
pkill -f "uvicorn.*5001" 2>/dev/null
pkill -f "uvicorn.*8000" 2>/dev/null
pkill -f "nodemon" 2>/dev/null
pkill -f "vite" 2>/dev/null
sleep 2

# Start Perception Layer (Terminal 1)
echo "🚀 Starting Perception Layer on port 5001..."
osascript -e "
tell application \"Terminal\"
    do script \"cd '$SCRIPT_DIR/perception' && echo '🔮 PERCEPTION LAYER' && echo '==================' && source venv/bin/activate && python -m uvicorn app.main:app --host 0.0.0.0 --port 5001\"
    set custom title of front window to \"AURA - Perception Layer (5001)\"
end tell
"

sleep 2

# Start Decision Layer (Terminal 2)
echo "🚀 Starting Decision Layer on port 8000..."
osascript -e "
tell application \"Terminal\"
    do script \"cd '$SCRIPT_DIR/ml-service' && echo '🧠 DECISION LAYER' && echo '=================' && source venv/bin/activate && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000\"
    set custom title of front window to \"AURA - Decision Layer (8000)\"
end tell
"

sleep 2

# Start Express Server (Terminal 3)
echo "🚀 Starting Express Server on port 5002..."
osascript -e "
tell application \"Terminal\"
    do script \"cd '$SCRIPT_DIR/server' && echo '⚡ EXPRESS SERVER' && echo '=================' && npm run dev\"
    set custom title of front window to \"AURA - Express Server (5002)\"
end tell
"

sleep 2

# Start React Client (Terminal 4)
echo "🚀 Starting React Client on port 5173..."
osascript -e "
tell application \"Terminal\"
    do script \"cd '$SCRIPT_DIR/client' && echo '💻 REACT CLIENT' && echo '===============' && npm run dev\"
    set custom title of front window to \"AURA - React Client (5173)\"
end tell
"

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                    ✅ All Services Starting!                  ║"
echo "╠═══════════════════════════════════════════════════════════════╣"
echo "║  Wait ~30 seconds for ML models to load, then open:           ║"
echo "║                                                               ║"
echo "║     🌐  http://localhost:5173                                 ║"
echo "║                                                               ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
echo "To stop all services, run: ./stop-all.sh"
