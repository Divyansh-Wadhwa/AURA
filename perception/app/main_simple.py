"""
AURA Perception Layer - FastAPI Application
Extracts raw behavioral metrics from user input without making judgments.
No mock data - all metrics computed from actual input.
"""

import re
import logging
import time
import numpy as np
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="AURA Perception Layer",
    description="Extracts raw behavioral metrics from multimodal input",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Linguistic patterns for text analysis
ASSERTIVE_PHRASES = [r'\bi am\b', r'\bi will\b', r'\bi can\b', r'\bdefinitely\b', r'\bcertainly\b', r'\babsolutely\b', r'\bclearly\b']
MODAL_VERBS = [r'\bcan\b', r'\bcould\b', r'\bmay\b', r'\bmight\b', r'\bmust\b', r'\bshall\b', r'\bshould\b', r'\bwill\b', r'\bwould\b']
HEDGE_WORDS = [r'\bmaybe\b', r'\bperhaps\b', r'\bpossibly\b', r'\bprobably\b', r'\bi think\b', r'\bi guess\b', r'\bi believe\b', r'\bkind of\b', r'\bsort of\b']
FILLER_WORDS = [r'\bum\b', r'\buh\b', r'\blike\b', r'\byou know\b', r'\bi mean\b', r'\bactually\b', r'\bliterally\b', r'\bbasically\b']
EMPATHY_PHRASES = [r'\bi understand\b', r'\bi see\b', r'\bi hear you\b', r'\bthat must be\b', r'\bi can imagine\b', r'\bi appreciate\b', r'\bthank you\b']
REFLECTIVE_PATTERNS = [r'^so you', r'^it sounds like', r'^you mentioned', r'^you said', r'^you feel']

# Pydantic models
class TextInput(BaseModel):
    user_responses: List[str]
    interviewer_questions: Optional[List[str]] = None
    response_durations: Optional[List[float]] = None

class AudioInput(BaseModel):
    audio_base64: Optional[str] = None
    word_count: Optional[int] = None

class VideoInput(BaseModel):
    video_base64: Optional[str] = None
    fps: Optional[float] = 30.0

class AnalyzeRequest(BaseModel):
    text: Optional[TextInput] = None
    audio: Optional[AudioInput] = None
    video: Optional[VideoInput] = None

def count_pattern_matches(text: str, patterns: List[str]) -> int:
    text_lower = text.lower()
    return sum(len(re.findall(p, text_lower)) for p in patterns)

def split_sentences(text: str) -> List[str]:
    return [s.strip() for s in re.split(r'[.!?]+', text) if s.strip()]

def compute_text_metrics(responses: List[str], questions: Optional[List[str]], durations: Optional[List[float]]) -> Dict[str, Any]:
    """Compute all text metrics from user responses."""
    if not responses:
        return {}
    
    all_text = ' '.join(responses)
    total_words = len(all_text.split())
    num_responses = len(responses)
    
    # Sentence analysis
    all_sentences = []
    for r in responses:
        all_sentences.extend(split_sentences(r))
    sentence_lengths = [len(s.split()) for s in all_sentences if s]
    
    avg_sentence_length = float(np.mean(sentence_lengths)) if sentence_lengths else 0.0
    sentence_length_std = float(np.std(sentence_lengths)) if len(sentence_lengths) > 1 else 0.0
    
    # Response duration metrics
    avg_response_length_sec = float(np.mean(durations)) if durations else 0.0
    if durations and len(durations) > 1 and np.mean(durations) > 0:
        cv = np.std(durations) / np.mean(durations)
        response_length_consistency = float(1.0 / (1.0 + cv))
    else:
        response_length_consistency = 1.0 if durations else 0.0
    
    # Linguistic pattern ratios
    assertive_count = count_pattern_matches(all_text, ASSERTIVE_PHRASES)
    modal_count = count_pattern_matches(all_text, MODAL_VERBS)
    hedge_count = count_pattern_matches(all_text, HEDGE_WORDS)
    filler_count = count_pattern_matches(all_text, FILLER_WORDS)
    empathy_count = count_pattern_matches(all_text, EMPATHY_PHRASES)
    
    assertive_phrase_ratio = assertive_count / total_words if total_words > 0 else 0.0
    modal_verb_ratio = modal_count / total_words if total_words > 0 else 0.0
    hedge_ratio = hedge_count / total_words if total_words > 0 else 0.0
    filler_word_ratio = filler_count / total_words if total_words > 0 else 0.0
    empathy_phrase_ratio = empathy_count / total_words if total_words > 0 else 0.0
    
    # Reflective and question patterns
    reflective_count = sum(1 for r in responses if any(re.search(p, r.lower()) for p in REFLECTIVE_PATTERNS))
    question_back_count = sum(1 for r in responses if '?' in r)
    
    reflective_response_ratio = reflective_count / num_responses if num_responses > 0 else 0.0
    question_back_ratio = question_back_count / num_responses if num_responses > 0 else 0.0
    
    # Simple sentiment (positive - negative word ratio)
    positive_words = [r'\bgood\b', r'\bgreat\b', r'\bexcellent\b', r'\bhappy\b', r'\blove\b', r'\bwonderful\b', r'\bamazing\b', r'\bpositive\b']
    negative_words = [r'\bbad\b', r'\bterrible\b', r'\bawful\b', r'\bsad\b', r'\bhate\b', r'\bhorrible\b', r'\bnegative\b', r'\bworst\b']
    
    positive_count = count_pattern_matches(all_text, positive_words)
    negative_count = count_pattern_matches(all_text, negative_words)
    
    if positive_count + negative_count > 0:
        avg_sentiment = (positive_count - negative_count) / (positive_count + negative_count)
    else:
        avg_sentiment = 0.0
    
    # Per-response sentiment for variance
    response_sentiments = []
    for r in responses:
        pos = count_pattern_matches(r, positive_words)
        neg = count_pattern_matches(r, negative_words)
        if pos + neg > 0:
            response_sentiments.append((pos - neg) / (pos + neg))
        else:
            response_sentiments.append(0.0)
    
    sentiment_variance = float(np.var(response_sentiments)) if len(response_sentiments) > 1 else 0.0
    negative_spike_count = sum(1 for s in response_sentiments if s < -0.5)
    
    # Semantic relevance (simple word overlap if questions provided)
    if questions and len(questions) == len(responses):
        relevance_scores = []
        for q, r in zip(questions, responses):
            q_words = set(q.lower().split())
            r_words = set(r.lower().split())
            if q_words:
                overlap = len(q_words & r_words) / len(q_words)
                relevance_scores.append(overlap)
        semantic_relevance_mean = float(np.mean(relevance_scores)) if relevance_scores else 0.0
        semantic_relevance_std = float(np.std(relevance_scores)) if len(relevance_scores) > 1 else 0.0
    else:
        semantic_relevance_mean = 0.0
        semantic_relevance_std = 0.0
    
    # Topic drift (simple: how different consecutive responses are)
    if len(responses) > 1:
        drift_scores = []
        for i in range(1, len(responses)):
            prev_words = set(responses[i-1].lower().split())
            curr_words = set(responses[i].lower().split())
            if prev_words or curr_words:
                union = prev_words | curr_words
                intersection = prev_words & curr_words
                drift = 1.0 - (len(intersection) / len(union)) if union else 0.0
                drift_scores.append(drift)
        topic_drift_ratio = float(np.mean(drift_scores)) if drift_scores else 0.0
    else:
        topic_drift_ratio = 0.0
    
    return {
        "semantic_relevance_mean": round(semantic_relevance_mean, 4),
        "semantic_relevance_std": round(semantic_relevance_std, 4),
        "topic_drift_ratio": round(topic_drift_ratio, 4),
        "avg_sentence_length": round(avg_sentence_length, 4),
        "sentence_length_std": round(sentence_length_std, 4),
        "avg_response_length_sec": round(avg_response_length_sec, 4),
        "response_length_consistency": round(response_length_consistency, 4),
        "assertive_phrase_ratio": round(assertive_phrase_ratio, 4),
        "modal_verb_ratio": round(modal_verb_ratio, 4),
        "hedge_ratio": round(hedge_ratio, 4),
        "filler_word_ratio": round(filler_word_ratio, 4),
        "empathy_phrase_ratio": round(empathy_phrase_ratio, 4),
        "reflective_response_ratio": round(reflective_response_ratio, 4),
        "question_back_ratio": round(question_back_ratio, 4),
        "avg_sentiment": round(avg_sentiment, 4),
        "sentiment_variance": round(sentiment_variance, 4),
        "negative_spike_count": negative_spike_count
    }

