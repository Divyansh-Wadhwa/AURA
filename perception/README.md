# AURA Perception Layer

ML Intelligence Service for multimodal behavioral feature extraction.

## Overview

This service extracts explainable behavioral features from text, audio, and video signals. It produces normalized numeric metrics without making behavioral judgments - all outputs are raw classifier confidences and statistical measures suitable for downstream scoring layers.

## Features

### Text Perception
- **Semantic Analysis**: Relevance scoring, topic drift detection
- **Linguistic Patterns**: Sentence structure, assertiveness markers, hedge detection
- **Empathy Signals**: Empathy phrases, reflective responses, question patterns
- **Sentiment Analysis**: Average sentiment, variance, negative spike detection

### Audio Perception
- **Speech Timing**: Words per minute, pause analysis, silence ratio
- **Prosody**: Pitch mean/variance, energy levels, monotony scoring
- **Emotion Correlates**: Confidence, nervousness, and calm probability estimates

### Video Perception
- **Gaze Analysis**: Eye contact ratio, gaze variance
- **Head Pose**: Head turn frequency, pose estimation
- **Facial Expressions**: Smile ratio, neutral face ratio, expression variance

## Installation

```bash
cd perception

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Download NLTK data (optional, will be downloaded on first run)
python -c "import nltk; nltk.download('punkt'); nltk.download('averaged_perceptron_tagger')"
```

## Running the Service

```bash
# Development mode
python run.py

# Or with uvicorn directly
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Production mode
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

The service will be available at `http://localhost:8000`

## API Endpoints

### Health Check
```
GET /health
```

### Analyze (Combined)
```
POST /analyze
```

Request body:
```json
{
  "text": {
    "user_responses": ["I have extensive experience in project management..."],
    "interviewer_questions": ["Tell me about your experience"],
    "response_durations": [45.5]
  },
  "audio": {
    "audio_base64": "<base64 encoded audio>",
    "word_count": 150
  },
  "video": {
    "video_base64": "<base64 encoded video>",
    "fps": 30.0
  },
  "normalize": true,
  "include_raw": false
}
```

### Individual Analysis Endpoints
- `POST /analyze/text` - Text analysis only
- `POST /analyze/audio` - Audio analysis only
- `POST /analyze/video` - Video analysis only
- `POST /analyze/image` - Single image analysis

## Output Schema

All metrics are normalized to [0, 1] range using z-score normalization with predefined global statistics.

```json
{
  "text_metrics": {
    "semantic_relevance_mean": 0.75,
    "semantic_relevance_std": 0.12,
    "topic_drift_ratio": 0.15,
    "avg_sentence_length": 0.65,
    "sentence_length_std": 0.42,
    "avg_response_length_sec": 0.58,
    "response_length_consistency": 0.82,
    "assertive_phrase_ratio": 0.45,
    "modal_verb_ratio": 0.38,
    "hedge_ratio": 0.22,
    "filler_word_ratio": 0.15,
    "empathy_phrase_ratio": 0.55,
    "reflective_response_ratio": 0.32,
    "question_back_ratio": 0.48,
    "avg_sentiment": 0.68,
    "sentiment_variance": 0.25,
    "negative_spike_count": 0
  },
  "audio_metrics": {
    "speech_rate_wpm": 0.52,
    "speech_rate_variance": 0.35,
    "mean_pause_duration": 0.45,
    "pause_frequency": 0.38,
    "silence_ratio": 0.28,
    "pitch_mean": 0.55,
    "pitch_variance": 0.42,
    "energy_mean": 0.62,
    "energy_variance": 0.38,
    "monotony_score": 0.35,
    "audio_confidence_prob": 0.58,
    "audio_nervous_prob": 0.22,
    "audio_calm_prob": 0.45,
    "emotion_consistency": 0.72
  },
  "video_metrics": {
    "eye_contact_ratio": 0.78,
    "gaze_variance": 0.25,
    "head_turn_frequency": 0.32,
    "expression_variance": 0.45,
    "smile_ratio": 0.38,
    "neutral_face_ratio": 0.52,
    "emotion_mismatch_score": 0.15
  }
}
```

## Architecture

```
perception/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI application
│   ├── config.py            # Configuration settings
│   ├── schemas.py           # Pydantic models
│   ├── models/
│   │   ├── __init__.py
│   │   └── loader.py        # ML model loading (startup only)
│   ├── perception/
│   │   ├── __init__.py
│   │   ├── text_perception.py   # Text feature extraction
│   │   ├── audio_perception.py  # Audio feature extraction
│   │   └── video_perception.py  # Video feature extraction
│   ├── routes/
│   │   ├── __init__.py
│   │   └── analyze.py       # Analysis endpoints
│   └── utils/
│       ├── __init__.py
│       └── normalization.py # Feature normalization
├── requirements.txt
├── run.py
├── .env.example
└── README.md
```

## Model Loading

All ML models are loaded **once at startup** and never inside request handlers:

- **SentenceTransformer** (`all-MiniLM-L6-v2`): Text embeddings
- **Emotion Classifier** (`emotion-english-distilroberta-base`): Emotion detection
- **Sentiment Classifier** (`twitter-roberta-base-sentiment`): Sentiment analysis
- **MediaPipe Face Mesh**: Facial landmarks and gaze
- **FER**: Facial expression recognition

## Normalization

Features are normalized using z-score scaling with predefined global statistics:

```
normalized = (value - mean) / std
```

The normalized value is then scaled to [0, 1] and clipped to prevent extreme values.

Session-specific baselines can be computed at session start for more personalized normalization.

## Integration with AURA

This service is designed to be called by the main AURA Node.js server:

```javascript
const response = await fetch('http://localhost:8000/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: { user_responses: responses },
    normalize: true
  })
});

const metrics = await response.json();
```

## License

Part of the AURA project.
