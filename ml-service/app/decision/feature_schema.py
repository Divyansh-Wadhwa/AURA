"""
FROZEN FEATURE SCHEMA v1.0
==========================
This is the standardized contract between Perception Layer and Decision Layer.
DO NOT MODIFY without coordinating with perception layer team.

Each feature is:
- Extractable with the defined stack
- Numeric
- Stable across sessions
- Not trivially gameable
"""

from typing import Dict, List, Optional
from pydantic import BaseModel, Field


# =============================================================================
# TEXT METRICS (from transcript)
# =============================================================================
class TextMetrics(BaseModel):
    """Metrics extracted from interview transcript text."""
    
    # Semantic & relevance metrics
    semantic_relevance_mean: float = Field(..., ge=0, le=1, description="Cosine similarity to expected topic embedding")
    semantic_relevance_std: float = Field(..., ge=0, le=1, description="Variance in relevance across responses")
    topic_drift_ratio: float = Field(..., ge=0, le=1, description="% responses below relevance threshold")
    
    # Linguistic structure metrics
    avg_sentence_length: float = Field(..., ge=0, description="Average words per sentence")
    sentence_length_std: float = Field(..., ge=0, description="Variability in sentence length")
    avg_response_length_sec: float = Field(..., ge=0, description="Time-normalized verbosity")
    response_length_consistency: float = Field(..., ge=0, le=1, description="Std/mean of response lengths")
    
    # Assertiveness & hesitation metrics
    assertive_phrase_ratio: float = Field(..., ge=0, le=1, description="Ratio of assertive phrases: 'I did', 'I led', 'I decided'")
    modal_verb_ratio: float = Field(..., ge=0, le=1, description="Ratio of modal verbs: 'might', 'maybe', 'could'")
    hedge_ratio: float = Field(..., ge=0, le=1, description="Ratio of hedging phrases: 'kind of', 'sort of'")
    filler_word_ratio: float = Field(..., ge=0, le=1, description="Ratio of filler words: 'uh', 'um', 'like'")
    
    # Empathy & social intelligence metrics
    empathy_phrase_ratio: float = Field(..., ge=0, le=1, description="Ratio of empathy/acknowledgement phrases")
    reflective_response_ratio: float = Field(..., ge=0, le=1, description="Ratio of paraphrasing/reflection")
    question_back_ratio: float = Field(..., ge=0, le=1, description="Ratio of clarifying questions asked")
    
    # Emotional tone metrics (text-based)
    avg_sentiment: float = Field(..., ge=-1, le=1, description="Mean sentiment score")
    sentiment_variance: float = Field(..., ge=0, description="Variance in sentiment (emotional stability)")
    negative_spike_count: int = Field(..., ge=0, description="Count of negative sentiment spikes")


# =============================================================================
# AUDIO METRICS (from speech)
# =============================================================================
class AudioMetrics(BaseModel):
    """Metrics extracted from audio using librosa + Whisper timestamps."""
    
    # Temporal speech metrics
    speech_rate_wpm: float = Field(..., ge=0, description="Words per minute")
    speech_rate_variance: float = Field(..., ge=0, description="Variance in speech rate (control)")
    mean_pause_duration: float = Field(..., ge=0, description="Average pause duration in seconds")
    pause_frequency: float = Field(..., ge=0, description="Number of pauses per minute")
    silence_ratio: float = Field(..., ge=0, le=1, description="Ratio of silence to total duration")
    
    # Prosodic metrics (voice dynamics)
    pitch_mean: float = Field(..., ge=0, description="Mean pitch in Hz")
    pitch_variance: float = Field(..., ge=0, description="Variance in pitch (expressiveness)")
    energy_mean: float = Field(..., ge=0, description="Mean energy/loudness")
    energy_variance: float = Field(..., ge=0, description="Variance in energy (engagement)")
    monotony_score: float = Field(..., ge=0, le=1, description="Low pitch+energy variance indicator")
    
    # Audio emotion metrics
    audio_confidence_prob: float = Field(..., ge=0, le=1, description="Confidence probability from emotion model")
    audio_nervous_prob: float = Field(..., ge=0, le=1, description="Nervousness/stress probability")
    audio_calm_prob: float = Field(..., ge=0, le=1, description="Calmness/composure probability")
    emotion_consistency: float = Field(..., ge=0, le=1, description="Consistency of emotional state")


