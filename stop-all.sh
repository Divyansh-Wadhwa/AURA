#!/bin/bash

# ╔═══════════════════════════════════════════════════════════════╗
# ║     AURA - Stop All Services                                  ║
# ╚═══════════════════════════════════════════════════════════════╝

echo "🛑 Stopping all AURA services..."

# Stop Python services (Perception & Decision layers)
pkill -f "uvicorn.*5001" 2>/dev/null
pkill -f "uvicorn.*8000" 2>/dev/null

# Stop Node.js services (Express server)
pkill -f "nodemon" 2>/dev/null
pkill -f "node.*server.js" 2>/dev/null

# Stop Vite (React client)
pkill -f "vite" 2>/dev/null

echo "✅ All AURA services stopped."
