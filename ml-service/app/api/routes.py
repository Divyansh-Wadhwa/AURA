"""
DECISION LAYER API ROUTES
==========================
FastAPI routes for the ML scoring service.

Endpoints:
- GET  /health     - Health check
- POST /score      - Score a session
- GET  /model/info - Model metadata
"""

from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

from ..decision.scoring import (
    score_session,
    score_batch,
    get_model_info,
    get_models_status,
)
from ..decision.feature_contract import (
    ALL_FEATURES,
    TEXT_FEATURES,
    AUDIO_FEATURES,
    VIDEO_FEATURES,
    TARGET_LABELS,
    FEATURE_METADATA,
)


# =============================================================================
# ROUTER
# =============================================================================

router = APIRouter()


# =============================================================================
# REQUEST/RESPONSE MODELS
# =============================================================================

class TextMetrics(BaseModel):
    """Text-derived metrics from perception layer."""
    semantic_relevance_mean: Optional[float] = Field(None)
    semantic_relevance_std: Optional[float] = Field(None)
    topic_drift_ratio: Optional[float] = Field(None)
    avg_sentence_length: Optional[float] = Field(None)
    sentence_length_std: Optional[float] = Field(None)
    avg_response_length_sec: Optional[float] = Field(None)
    response_length_consistency: Optional[float] = Field(None)
    assertive_phrase_ratio: Optional[float] = Field(None)
    modal_verb_ratio: Optional[float] = Field(None)
    hedge_ratio: Optional[float] = Field(None)
    filler_word_ratio: Optional[float] = Field(None)
    empathy_phrase_ratio: Optional[float] = Field(None)
    reflective_response_ratio: Optional[float] = Field(None)
    question_back_ratio: Optional[float] = Field(None)
    avg_sentiment: Optional[float] = Field(None)
    sentiment_variance: Optional[float] = Field(None)
    negative_spike_count: Optional[float] = Field(None)
    # Additional fields from perception layer
    vague_phrase_ratio: Optional[float] = Field(None)
    information_density: Optional[float] = Field(None)
    specificity_score: Optional[float] = Field(None)
    redundancy_score: Optional[float] = Field(None)
    answer_depth_score: Optional[float] = Field(None)
    llm_confidence_mean: Optional[float] = Field(None)
    llm_clarity_mean: Optional[float] = Field(None)
    llm_depth_mean: Optional[float] = Field(None)
    llm_empathy_mean: Optional[float] = Field(None)
    llm_evasion_mean: Optional[float] = Field(None)
    
    class Config:
        extra = "allow"  # Allow extra fields not defined in the model


class AudioMetrics(BaseModel):
    """Audio-derived metrics from perception layer."""
    speech_rate_wpm: Optional[float] = Field(None, ge=30, le=300)
    speech_rate_variance: Optional[float] = Field(None, ge=0, le=100)
    mean_pause_duration: Optional[float] = Field(None, ge=0, le=10)
    pause_frequency: Optional[float] = Field(None, ge=0, le=60)
    silence_ratio: Optional[float] = Field(None, ge=0, le=1)
    pitch_mean: Optional[float] = Field(None, ge=50, le=500)
    pitch_variance: Optional[float] = Field(None, ge=0, le=200)
    energy_mean: Optional[float] = Field(None, ge=0, le=1)
    energy_variance: Optional[float] = Field(None, ge=0, le=1)
    monotony_score: Optional[float] = Field(None, ge=0, le=1)
    audio_confidence_prob: Optional[float] = Field(None, ge=0, le=1)
    audio_nervous_prob: Optional[float] = Field(None, ge=0, le=1)
    audio_calm_prob: Optional[float] = Field(None, ge=0, le=1)
    emotion_consistency: Optional[float] = Field(None, ge=0, le=1)


class VideoMetrics(BaseModel):
    """Video-derived metrics from MediaPipe browser analysis (optional)."""
    face_presence_ratio: Optional[float] = Field(None, ge=0, le=1, description="Proportion of frames with face detected")
    eye_contact_ratio: Optional[float] = Field(None, ge=0, le=1, description="Proportion with eye contact (facing camera)")
    head_motion_variance: Optional[float] = Field(None, ge=0, le=1, description="Variance in head movement")
    facial_engagement_score: Optional[float] = Field(None, ge=0, le=1, description="Facial activity/engagement level")
    video_available: Optional[float] = Field(None, ge=0, le=1, description="Binary flag indicating video was available")
    
    class Config:
        extra = "allow"  # Allow extra fields (body language metrics, total_frames, etc.)


