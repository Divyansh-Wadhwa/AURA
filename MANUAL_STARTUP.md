# AURA - Manual Startup Guide

This guide shows you how to manually start all services in separate terminal windows.

---

## Prerequisites

Make sure you have installed all dependencies:

### Python Services (Perception & Decision Layers)
```bash
# Perception Layer
cd perception
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
deactivate
cd ..

# Decision Layer
cd ml-service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
deactivate
cd ..
```

### Node.js Services (Server & Client)
```bash
# Express Server
cd server
npm install
cd ..

# React Client
cd client
npm install
cd ..
```

---

## Starting Services Manually

Open **4 separate terminal windows/tabs** and run these commands:

### Terminal 1: Perception Layer (Port 5001)

```bash
cd /Users/rakshitjindal/Downloads/AURA-copy/AURA/perception
source venv/bin/activate
python -m uvicorn app.main:app --host 0.0.0.0 --port 5001
```

**Wait for:** `"All models loaded successfully"` message

---

### Terminal 2: Decision Layer (Port 8000)

```bash
cd /Users/rakshitjindal/Downloads/AURA-copy/AURA/ml-service
source venv/bin/activate
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

**Wait for:** `"Models loaded: ['confidence', 'clarity', 'empathy', 'communication']"` message

---

### Terminal 3: Express Server (Port 5002)

```bash
cd /Users/rakshitjindal/Downloads/AURA-copy/AURA/server
npm run dev
```

**Wait for:** ASCII art banner showing `"Server running on port: 5002"`

---

### Terminal 4: React Client (Port 5173)

```bash
cd /Users/rakshitjindal/Downloads/AURA-copy/AURA/client
npm run dev
```

**Wait for:** `"Local: http://localhost:5173/"` message

---

## Verify All Services Are Running

Open a new terminal and run:

```bash
# Check Perception Layer
curl http://localhost:5001/health

# Check Decision Layer
curl http://localhost:8000/health

# Check Express Server
curl http://localhost:5002/health
```

All should return healthy status.

---

## Access the Application

Open your browser and go to:

**http://localhost:5173**

---

## Stopping Services

In each terminal window, press:

```
Ctrl + C
```

Or run the stop script:

```bash
cd /Users/rakshitjindal/Downloads/AURA-copy/AURA
./stop-all.sh
```

---

## Service Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    React Client (5173)                  │
│                 http://localhost:5173                   │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Express Server (5002)                      │
│         WebSocket + REST API + MongoDB                  │
└──────────┬──────────────────────────┬───────────────────┘
           │                          │
           ▼                          ▼
┌──────────────────────┐   ┌──────────────────────────────┐
│  Perception Layer    │   │    Decision Layer            │
│  (5001)              │──▶│    (8000)                    │
│  Extract Features    │   │    ML Scoring Models         │
└──────────────────────┘   └──────────────────────────────┘
```

---

## Troubleshooting

### Port Already in Use

If you get "port already in use" errors:

```bash
# Kill processes on specific ports
lsof -ti:5001 | xargs kill -9  # Perception
lsof -ti:8000 | xargs kill -9  # Decision
lsof -ti:5002 | xargs kill -9  # Server
lsof -ti:5173 | xargs kill -9  # Client
```

### Python Virtual Environment Issues

If `source venv/bin/activate` doesn't work:

```bash
# Recreate the virtual environment
rm -rf venv
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Node.js Module Issues

If npm commands fail:

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

---

## Environment Variables

All `.env` files are already configured with:

- **Server Port:** 5002
- **MongoDB:** Atlas connection
- **Perception Service:** http://localhost:5001
- **Decision Service:** http://localhost:8000
- **Client URL:** http://localhost:5173
- **Groq API Key:** Configured for AI interviewer

No changes needed unless you want to customize.
