# A.U.R.A - AI-Based Unified Response Assessment

A local-only, MERN-based AI interview and soft-skill assessment system that simulates real interview conversations using an AI interviewer and evaluates users objectively using machine learning-based scoring.

## 🌟 Features

- **Real-time Video Interviews** - WebRTC-powered video calls
- **AI Interviewer** - Conversational AI that maintains context and asks follow-up questions
- **Multiple Practice Modes** - Text-only, Audio-only, or Audio-Video
- **Objective Scoring** - ML-based evaluation (confidence, clarity, empathy, communication)
- **Explainable Feedback** - Understand exactly what to improve
- **Progress Tracking** - Dashboard with trends and analytics

## 🏗️ Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    Frontend     │────▶│     Backend     │────▶│   ML Service    │
│  React + Vite   │     │  Node + Express │     │  Python + Fast  │
│   + Tailwind    │◀────│   + Socket.IO   │◀────│      API        │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌─────────────────┐
                        │   MongoDB Atlas │
                        └─────────────────┘
```

## 📁 Project Structure

```
AURA/
├── client/                 # Frontend (React + Vite + Tailwind)
│   ├── src/
│   │   ├── components/    # UI components
│   │   ├── pages/         # Page components
│   │   ├── context/       # React context providers
│   │   ├── hooks/         # Custom hooks
│   │   ├── services/      # API, Socket, WebRTC services
│   │   └── utils/         # Utilities and constants
│   └── public/
│
├── server/                 # Backend (Node + Express + Socket.IO)
│   ├── src/
│   │   ├── config/        # DB and environment config
│   │   ├── controllers/   # Route controllers
│   │   ├── middleware/    # Auth and error middleware
│   │   ├── models/        # Mongoose models
│   │   ├── routes/        # API routes
│   │   ├── services/      # LLM, ML, Speech services
│   │   └── sockets/       # Socket.IO handlers
│   └── uploads/           # Audio uploads (created at runtime)
│
└── ml-service/            # ML Service (to be implemented)
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- MongoDB Atlas account
- OpenAI API key (for AI interviewer)

### 1. Clone and Setup

```bash
cd AURA
```

### 2. Backend Setup

```bash
cd server

# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

Edit `.env` with your credentials:
```env
PORT=5000
NODE_ENV=development

# MongoDB Atlas - Get from MongoDB Atlas dashboard
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/aura?retryWrites=true&w=majority

# JWT Secret - Generate a random 32+ character string
JWT_SECRET=your_secure_jwt_secret_minimum_32_characters

# OpenAI API Key - Get from OpenAI dashboard
OPENAI_API_KEY=sk-your-openai-api-key

# ML Service (for later)
ML_SERVICE_URL=http://localhost:8000

# Frontend URL
CLIENT_URL=http://localhost:5173
```

Start the backend:
```bash
npm run dev
```

### 3. Frontend Setup

```bash
cd client

# Install dependencies
npm install

# Create environment file (optional - defaults work for local dev)
cp .env.example .env
```

Start the frontend:
```bash
npm run dev
```

### 4. Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000
- **Health Check**: http://localhost:5000/health

## 🔑 Required API Keys & Configuration

### MongoDB Atlas
1. Create a free account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a new cluster
3. Create a database user with read/write permissions
4. Get your connection string and replace `<username>`, `<password>`, and `<cluster>` in `.env`
5. Whitelist your IP address (or use 0.0.0.0/0 for development)

### OpenAI API Key
1. Create an account at [OpenAI](https://platform.openai.com)
2. Go to API Keys section
3. Create a new secret key
4. Add it to your `.env` as `OPENAI_API_KEY`

> **Note**: Without the OpenAI API key, the AI interviewer will use fallback responses (still functional for testing).

### JWT Secret
Generate a secure random string (minimum 32 characters):
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 📱 Practice Modes

| Mode | Description | Requirements |
|------|-------------|--------------|
| **Text Only** | Chat-based interview | None |
| **Audio Only** | Voice-based interview | Microphone permission |
| **Audio & Video** | Full video call | Camera & microphone permissions |

## 🎯 Interview Scenarios

- **Technical Interview** - Software engineering concepts
- **Behavioral Interview** - STAR method questions
- **HR Interview** - Career goals and company fit
- **Case Study** - Business analysis scenarios
- **General Practice** - Mixed question types

## 📊 Scoring Metrics

| Metric | Description |
|--------|-------------|
| **Confidence** | How confidently you express thoughts |
| **Clarity** | Structure and articulation of responses |
| **Empathy** | Emotional intelligence and understanding |
| **Communication** | Overall communication effectiveness |

## 🛠️ Tech Stack

### Frontend
- React 18 + Vite
- Tailwind CSS
- Socket.IO Client
- Chart.js
- Lucide React Icons

### Backend
- Node.js + Express
- Socket.IO
- MongoDB + Mongoose
- JWT Authentication
- OpenAI API

### Real-time Communication
- WebRTC (peer-to-peer media)
- Socket.IO (signaling)
- MediaRecorder API (audio capture)

## 📝 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Sessions
- `POST /api/session/start` - Start interview session
- `POST /api/session/:id/message` - Send message to AI
- `POST /api/session/:id/end` - End session
- `GET /api/session/list` - Get user sessions
- `GET /api/session/stats` - Get user statistics

### Feedback
- `GET /api/feedback/:id` - Get session feedback
- `GET /api/feedback/trends` - Get progress trends

## 🔌 Socket Events

### Client → Server
- `join-room` - Join interview room
- `offer` / `answer` / `ice-candidate` - WebRTC signaling
- `audio-chunk` - Stream audio data
- `leave-room` - Leave interview room

### Server → Client
- `room-joined` - Confirm room join
- `user-joined` / `user-left` - Participant updates
- `offer` / `answer` / `ice-candidate` - WebRTC signaling

## 🚧 Coming Soon (ML Service)

The ML service for objective scoring will include:
- Speech-to-text (Whisper)
- Audio feature extraction (librosa)
- Text analysis and embeddings
- Custom scoring model (XGBoost)

## 📄 License

MIT License - feel free to use for hackathons, learning, and development.

---

Built for hackathon/demo environments. Runs entirely locally without Docker or deployment pipelines.
