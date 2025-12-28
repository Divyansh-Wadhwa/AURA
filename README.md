# A.U.R.A - AI-Based Unified Response Assessment

<p align="center">
  <img src="https://img.shields.io/badge/React-18.2-61DAFB?style=for-the-badge&logo=react" alt="React"/>
  <img src="https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js" alt="Node.js"/>
  <img src="https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python" alt="Python"/>
  <img src="https://img.shields.io/badge/FastAPI-0.104-009688?style=for-the-badge&logo=fastapi" alt="FastAPI"/>
  <img src="https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb" alt="MongoDB"/>
</p>

A comprehensive AI-powered interview practice and soft-skill assessment platform that simulates real interview conversations using an AI interviewer and evaluates users objectively using a **multi-layer ML pipeline** extracting 48+ behavioral features from text, audio, and video signals.

---

## 📋 Table of Contents

- [Features](#-features)
- [System Architecture](#-system-architecture)
- [Project Structure](#-project-structure)
- [Tech Stack](#-complete-tech-stack)
- [ML Pipeline Deep Dive](#-ml-pipeline-deep-dive)
  - [Perception Layer](#1-perception-layer-feature-extraction)
  - [Decision Layer](#2-decision-layer-scoring-engine)
- [Feature Extraction Details](#-feature-extraction-details)
- [Getting Started](#-getting-started)
- [API Reference](#-api-reference)
- [Practice Modes](#-practice-modes)
- [Scoring System](#-scoring-system)

---

## 🌟 Features

| Feature | Description |
|---------|-------------|
| **🎥 Real-time Video Interviews** | WebRTC-powered video calls with AI avatar interviewer |
| **🤖 AI Interviewer** | Conversational AI (OpenRouter/Gemini) with context awareness and follow-up questions |
| **🎙️ Voice Interaction** | ElevenLabs text-to-speech for natural AI voice responses |
| **📊 48+ Behavioral Features** | Multi-modal feature extraction from text, audio, and video |
| **🧠 ML-Based Scoring** | XGBoost models trained on behavioral features for objective evaluation |
| **👁️ Body Language Detection** | MediaPipe Pose for posture, gestures, and engagement analysis |
| **😊 Facial Expression Analysis** | FER (Facial Expression Recognition) for emotion detection |
| **👀 Gaze & Eye Contact Tracking** | MediaPipe Face Mesh for attention and engagement metrics |
| **📈 Progress Tracking** | Dashboard with historical trends and analytics |
| **🔐 Auth0 Authentication** | Secure OAuth2 authentication with JWT tokens |
| **💬 Multiple Practice Modes** | Text-only, Audio-only, or Full Audio-Video modes |

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT (React + Vite)                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │   Auth0     │  │  3D Avatar  │  │   Video     │  │   Video Perception      │ │
│  │   Context   │  │  (Three.js) │  │   WebRTC    │  │   (Canvas Analysis)     │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
└────────────────────────────────────────┬────────────────────────────────────────┘
                                         │ HTTP/WebSocket
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           SERVER (Node.js + Express)                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │  Auth0 JWT  │  │  Socket.IO  │  │  LLM Service│  │   ML Service Bridge     │ │
│  │  Middleware │  │  Real-time  │  │  (OpenRouter)│  │   (Orchestrator)        │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
└──────────┬───────────────────────────────┬──────────────────────────────────────┘
           │                               │
           ▼                               ▼
┌─────────────────────┐    ┌─────────────────────────────────────────────────────┐
│   MongoDB Atlas     │    │              ML PIPELINE                             │
│  ┌───────────────┐  │    │  ┌─────────────────────┐  ┌─────────────────────┐   │
│  │ Users         │  │    │  │  PERCEPTION LAYER   │  │   DECISION LAYER    │   │
│  │ Sessions      │  │    │  │  (FastAPI :5001)    │  │   (FastAPI :8000)   │   │
│  │ Feedback      │  │    │  │                     │  │                     │   │
│  └───────────────┘  │    │  │  • Text Analysis    │  │  • XGBoost Models   │   │
└─────────────────────┘    │  │  • Audio Processing │  │  • Feature Contract │   │
                           │  │  • Video Metrics    │  │  • Score Generation │   │
                           │  └─────────────────────┘  └─────────────────────┘   │
                           └─────────────────────────────────────────────────────┘
```

### Data Flow

```
User Response → Server → Perception Layer → 48 Features → Decision Layer → 4 Scores → Feedback
     │              │           │                              │
     │              │           ├── Text (27 features)         ├── Confidence (0-100)
     │              │           ├── Audio (14 features)        ├── Clarity (0-100)
     │              │           └── Video (7 features)         ├── Empathy (0-100)
     │              │                                          └── Communication (0-100)
     │              │
     │              └── LLM (OpenRouter) → AI Response → ElevenLabs TTS → Audio
     │
     └── Video Metrics (Frontend) ─────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
AURA/
├── client/                      # 🖥️ Frontend (React + Vite + Tailwind)
│   ├── src/
│   │   ├── components/
│   │   │   ├── Avatar/          # 3D AI Avatar (Three.js + React Three Fiber)
│   │   │   ├── Chat/            # Chat interface components
│   │   │   ├── Video/           # Video call components
│   │   │   ├── Session/         # Interview session UI
│   │   │   ├── Feedback/        # Score display components
│   │   │   └── common/          # Shared UI components
│   │   ├── context/
│   │   │   ├── AuthContext.jsx  # Auth0 authentication state
│   │   │   └── SessionContext.jsx # Interview session state
│   │   ├── hooks/
│   │   │   ├── useVideoPerception.js  # 📹 Client-side video analysis
│   │   │   └── useAvatarController.js # Avatar animation control
│   │   ├── pages/               # Route pages (Dashboard, Interview, Feedback)
│   │   └── services/
│   │       ├── api.js           # Axios API client with Auth0 interceptor
│   │       └── socket.js        # Socket.IO client
│   └── public/
│
├── server/                      # ⚙️ Backend (Node.js + Express)
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js            # MongoDB connection
│   │   │   └── env.js           # Environment configuration
│   │   ├── middleware/
│   │   │   ├── auth0.middleware.js  # Auth0 JWT validation
│   │   │   └── error.middleware.js  # Global error handler
│   │   ├── models/
│   │   │   ├── User.js          # User schema
│   │   │   ├── Session.js       # Interview session schema
│   │   │   └── Feedback.js      # Feedback/scores schema
│   │   ├── routes/
│   │   │   ├── auth.routes.js   # Authentication endpoints
│   │   │   ├── session.routes.js # Session management
│   │   │   └── feedback.routes.js # Feedback retrieval
│   │   ├── services/
│   │   │   ├── llm.service.js   # OpenRouter/Gemini AI integration
│   │   │   ├── ml.service.js    # ML pipeline orchestration
│   │   │   └── speech.service.js # ElevenLabs TTS
│   │   └── sockets/             # Socket.IO event handlers
│   └── uploads/                 # Audio file storage
│
├── perception/                  # 🧠 Perception Layer (Python + FastAPI)
│   ├── app/
│   │   ├── main.py              # FastAPI application
│   │   ├── perception/
│   │   │   ├── text_perception.py   # 📝 Text feature extraction (27 metrics)
│   │   │   ├── video_perception.py  # 📹 Video feature extraction (15 metrics)
│   │   │   ├── audio_perception.py  # 🎙️ Audio feature extraction (14 metrics)
│   │   │   ├── semantic_depth.py    # Semantic analysis
│   │   │   ├── llm_semantic.py      # LLM-assisted analysis
│   │   │   └── lexicons/            # Word lists for linguistic analysis
│   │   ├── models/
│   │   │   └── loader.py        # ML model loading (sentence-transformers)
│   │   └── routes/
│   │       └── analyze.py       # /analyze/text, /analyze/video endpoints
│   └── requirements.txt
│
├── ml-service/                  # 🎯 Decision Layer (Python + FastAPI)
│   ├── app/
│   │   ├── main.py              # FastAPI application
│   │   ├── decision/
│   │   │   ├── scoring.py       # XGBoost model scoring
│   │   │   ├── feature_contract.py  # 📋 Frozen feature definitions (48 features)
│   │   │   └── feature_schema.py    # Feature validation
│   │   └── models/
│   │       ├── confidence_model.pkl # Trained XGBoost model
│   │       ├── clarity_model.pkl
│   │       ├── empathy_model.pkl
│   │       ├── communication_model.pkl
│   │       └── feature_importance.json
│   └── requirements.txt
│
├── start-all.sh                 # 🚀 Start all services
├── stop-all.sh                  # 🛑 Stop all services
└── MANUAL_STARTUP.md            # Manual startup instructions
```

---

## 🛠️ Complete Tech Stack

### Frontend (`client/`)

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 18.2 | UI framework |
| **Vite** | 5.0 | Build tool & dev server |
| **Tailwind CSS** | 3.4 | Utility-first styling |
| **React Router** | 6.21 | Client-side routing |
| **Auth0 React SDK** | 2.11 | Authentication |
| **Socket.IO Client** | 4.6 | Real-time communication |
| **Three.js** | 0.182 | 3D graphics |
| **React Three Fiber** | 8.15 | React renderer for Three.js |
| **React Three Drei** | 9.88 | Three.js helpers |
| **Chart.js** | 4.4 | Data visualization |
| **Axios** | 1.6 | HTTP client |
| **Lucide React** | 0.294 | Icon library |

### Backend (`server/`)

| Technology | Version | Purpose |
|------------|---------|---------|
| **Node.js** | 18+ | Runtime |
| **Express** | 4.18 | Web framework |
| **Socket.IO** | 4.6 | WebSocket server |
| **Mongoose** | 8.0 | MongoDB ODM |
| **express-oauth2-jwt-bearer** | 1.7 | Auth0 JWT validation |
| **OpenAI SDK** | 4.20 | OpenRouter API client |
| **Groq SDK** | 0.37 | Groq API client |
| **ElevenLabs** | 1.59 | Text-to-speech |
| **Multer** | 1.4 | File uploads |

### Perception Layer (`perception/`)

| Technology | Version | Purpose |
|------------|---------|---------|
| **FastAPI** | 0.104 | API framework |
| **Uvicorn** | 0.24 | ASGI server |
| **Sentence Transformers** | 2.2 | Text embeddings |
| **Transformers** | 4.36 | NLP models |
| **PyTorch** | 2.2+ | Deep learning |
| **MediaPipe** | 0.10+ | Face mesh & pose detection |
| **FER** | 22.5 | Facial expression recognition |
| **OpenCV** | 4.8+ | Image processing |
| **Librosa** | 0.10 | Audio analysis |
| **NLTK** | 3.8 | Natural language processing |
| **TextBlob** | 0.17 | Sentiment analysis |

### Decision Layer (`ml-service/`)

| Technology | Version | Purpose |
|------------|---------|---------|
| **FastAPI** | 0.109 | API framework |
| **scikit-learn** | 1.4 | ML models (XGBoost) |
| **NumPy** | 1.26 | Numerical computing |
| **Pandas** | 2.1 | Data manipulation |
| **Joblib** | 1.3 | Model serialization |

### Database & Auth

| Technology | Purpose |
|------------|---------|
| **MongoDB Atlas** | Cloud database |
| **Auth0** | OAuth2 authentication |

---

## 🧠 ML Pipeline Deep Dive

### 1. Perception Layer (Feature Extraction)

The Perception Layer extracts **raw behavioral features** from multimodal signals without making judgments. It runs on **port 5001**.

#### Text Perception (`text_perception.py`)

Extracts **27 text features** from user responses:

| Category | Features | Description |
|----------|----------|-------------|
| **Semantic** | `semantic_relevance_mean`, `semantic_relevance_std`, `topic_drift_ratio` | How well responses stay on topic |
| **Linguistic** | `avg_sentence_length`, `sentence_length_std`, `avg_response_length_sec`, `response_length_consistency` | Response structure patterns |
| **Confidence** | `assertive_phrase_ratio`, `modal_verb_ratio`, `hedge_ratio`, `filler_word_ratio`, `vague_phrase_ratio` | Language confidence indicators |
| **Semantic Depth** | `information_density`, `specificity_score`, `redundancy_score`, `answer_depth_score` | Content quality metrics |
| **LLM-Assisted** | `llm_confidence_mean`, `llm_clarity_mean`, `llm_depth_mean`, `llm_empathy_mean`, `llm_evasion_mean` | AI-inferred semantic qualities |
| **Empathy** | `empathy_phrase_ratio`, `reflective_response_ratio`, `question_back_ratio` | Emotional intelligence signals |
| **Sentiment** | `avg_sentiment`, `sentiment_variance`, `negative_spike_count` | Emotional tone analysis |

#### Video Perception (`video_perception.py`)

Extracts **15 video features** using MediaPipe:

| Category | Features | Description |
|----------|----------|-------------|
| **Gaze & Attention** | `eye_contact_ratio`, `gaze_variance`, `head_turn_frequency` | Where the user is looking |
| **Facial Expression** | `expression_variance`, `smile_ratio`, `neutral_face_ratio`, `emotion_mismatch_score` | Emotional expressions |
| **Body Language** | `body_detected_ratio`, `shoulder_openness`, `gesture_frequency`, `posture_stability`, `forward_lean`, `hand_to_face_ratio`, `arm_cross_ratio`, `gesture_amplitude` | Posture and gestures |

**Technologies Used:**
- **MediaPipe Face Mesh** - 468 facial landmarks + iris tracking
- **MediaPipe Pose** - 33 body landmarks for posture analysis
- **FER (Facial Expression Recognition)** - 7 emotion classifications

#### Audio Perception (`audio_perception.py`)

Extracts **14 audio features** using Librosa:

| Category | Features | Description |
|----------|----------|-------------|
| **Speech Rate** | `speech_rate_wpm`, `speech_rate_variance` | Speaking pace |
| **Pauses** | `mean_pause_duration`, `pause_frequency`, `silence_ratio` | Hesitation patterns |
| **Prosody** | `pitch_mean`, `pitch_variance`, `energy_mean`, `energy_variance`, `monotony_score` | Voice characteristics |
| **Emotion** | `audio_confidence_prob`, `audio_nervous_prob`, `audio_calm_prob`, `emotion_consistency` | Vocal emotion signals |

---

### 2. Decision Layer (Scoring Engine)

The Decision Layer takes the **48 features** from Perception and produces **4 skill scores**. It runs on **port 8000**.

#### Feature Contract (`feature_contract.py`)

Defines the **frozen feature order** that models were trained on:

```python
ALL_FEATURES = TEXT_FEATURES (27) + AUDIO_FEATURES (14) + VIDEO_FEATURES (7)
# Total: 48 features

TARGET_LABELS = ["confidence", "clarity", "empathy", "communication"]
```

#### Scoring Process (`scoring.py`)

1. **Feature Vector Construction** - Builds 48-dimensional vector with defaults for missing features
2. **Model Prediction** - XGBoost models predict each skill score (0-100)
3. **Low Feature Detection** - Identifies features below threshold for feedback
4. **Improvement Suggestions** - Maps low features to actionable advice

```python
# Example output
{
    "confidence": 74,
    "clarity": 68,
    "empathy": 81,
    "communication": 72,
    "low_features": ["silence_ratio", "topic_drift_ratio"],
    "improvement_suggestions": [...]
}
```

---

## 📊 Feature Extraction Details

### Client-Side Video Analysis (`useVideoPerception.js`)

The frontend performs **lightweight video analysis** using canvas-based pixel analysis:

```javascript
// Extracted metrics (sent to server with session end)
{
  video_available: 1,
  face_presence_ratio: 0.95,      // % frames with face detected
  eye_contact_ratio: 0.82,        // % frames looking at camera
  head_motion_variance: 0.03,     // Movement stability
  facial_engagement_score: 0.65,  // Activity level
  body_detected_ratio: 0.90,      // % frames with body visible
  shoulder_openness: 0.72,        // Posture openness (0-1)
  gesture_frequency: 2.5,         // Gestures per second
  posture_stability: 0.88,        // Steadiness (0-1)
  gesture_amplitude: 0.35         // Gesture size (0-1)
}
```

### Server-Side Feature Logging

The server logs all extracted features in categorized sections:

```
╔═══════════════════════════════════════════════════════════╗
║              TEXT FEATURES (27 metrics)                   ║
╚═══════════════════════════════════════════════════════════╝
  Semantic Metrics:
    semantic_relevance_mean: 0.7500
    ...
  Linguistic Metrics:
    avg_sentence_length: 15.0000
    ...

╔═══════════════════════════════════════════════════════════╗
║              VIDEO FEATURES (11 metrics)                  ║
╚═══════════════════════════════════════════════════════════╝
  Face & Gaze Metrics:
    face_presence_ratio: 0.9500
    eye_contact_ratio: 0.8200
    ...
  Body Language Metrics:
    body_detected_ratio: 0.9000
    shoulder_openness: 0.7200
    gesture_frequency: 2.5000
    ...
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+
- **Python** 3.10+
- **MongoDB Atlas** account
- **Auth0** account
- **OpenRouter** API key (or OpenAI/Groq)
- **ElevenLabs** API key (optional, for TTS)

### Quick Start (All Services)

```bash
# Clone and navigate
cd AURA

# Start all services (recommended)
./start-all.sh

# Or start manually (see MANUAL_STARTUP.md)
```

### Manual Setup

#### 1. Backend Server

```bash
cd server
npm install
cp .env.example .env
# Edit .env with your credentials
npm run dev
```

**Required Environment Variables:**
```env
PORT=5002
MONGODB_URI=mongodb+srv://...
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_AUDIENCE=https://my-api
OPENROUTER_API_KEY=sk-or-...
ELEVENLABS_API_KEY=...
PERCEPTION_SERVICE_URL=http://localhost:5001
DECISION_SERVICE_URL=http://localhost:8000
```

#### 2. Frontend Client

```bash
cd client
npm install
cp .env.example .env
# Edit .env with Auth0 credentials
npm run dev
```

**Required Environment Variables:**
```env
VITE_API_URL=http://localhost:5002/api
VITE_SOCKET_URL=http://localhost:5002
VITE_AUTH0_DOMAIN=your-tenant.auth0.com
VITE_AUTH0_CLIENT_ID=your-client-id
VITE_AUTH0_AUDIENCE=https://my-api
```

#### 3. Perception Layer

```bash
cd perception
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 5001 --reload
```

#### 4. Decision Layer

```bash
cd ml-service
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Service URLs

| Service | URL | Health Check |
|---------|-----|--------------|
| Frontend | http://localhost:5173 | - |
| Backend | http://localhost:5002 | `/health` |
| Perception | http://localhost:5001 | `/health` |
| Decision | http://localhost:8000 | `/health` |

---

## 📝 API Reference

### Authentication (Auth0)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/sync` | POST | Sync Auth0 user to database |
| `/api/auth/me` | GET | Get current user profile |

### Sessions

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/session/start` | POST | Start new interview session |
| `/api/session/:id/message` | POST | Send message to AI |
| `/api/session/:id/audio` | POST | Send audio message |
| `/api/session/:id/end` | POST | End session (triggers ML analysis) |
| `/api/session/list` | GET | Get user's sessions |
| `/api/session/stats` | GET | Get user statistics |

### Feedback

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/feedback/:sessionId` | GET | Get session feedback & scores |
| `/api/feedback/trends` | GET | Get progress trends |

### ML Services

#### Perception Layer (`:5001`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/analyze/text` | POST | Extract text features |
| `/analyze/video` | POST | Extract video features |
| `/health` | GET | Service health check |

#### Decision Layer (`:8000`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/score` | POST | Score features → 4 skill scores |
| `/health` | GET | Service health check |

---

## 📱 Practice Modes

| Mode | Description | Features Extracted |
|------|-------------|-------------------|
| **Text Only** | Chat-based interview | Text features (27) |
| **Audio Only** | Voice-based interview | Text (27) + Audio (14) |
| **Audio & Video** | Full video call | Text (27) + Audio (14) + Video (7) |

---

## 📊 Scoring System

### Output Scores (0-100)

| Score | Description | Key Features |
|-------|-------------|--------------|
| **Confidence** | How confidently you express thoughts | `assertive_phrase_ratio`, `hedge_ratio`, `filler_word_ratio`, `pitch_variance` |
| **Clarity** | Structure and articulation | `avg_sentence_length`, `information_density`, `speech_rate_wpm` |
| **Empathy** | Emotional intelligence | `empathy_phrase_ratio`, `reflective_response_ratio`, `avg_sentiment` |
| **Communication** | Overall effectiveness | Weighted combination of all features |

### Feedback Generation

Low-scoring features are mapped to actionable improvement suggestions:

```javascript
{
  "scores": { "confidence": 65, "clarity": 72, "empathy": 58, "communication": 68 },
  "low_features": ["hedge_ratio", "empathy_phrase_ratio"],
  "suggestions": [
    "Reduce hedging phrases like 'maybe', 'I think', 'sort of'",
    "Show more understanding by acknowledging the interviewer's points"
  ]
}
```

---

## 🔌 Socket Events

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `join-room` | `{ sessionId }` | Join interview room |
| `leave-room` | `{ sessionId }` | Leave interview room |
| `ai-speaking` | `{ speaking: boolean }` | AI speech state |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `room-joined` | `{ sessionId }` | Confirm room join |
| `ai-response` | `{ text, audioUrl }` | AI response with TTS |
| `error` | `{ message }` | Error notification |

---

## 🎯 Interview Scenarios

- **Technical Interview** - Software engineering concepts
- **Behavioral Interview** - STAR method questions
- **HR Interview** - Career goals and company fit
- **Case Study** - Business analysis scenarios
- **General Practice** - Mixed question types

---

## 📄 License

MIT License - feel free to use for hackathons, learning, and development.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

<p align="center">
  Built with ❤️ for interview practice and soft-skill development
</p>
