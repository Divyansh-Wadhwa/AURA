"""
Analysis routes for the perception layer.
"""

import base64
import time
import logging
from typing import Optional
from fastapi import APIRouter, HTTPException

from app.schemas import (
    AnalyzeRequest,
    AnalyzeResponse,
    TextInput,
    AudioInput,
    VideoInput,
    ImageInput,
    TextMetricsResponse,
    AudioMetricsResponse,
    VideoMetricsResponse
)
from app.perception.text_perception import TextPerception
from app.perception.audio_perception import AudioPerception
from app.perception.video_perception import VideoPerception
from app.utils.normalization import Normalizer
from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analyze", tags=["Analysis"])

# Initialize perception modules (stateless, can be reused)
text_perception = TextPerception()
audio_perception = AudioPerception()
video_perception = VideoPerception()
normalizer = Normalizer(
    use_zscore=settings.use_zscore_normalization,
    clip_range=settings.normalization_clip_range
)


@router.post("", response_model=AnalyzeResponse)
async def analyze(request: AnalyzeRequest) -> AnalyzeResponse:
    """
    Analyze multimodal input and return structured numeric features.
    
    Accepts text, audio, and/or video input. Returns normalized metrics
    suitable for downstream scoring and decision layers.
    """
    start_time = time.time()
    
    raw_text_metrics = None
    raw_audio_metrics = None
    raw_video_metrics = None
    
    # Process text if provided
    if request.text:
        try:
            text_metrics = text_perception.extract_metrics(
                user_responses=request.text.user_responses,
                interviewer_questions=request.text.interviewer_questions,
                response_durations=request.text.response_durations
            )
            raw_text_metrics = text_metrics.to_dict()
        except Exception as e:
            logger.error(f"Text processing error: {e}")
            raw_text_metrics = TextMetricsResponse().model_dump()
    
    # Process audio if provided
    if request.audio:
        try:
            audio_bytes = base64.b64decode(request.audio.audio_base64)
            audio_metrics = audio_perception.extract_metrics(
                audio_data=audio_bytes,
                word_count=request.audio.word_count,
                sample_rate=request.audio.sample_rate
            )
            raw_audio_metrics = audio_metrics.to_dict()
        except Exception as e:
            logger.error(f"Audio processing error: {e}")
            raw_audio_metrics = AudioMetricsResponse().model_dump()
    
    # Process video if provided
    if request.video:
        try:
            video_bytes = base64.b64decode(request.video.video_base64)
            video_metrics = video_perception.extract_metrics(
                video_data=video_bytes,
                fps=request.video.fps or 30.0
            )
            raw_video_metrics = video_metrics.to_dict()
        except Exception as e:
            logger.error(f"Video processing error: {e}")
            raw_video_metrics = VideoMetricsResponse().model_dump()
    
    # Build response
    response = AnalyzeResponse(
        processing_time_ms=(time.time() - start_time) * 1000
    )
    
    # Normalize if requested
    if request.normalize:
        if raw_text_metrics:
            response.text_metrics = normalizer.normalize_metrics(raw_text_metrics)
        if raw_audio_metrics:
            response.audio_metrics = normalizer.normalize_metrics(raw_audio_metrics)
        if raw_video_metrics:
            response.video_metrics = normalizer.normalize_metrics(raw_video_metrics)
    else:
        response.text_metrics = raw_text_metrics
        response.audio_metrics = raw_audio_metrics
        response.video_metrics = raw_video_metrics
    
    # Include raw metrics if requested
    if request.include_raw:
        response.raw_metrics = {
            "text_metrics": raw_text_metrics,
            "audio_metrics": raw_audio_metrics,
            "video_metrics": raw_video_metrics
        }
    
    return response


@router.post("/text", response_model=dict)
async def analyze_text(request: TextInput) -> dict:
    """Analyze text input only."""
    start_time = time.time()
    
    try:
        metrics = text_perception.extract_metrics(
            user_responses=request.user_responses,
            interviewer_questions=request.interviewer_questions,
            response_durations=request.response_durations
        )
        raw_metrics = metrics.to_dict()
        normalized = normalizer.normalize_metrics(raw_metrics)
        
        return {
            "text_metrics": normalized,
            "raw_metrics": raw_metrics,
            "processing_time_ms": (time.time() - start_time) * 1000
        }
    except Exception as e:
        logger.error(f"Text analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/audio", response_model=dict)
async def analyze_audio(request: AudioInput) -> dict:
    """Analyze audio input only."""
    start_time = time.time()
    
    try:
        audio_bytes = base64.b64decode(request.audio_base64)
        metrics = audio_perception.extract_metrics(
            audio_data=audio_bytes,
            word_count=request.word_count,
            sample_rate=request.sample_rate
        )
        raw_metrics = metrics.to_dict()
        normalized = normalizer.normalize_metrics(raw_metrics)
        
        return {
            "audio_metrics": normalized,
            "raw_metrics": raw_metrics,
            "processing_time_ms": (time.time() - start_time) * 1000
        }
    except Exception as e:
        logger.error(f"Audio analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/video", response_model=dict)
async def analyze_video(request: VideoInput) -> dict:
    """Analyze video input only."""
    start_time = time.time()
    
    try:
        video_bytes = base64.b64decode(request.video_base64)
        metrics = video_perception.extract_metrics(
            video_data=video_bytes,
            fps=request.fps or 30.0
        )
        raw_metrics = metrics.to_dict()
        normalized = normalizer.normalize_metrics(raw_metrics)
        
        return {
            "video_metrics": normalized,
            "raw_metrics": raw_metrics,
            "processing_time_ms": (time.time() - start_time) * 1000
        }
    except Exception as e:
        logger.error(f"Video analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/image", response_model=dict)
async def analyze_image(request: ImageInput) -> dict:
    """Analyze single image for facial metrics."""
    start_time = time.time()
    
    try:
        image_bytes = base64.b64decode(request.image_base64)
        metrics = video_perception.extract_metrics_from_image(image_bytes)
        raw_metrics = metrics.to_dict()
        normalized = normalizer.normalize_metrics(raw_metrics)
        
        return {
            "video_metrics": normalized,
            "raw_metrics": raw_metrics,
            "processing_time_ms": (time.time() - start_time) * 1000
        }
    except Exception as e:
        logger.error(f"Image analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