class ScoreRequest(BaseModel):
    """Request body for /score endpoint."""
    text_metrics: Optional[TextMetrics] = None
    audio_metrics: Optional[AudioMetrics] = None
    video_metrics: Optional[VideoMetrics] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "text_metrics": {
                    "semantic_relevance_mean": 0.75,
                    "topic_drift_ratio": 0.1,
                    "assertive_phrase_ratio": 0.3,
                    "filler_word_ratio": 0.05,
                },
                "audio_metrics": {
                    "silence_ratio": 0.15,
                    "audio_confidence_prob": 0.7,
                    "monotony_score": 0.2,
                },
                "video_metrics": {
                    "eye_contact_ratio": 0.8,
                    "smile_ratio": 0.3,
                }
            }
        }


class ScoreResponse(BaseModel):
    """Response body for /score endpoint."""
    confidence: int = Field(..., ge=0, le=100)
    clarity: int = Field(..., ge=0, le=100)
    empathy: int = Field(..., ge=0, le=100)
    communication: int = Field(..., ge=0, le=100)
    overall: int = Field(..., ge=0, le=100)
    low_features: List[str] = Field(default_factory=list)
    improvement_suggestions: List[str] = Field(default_factory=list)
    video_available: bool = False
    
    class Config:
        json_schema_extra = {
            "example": {
                "confidence": 74,
                "clarity": 68,
                "empathy": 81,
                "communication": 72,
                "overall": 73,
                "low_features": ["silence_ratio", "topic_drift_ratio"],
                "improvement_suggestions": [
                    "Reduce pauses and hesitation in your responses",
                    "Stay more focused on the question being asked"
                ],
                "video_available": True
            }
        }


class HealthResponse(BaseModel):
    """Response body for /health endpoint."""
    status: str
    models_loaded: bool
    models: List[str]


class ModelInfoResponse(BaseModel):
    """Response body for /model/info endpoint."""
    models_loaded: bool
    skills: List[str]
    n_features: int
    feature_names: List[str]
    feature_importance: Dict[str, Dict[str, float]]


# =============================================================================
# ENDPOINTS
# =============================================================================

@router.get("/health", response_model=HealthResponse, tags=["System"])
async def health_check():
    """
    Health check endpoint.
    
    Returns the status of the ML service and loaded models.
    """
    status = get_models_status()
    return HealthResponse(
        status="healthy" if status["loaded"] else "degraded",
        models_loaded=status["loaded"],
        models=status["models"],
    )


@router.post("/score", response_model=ScoreResponse, tags=["Scoring"])
async def score(request: ScoreRequest):
    """
    Score a session based on perception layer metrics.
    
    This endpoint receives metrics from the perception layer and returns
    objective scores for confidence, clarity, empathy, and communication.
    
    **Input**: Metrics extracted from text, audio, and optionally video
    **Output**: Scores (0-100) for each skill + improvement suggestions
    
    The scoring is:
    - **Deterministic**: Same input always produces same output
    - **Stateless**: No memory between requests
    - **Pure**: No side effects, no LLM calls
    """
    # Flatten all metrics into a single dictionary
    features: Dict[str, Optional[float]] = {}
    
    if request.text_metrics:
        features.update(request.text_metrics.model_dump(exclude_none=False))
    
    if request.audio_metrics:
        features.update(request.audio_metrics.model_dump(exclude_none=False))
    
    if request.video_metrics:
        features.update(request.video_metrics.model_dump(exclude_none=False))
    
    # Run scoring
    result = score_session(features)
    
    # Check for errors
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
    
    return ScoreResponse(**result)


@router.get("/model/info", response_model=ModelInfoResponse, tags=["System"])
async def model_info():
    """
    Get information about the loaded models.
    
    Returns:
    - List of skills with trained models
    - Feature names and count
    - Feature importance per skill
    """
    info = get_model_info()
    
    return ModelInfoResponse(
        models_loaded=info["models_loaded"],
        skills=info["skills"],
        n_features=info["n_features"],
        feature_names=info["feature_names"],
        feature_importance=info.get("feature_importance", {}),
    )


@router.get("/schema", tags=["System"])
async def get_schema():
    """
    Get the feature schema.
    
    Returns the complete feature contract including:
    - Feature names by modality
    - Feature metadata (min, max, default)
    - Target labels
    """
    return {
        "text_features": TEXT_FEATURES,
        "audio_features": AUDIO_FEATURES,
        "video_features": VIDEO_FEATURES,
        "all_features": ALL_FEATURES,
        "target_labels": TARGET_LABELS,
        "feature_metadata": FEATURE_METADATA,
    }