# =============================================================================
# VIDEO METRICS (from MediaPipe Face Mesh) - OPTIONAL
# =============================================================================
class VideoMetrics(BaseModel):
    """Metrics extracted from video using MediaPipe Face Mesh. Optional."""
    
    # Eye contact & attention
    eye_contact_ratio: Optional[float] = Field(None, ge=0, le=1, description="Ratio of frames with eye alignment")
    gaze_variance: Optional[float] = Field(None, ge=0, description="Variance in gaze direction")
    head_turn_frequency: Optional[float] = Field(None, ge=0, description="Frequency of head turns (avoidance)")
    
    # Facial expressiveness
    expression_variance: Optional[float] = Field(None, ge=0, description="Variance in facial expressions")
    smile_ratio: Optional[float] = Field(None, ge=0, le=1, description="Ratio of frames with smile")
    neutral_face_ratio: Optional[float] = Field(None, ge=0, le=1, description="Ratio of neutral expression")
    
    # Multimodal consistency
    emotion_mismatch_score: Optional[float] = Field(None, ge=0, le=1, description="Mismatch between text/audio/video emotion")


# =============================================================================
# COMBINED FEATURE VECTOR (Input to Decision Layer)
# =============================================================================
class PerceptionOutput(BaseModel):
    """
    Complete feature vector from Perception Layer.
    This is the input contract for Decision Layer.
    """
    session_id: str = Field(..., description="Unique session identifier")
    text_metrics: TextMetrics
    audio_metrics: AudioMetrics
    video_metrics: Optional[VideoMetrics] = Field(None, description="Optional video metrics")


# =============================================================================
# DECISION LAYER OUTPUT (Scores)
# =============================================================================
class ScoringOutput(BaseModel):
    """Output from Decision Layer - the final scores."""
    session_id: str
    confidence: float = Field(..., ge=0, le=100, description="Confidence score 0-100")
    clarity: float = Field(..., ge=0, le=100, description="Clarity score 0-100")
    empathy: float = Field(..., ge=0, le=100, description="Empathy score 0-100")
    communication: float = Field(..., ge=0, le=100, description="Communication score 0-100")
    overall: float = Field(..., ge=0, le=100, description="Overall score 0-100")
    
    # Feature importance for explainability
    top_positive_features: List[str] = Field(default_factory=list, description="Features that boosted score")
    top_negative_features: List[str] = Field(default_factory=list, description="Features that lowered score")


# =============================================================================
# FEATURE LISTS (for training and inference)
# =============================================================================

TEXT_FEATURE_NAMES: List[str] = [
    "semantic_relevance_mean",
    "semantic_relevance_std",
    "topic_drift_ratio",
    "avg_sentence_length",
    "sentence_length_std",
    "avg_response_length_sec",
    "response_length_consistency",
    "assertive_phrase_ratio",
    "modal_verb_ratio",
    "hedge_ratio",
    "filler_word_ratio",
    "empathy_phrase_ratio",
    "reflective_response_ratio",
    "question_back_ratio",
    "avg_sentiment",
    "sentiment_variance",
    "negative_spike_count",
]

AUDIO_FEATURE_NAMES: List[str] = [
    "speech_rate_wpm",
    "speech_rate_variance",
    "mean_pause_duration",
    "mean_pause_duration",
    "pause_frequency",
    "silence_ratio",
    "pitch_mean",
    "pitch_variance",
    "energy_mean",
    "energy_variance",
    "monotony_score",
    "audio_confidence_prob",
    "audio_nervous_prob",
    "audio_calm_prob",
    "emotion_consistency",
]

VIDEO_FEATURE_NAMES: List[str] = [
    "eye_contact_ratio",
    "gaze_variance",
    "head_turn_frequency",
    "expression_variance",
    "smile_ratio",
    "neutral_face_ratio",
    "emotion_mismatch_score",
]

# All features combined (for feature vector construction)
ALL_FEATURE_NAMES: List[str] = TEXT_FEATURE_NAMES + AUDIO_FEATURE_NAMES + VIDEO_FEATURE_NAMES

