"""
AURA Perception Layer - FastAPI Application
ML Intelligence Service for multimodal behavioral feature extraction.

All models are loaded once at startup and never inside request handlers.
"""

import logging
import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.models.loader import model_registry
from app.routes.analyze import router as analyze_router
from app.schemas import HealthResponse

# Configure logging
logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan handler.
    Loads all ML models at startup before handling any requests.
    """
    logger.info("Starting AURA Perception Layer...")
    logger.info("Loading ML models at startup...")
    
    start_time = time.time()
    
    try:
        # Load all models once at startup
        model_registry.load_all_models()
        load_time = time.time() - start_time
        logger.info(f"All models loaded in {load_time:.2f} seconds")
        
        # Download NLTK data if needed
        try:
            import nltk
            nltk.download('punkt', quiet=True)
            nltk.download('averaged_perceptron_tagger', quiet=True)
        except Exception as e:
            logger.warning(f"NLTK download warning: {e}")
        
    except Exception as e:
        logger.error(f"Failed to load models: {e}")
        raise
    
    yield
    
    # Cleanup on shutdown
    logger.info("Shutting down AURA Perception Layer...")


# Create FastAPI application
app = FastAPI(
    title=settings.app_name,
    description="""
    ML Intelligence Service for A.U.R.A - AI-Based Unified Response Assessment.
    
    Extracts explainable behavioral features from text, audio, and video signals.
    Produces normalized numeric metrics without making behavioral judgments.
    
    ## Features
    - **Text Perception**: Semantic relevance, linguistic patterns, sentiment
    - **Audio Perception**: Speech rate, prosody, emotional correlates
    - **Video Perception**: Gaze, head pose, facial expressions
    
    All metrics are normalized using z-score or min-max scaling.
    """,
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all incoming requests."""
    start_time = time.time()
    
    response = await call_next(request)
    
    process_time = time.time() - start_time
    logger.debug(
        f"{request.method} {request.url.path} - "
        f"Status: {response.status_code} - "
        f"Time: {process_time:.3f}s"
    )
    
    return response


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler."""
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "error": str(exc)}
    )


# Include routers
app.include_router(analyze_router)


@app.get("/", response_model=dict)
async def root():
    """Root endpoint with service information."""
    return {
        "service": settings.app_name,
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "analyze": "/analyze",
            "analyze_text": "/analyze/text",
            "analyze_audio": "/analyze/audio",
            "analyze_video": "/analyze/video",
            "analyze_image": "/analyze/image",
            "health": "/health"
        }
    }


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    models_loaded = (
        model_registry.sentence_transformer is not None and
        model_registry.emotion_classifier is not None and
        model_registry.sentiment_classifier is not None
    )
    
    return HealthResponse(
        status="healthy" if models_loaded else "degraded",
        models_loaded=models_loaded,
        version="1.0.0"
    )


@app.get("/analyze")
async def analyze_get():
    """
    GET endpoint returns dummy JSON to confirm service is alive.
    Use POST for actual analysis.
    """
    return {
        "status": "alive",
        "message": "Perception Layer is running. Use POST /analyze for analysis.",
        "expected_input": {
            "text": {
                "user_responses": ["list of user text responses"],
                "interviewer_questions": ["optional list of questions"],
                "response_durations": ["optional list of durations in seconds"]
            },
            "audio": {
                "audio_base64": "base64 encoded audio data",
                "word_count": "optional word count",
                "sample_rate": "optional sample rate"
            },
            "video": {
                "video_base64": "base64 encoded video data",
                "fps": "optional frames per second"
            },
            "normalize": True,
            "include_raw": False
        },
        "output_schema": {
            "text_metrics": {
                "semantic_relevance_mean": "float [0,1]",
                "semantic_relevance_std": "float [0,1]",
                "topic_drift_ratio": "float [0,1]",
                "avg_sentence_length": "float",
                "sentence_length_std": "float",
                "avg_response_length_sec": "float",
                "response_length_consistency": "float [0,1]",
                "assertive_phrase_ratio": "float [0,1]",
                "modal_verb_ratio": "float [0,1]",
                "hedge_ratio": "float [0,1]",
                "filler_word_ratio": "float [0,1]",
                "empathy_phrase_ratio": "float [0,1]",
                "reflective_response_ratio": "float [0,1]",
                "question_back_ratio": "float [0,1]",
                "avg_sentiment": "float [-1,1]",
                "sentiment_variance": "float",
                "negative_spike_count": "int"
            },
            "audio_metrics": {
                "speech_rate_wpm": "float",
                "speech_rate_variance": "float",
                "mean_pause_duration": "float",
                "pause_frequency": "float",
                "silence_ratio": "float [0,1]",
                "pitch_mean": "float",
                "pitch_variance": "float",
                "energy_mean": "float",
                "energy_variance": "float",
                "monotony_score": "float [0,1]",
                "audio_confidence_prob": "float [0,1]",
                "audio_nervous_prob": "float [0,1]",
                "audio_calm_prob": "float [0,1]",
                "emotion_consistency": "float [0,1]"
            },
            "video_metrics": {
                "eye_contact_ratio": "float [0,1]",
                "gaze_variance": "float",
                "head_turn_frequency": "float",
                "expression_variance": "float",
                "smile_ratio": "float [0,1]",
                "neutral_face_ratio": "float [0,1]",
                "emotion_mismatch_score": "float [0,1]"
            }
        }
    }