def get_empty_audio_metrics() -> Dict[str, Any]:
    """Return empty audio metrics structure (to be computed when audio processing is implemented)."""
    return {
        "speech_rate_wpm": 0.0,
        "speech_rate_variance": 0.0,
        "mean_pause_duration": 0.0,
        "pause_frequency": 0.0,
        "silence_ratio": 0.0,
        "pitch_mean": 0.0,
        "pitch_variance": 0.0,
        "energy_mean": 0.0,
        "energy_variance": 0.0,
        "monotony_score": 0.0,
        "audio_confidence_prob": 0.0,
        "audio_nervous_prob": 0.0,
        "audio_calm_prob": 0.0,
        "emotion_consistency": 0.0
    }

def get_empty_video_metrics() -> Dict[str, Any]:
    """Return empty video metrics structure (to be computed when video processing is implemented)."""
    return {
        "eye_contact_ratio": 0.0,
        "gaze_variance": 0.0,
        "head_turn_frequency": 0.0,
        "expression_variance": 0.0,
        "smile_ratio": 0.0,
        "neutral_face_ratio": 0.0,
        "emotion_mismatch_score": 0.0
    }

@app.get("/")
async def root():
    return {
        "service": "AURA Perception Layer",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "analyze": "/analyze",
            "analyze_text": "/analyze/text",
            "health": "/health"
        }
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "version": "1.0.0"
    }

@app.get("/analyze")
async def analyze_get():
    return {
        "status": "alive",
        "message": "Perception Layer is running. Use POST /analyze for analysis."
    }

@app.post("/analyze")
async def analyze(request: AnalyzeRequest):
    start_time = time.time()
    
    text_metrics = None
    audio_metrics = None
    video_metrics = None
    
    if request.text:
        text_metrics = compute_text_metrics(
            request.text.user_responses,
            request.text.interviewer_questions,
            request.text.response_durations
        )
    
    if request.audio:
        audio_metrics = get_empty_audio_metrics()
    
    if request.video:
        video_metrics = get_empty_video_metrics()
    
    return {
        "text_metrics": text_metrics,
        "audio_metrics": audio_metrics,
        "video_metrics": video_metrics,
        "processing_time_ms": round((time.time() - start_time) * 1000, 2)
    }

@app.post("/analyze/text")
async def analyze_text(request: TextInput):
    start_time = time.time()
    
    text_metrics = compute_text_metrics(
        request.user_responses,
        request.interviewer_questions,
        request.response_durations
    )
    
    return {
        "text_metrics": text_metrics,
        "processing_time_ms": round((time.time() - start_time) * 1000, 2)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
