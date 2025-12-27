"""
Pydantic schemas for API request/response models.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class TextInput(BaseModel):
    """Input for text analysis."""
    user_responses: List[str] = Field(
        ..., description="List of user text responses"
    )
    interviewer_questions: Optional[List[str]] = Field(
        None, description="Optional list of corresponding interviewer questions"
    )
    response_durations: Optional[List[float]] = Field(
        None, description="Optional list of response durations in seconds"
    )


class AudioInput(BaseModel):
    """Input for audio analysis."""
    audio_base64: str = Field(
        ..., description="Base64 encoded audio data"
    )
    word_count: Optional[int] = Field(
        None, description="Optional word count for WPM calculation"
    )
    sample_rate: Optional[int] = Field(
        None, description="Optional sample rate override"
    )


class AudioSegmentsInput(BaseModel):
    """Input for multiple audio segments."""
    audio_segments_base64: List[str] = Field(
        ..., description="List of base64 encoded audio segments"
    )
    word_counts: Optional[List[int]] = Field(
        None, description="Optional word counts per segment"
    )
    sample_rate: Optional[int] = Field(
        None, description="Optional sample rate override"
    )


class VideoInput(BaseModel):
    """Input for video analysis."""
    video_base64: str = Field(
        ..., description="Base64 encoded video data"
    )
    fps: Optional[float] = Field(
        30.0, description="Frames per second for temporal analysis"
    )


class ImageInput(BaseModel):
    """Input for single image analysis."""
    image_base64: str = Field(
        ..., description="Base64 encoded image data"
    )


class AnalyzeRequest(BaseModel):
    """Combined analysis request."""
    text: Optional[TextInput] = Field(
        None, description="Text data for analysis"
    )
    audio: Optional[AudioInput] = Field(
        None, description="Audio data for analysis"
    )
    video: Optional[VideoInput] = Field(
        None, description="Video data for analysis"
    )
    normalize: bool = Field(
        True, description="Whether to normalize output features"
    )
    include_raw: bool = Field(
        False, description="Whether to include raw (unnormalized) metrics"
    )


class TextMetricsResponse(BaseModel):
    """Response schema for text metrics."""
    semantic_relevance_mean: float = 0.0
    semantic_relevance_std: float = 0.0
    topic_drift_ratio: float = 0.0
    avg_sentence_length: float = 0.0
    sentence_length_std: float = 0.0
    avg_response_length_sec: float = 0.0
    response_length_consistency: float = 0.0
    assertive_phrase_ratio: float = 0.0
    modal_verb_ratio: float = 0.0
    hedge_ratio: float = 0.0
    filler_word_ratio: float = 0.0
    empathy_phrase_ratio: float = 0.0
    reflective_response_ratio: float = 0.0
    question_back_ratio: float = 0.0
    avg_sentiment: float = 0.0
    sentiment_variance: float = 0.0
    negative_spike_count: int = 0


class AudioMetricsResponse(BaseModel):
    """Response schema for audio metrics."""
    speech_rate_wpm: float = 0.0
    speech_rate_variance: float = 0.0
    mean_pause_duration: float = 0.0
    pause_frequency: float = 0.0
    silence_ratio: float = 0.0
    pitch_mean: float = 0.0
    pitch_variance: float = 0.0
    energy_mean: float = 0.0
    energy_variance: float = 0.0
    monotony_score: float = 0.0
    audio_confidence_prob: float = 0.0
    audio_nervous_prob: float = 0.0
    audio_calm_prob: float = 0.0
    emotion_consistency: float = 0.0


class VideoMetricsResponse(BaseModel):
    """Response schema for video metrics."""
    eye_contact_ratio: float = 0.0
    gaze_variance: float = 0.0
    head_turn_frequency: float = 0.0
    expression_variance: float = 0.0
    smile_ratio: float = 0.0
    neutral_face_ratio: float = 0.0
    emotion_mismatch_score: float = 0.0


class AnalyzeResponse(BaseModel):
    """Combined analysis response."""
    text_metrics: Optional[Dict[str, Any]] = None
    audio_metrics: Optional[Dict[str, Any]] = None
    video_metrics: Optional[Dict[str, Any]] = None
    raw_metrics: Optional[Dict[str, Dict[str, Any]]] = Field(
        None, description="Raw unnormalized metrics if requested"
    )
    processing_time_ms: float = Field(
        0.0, description="Total processing time in milliseconds"
    )


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    models_loaded: bool
    version: str = "1.0.0"