# Target labels
TARGET_NAMES: List[str] = ["confidence", "clarity", "empathy", "communication"]


# =============================================================================
# FEATURE METADATA (for normalization and validation)
# =============================================================================
FEATURE_METADATA: Dict[str, Dict] = {
    # Text metrics
    "semantic_relevance_mean": {"type": "ratio", "range": (0, 1), "normalize": "none"},
    "semantic_relevance_std": {"type": "ratio", "range": (0, 1), "normalize": "none"},
    "topic_drift_ratio": {"type": "ratio", "range": (0, 1), "normalize": "none"},
    "avg_sentence_length": {"type": "continuous", "range": (5, 50), "normalize": "zscore"},
    "sentence_length_std": {"type": "continuous", "range": (0, 20), "normalize": "zscore"},
    "avg_response_length_sec": {"type": "continuous", "range": (5, 120), "normalize": "zscore"},
    "response_length_consistency": {"type": "ratio", "range": (0, 1), "normalize": "none"},
    "assertive_phrase_ratio": {"type": "ratio", "range": (0, 1), "normalize": "none"},
    "modal_verb_ratio": {"type": "ratio", "range": (0, 1), "normalize": "none"},
    "hedge_ratio": {"type": "ratio", "range": (0, 1), "normalize": "none"},
    "filler_word_ratio": {"type": "ratio", "range": (0, 1), "normalize": "none"},
    "empathy_phrase_ratio": {"type": "ratio", "range": (0, 1), "normalize": "none"},
    "reflective_response_ratio": {"type": "ratio", "range": (0, 1), "normalize": "none"},
    "question_back_ratio": {"type": "ratio", "range": (0, 1), "normalize": "none"},
    "avg_sentiment": {"type": "continuous", "range": (-1, 1), "normalize": "none"},
    "sentiment_variance": {"type": "continuous", "range": (0, 1), "normalize": "zscore"},
    "negative_spike_count": {"type": "count", "range": (0, 10), "normalize": "minmax"},
    
    # Audio metrics
    "speech_rate_wpm": {"type": "continuous", "range": (80, 200), "normalize": "zscore"},
    "speech_rate_variance": {"type": "continuous", "range": (0, 50), "normalize": "zscore"},
    "mean_pause_duration": {"type": "continuous", "range": (0.1, 3.0), "normalize": "zscore"},
    "pause_frequency": {"type": "continuous", "range": (0, 20), "normalize": "zscore"},
    "silence_ratio": {"type": "ratio", "range": (0, 1), "normalize": "none"},
    "pitch_mean": {"type": "continuous", "range": (80, 300), "normalize": "zscore"},
    "pitch_variance": {"type": "continuous", "range": (0, 100), "normalize": "zscore"},
    "energy_mean": {"type": "continuous", "range": (0, 1), "normalize": "zscore"},
    "energy_variance": {"type": "continuous", "range": (0, 0.5), "normalize": "zscore"},
    "monotony_score": {"type": "ratio", "range": (0, 1), "normalize": "none"},
    "audio_confidence_prob": {"type": "probability", "range": (0, 1), "normalize": "none"},
    "audio_nervous_prob": {"type": "probability", "range": (0, 1), "normalize": "none"},
    "audio_calm_prob": {"type": "probability", "range": (0, 1), "normalize": "none"},
    "emotion_consistency": {"type": "ratio", "range": (0, 1), "normalize": "none"},
    
    # Video metrics
    "eye_contact_ratio": {"type": "ratio", "range": (0, 1), "normalize": "none"},
    "gaze_variance": {"type": "continuous", "range": (0, 1), "normalize": "zscore"},
    "head_turn_frequency": {"type": "continuous", "range": (0, 10), "normalize": "zscore"},
    "expression_variance": {"type": "continuous", "range": (0, 1), "normalize": "zscore"},
    "smile_ratio": {"type": "ratio", "range": (0, 1), "normalize": "none"},
    "neutral_face_ratio": {"type": "ratio", "range": (0, 1), "normalize": "none"},
    "emotion_mismatch_score": {"type": "ratio", "range": (0, 1), "normalize": "none"},
}
