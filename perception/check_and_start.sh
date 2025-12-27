#!/bin/bash

# Check if perception layer is running
echo "Checking if perception layer is running on port 8000..."

if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null ; then
    echo "✓ Perception layer is already running on port 8000"
    echo ""
    echo "Process details:"
    lsof -Pi :8000 -sTCP:LISTEN
    exit 0
else
    echo "✗ Perception layer is not running"
    echo ""
    echo "Starting perception layer..."
    cd /Volumes/T7/AURA/perception
    source venv/bin/activate
    python3 app/main_simple.py
fi
