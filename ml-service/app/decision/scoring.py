"""
DECISION LAYER SCORING ENGINE
==============================
Pure, deterministic scoring function for interview performance.

This module:
1. Loads trained models at import time
2. Provides a single scoring function
3. Returns scores + low features for feedback
4. Has NO state, NO memory, NO LLM calls

Usage:
    from app.decision.scoring import score_session
    
    result = score_session({
        "semantic_relevance_mean": 0.75,
        "silence_ratio": 0.15,
        ...
    })
    
    # Returns:
    # {
    #     "confidence": 74,
    #     "clarity": 68,
    #     "empathy": 81,
    #     "communication": 72,
    #     "low_features": ["silence_ratio", "topic_drift_ratio"],
    #     "improvement_suggestions": [...]
    # }
"""

import os
import json
import pickle
from typing import Dict, List, Optional, Tuple, Any
import numpy as np

from .feature_contract import (
    ALL_FEATURES,
    TARGET_LABELS,
    FEATURE_METADATA,
    build_feature_vector,
    validate_feature_vector,
    N_FEATURES,
)


# =============================================================================
# MODEL LOADING
# =============================================================================

# Path to models directory
MODELS_DIR = os.path.join(os.path.dirname(__file__), "..", "models")

# Global model storage (loaded once at import)
_MODELS: Dict[str, Any] = {}
_FEATURE_IMPORTANCE: Dict[str, Dict[str, float]] = {}
_FEEDBACK_MAPPING: Dict[str, List[Dict]] = {}
_MODELS_LOADED: bool = False


def _load_models() -> bool:
    """
    Load all trained models and artifacts.
    Called once at module import.
    """
    global _MODELS, _FEATURE_IMPORTANCE, _FEEDBACK_MAPPING, _MODELS_LOADED
    
    if _MODELS_LOADED:
        return True
    
    try:
        # Load models for each skill
        for skill in TARGET_LABELS:
            model_path = os.path.join(MODELS_DIR, f"{skill}_model.pkl")
            if os.path.exists(model_path):
                with open(model_path, 'rb') as f:
                    _MODELS[skill] = pickle.load(f)
            else:
                print(f"Warning: Model not found: {model_path}")
                return False
        
        # Load feature importance
        importance_path = os.path.join(MODELS_DIR, "feature_importance.json")
        if os.path.exists(importance_path):
            with open(importance_path, 'r') as f:
                _FEATURE_IMPORTANCE = json.load(f)
        
        # Load feedback mapping
        feedback_path = os.path.join(MODELS_DIR, "feedback_mapping.json")
        if os.path.exists(feedback_path):
            with open(feedback_path, 'r') as f:
                _FEEDBACK_MAPPING = json.load(f)
        
        _MODELS_LOADED = True
        return True
        
    except Exception as e:
        print(f"Error loading models: {e}")
        return False


def get_models_status() -> Dict:
    """Get status of loaded models."""
    return {
        "loaded": _MODELS_LOADED,
        "models": list(_MODELS.keys()),
        "n_models": len(_MODELS),
    }


# =============================================================================
# SCORING FUNCTION
# =============================================================================

def score_session(
    features: Dict[str, Optional[float]],
    return_details: bool = False,
) -> Dict:
    """
    Score a session based on perception layer features.
    
    This is the MAIN entry point for the decision layer.
    
    Args:
        features: Dictionary of feature name -> value
                  Missing features will be imputed with defaults
        return_details: If True, include feature vector and raw predictions
    
    Returns:
        {
            "confidence": int (0-100),
            "clarity": int (0-100),
            "empathy": int (0-100),
            "communication": int (0-100),
            "overall": int (0-100),
            "low_features": List[str],
            "improvement_suggestions": List[str],
            "video_available": bool,
        }
    
    This function is:
    - PURE: No side effects
    - DETERMINISTIC: Same input → same output
    - STATELESS: No memory between calls
    """
    # Ensure models are loaded
    if not _MODELS_LOADED:
        if not _load_models():
            return {
                "error": "Models not loaded",
                "confidence": 50,
                "clarity": 50,
                "empathy": 50,
                "communication": 50,
                "overall": 50,
                "low_features": [],
                "improvement_suggestions": [],
            }
    
    # Build feature vector
    feature_vector, video_available = build_feature_vector(features)
    
    # Validate
    if not validate_feature_vector(feature_vector):
        return {
            "error": "Invalid feature vector",
            "confidence": 50,
            "clarity": 50,
            "empathy": 50,
            "communication": 50,
            "overall": 50,
            "low_features": [],
            "improvement_suggestions": [],
        }
    
    # Reshape for prediction
    X = feature_vector.reshape(1, -1)
    
    # Run predictions
    scores = {}
    for skill in TARGET_LABELS:
        if skill in _MODELS:
            pred = _MODELS[skill].predict(X)[0]
            # Clamp to [0, 100] and round to integer
            scores[skill] = int(np.clip(np.round(pred), 0, 100))
        else:
            scores[skill] = 50  # Default if model missing
    
    # Calculate overall score (weighted average)
    overall = int(np.round(
        0.25 * scores["confidence"] +
        0.30 * scores["clarity"] +
        0.20 * scores["empathy"] +
        0.25 * scores["communication"]
    ))
    
    # Identify low features (features that could be improved)
    low_features = _identify_low_features(features, scores)
    
    # Generate improvement suggestions
    suggestions = _generate_suggestions(low_features, scores)
    
    result = {
        "confidence": scores["confidence"],
        "clarity": scores["clarity"],
        "empathy": scores["empathy"],
        "communication": scores["communication"],
        "overall": overall,
        "low_features": low_features,
        "improvement_suggestions": suggestions,
        "video_available": bool(video_available),
    }
    
    if return_details:
        result["_feature_vector"] = feature_vector.tolist()
        result["_raw_predictions"] = {k: float(_MODELS[k].predict(X)[0]) for k in _MODELS}
    
    return result


def _identify_low_features(
    features: Dict[str, Optional[float]],
    scores: Dict[str, int],
) -> List[str]:
    """
    Identify features that are contributing negatively to scores.
    
    Logic:
    - For each skill with low score (< 60), find important features
    - Check if those features have "bad" values
    """
    low_features = []
    
    # Define "bad" thresholds for key features
    bad_thresholds = {
        # High values are bad
        "silence_ratio": ("high", 0.3),
        "topic_drift_ratio": ("high", 0.3),
        "hedge_ratio": ("high", 0.3),
        "filler_word_ratio": ("high", 0.3),
        "audio_nervous_prob": ("high", 0.5),
        "monotony_score": ("high", 0.5),
        "gaze_variance": ("high", 0.5),
        "emotion_mismatch_score": ("high", 0.4),
        
        # Low values are bad
        "semantic_relevance_mean": ("low", 0.5),
        "assertive_phrase_ratio": ("low", 0.1),
        "empathy_phrase_ratio": ("low", 0.05),
        "eye_contact_ratio": ("low", 0.4),
        "audio_confidence_prob": ("low", 0.4),
        "emotion_consistency": ("low", 0.5),
    }
    
    for feat, (direction, threshold) in bad_thresholds.items():
        value = features.get(feat)
        if value is None:
            continue
        
        # Safely convert to float and check
        try:
            float_val = float(value)
            if np.isnan(float_val) or np.isinf(float_val):
                continue
        except (TypeError, ValueError):
            continue
        
        is_bad = False
        if direction == "high" and float_val > threshold:
            is_bad = True
        elif direction == "low" and float_val < threshold:
            is_bad = True
        
        if is_bad and feat not in low_features:
            low_features.append(feat)
    
    # Limit to top 5 most important
    return low_features[:5]


def _generate_suggestions(
    low_features: List[str],
    scores: Dict[str, int],
) -> List[str]:
    """Generate improvement suggestions based on low features and scores."""
    
    suggestions = []
    
    # Feature-specific suggestions
    feature_suggestions = {
        "silence_ratio": "Reduce pauses and hesitation in your responses",
        "audio_nervous_prob": "Practice speaking with a more calm and steady tone",
        "hedge_ratio": "Use more definitive language instead of hedging phrases like 'maybe' or 'I think'",
        "filler_word_ratio": "Minimize filler words like 'um', 'uh', 'like', 'you know'",
        "assertive_phrase_ratio": "Use more assertive language such as 'I did', 'I achieved', 'I led'",
        "monotony_score": "Add more variation to your voice tone and speaking pace",
        "topic_drift_ratio": "Stay more focused on the question being asked",
        "semantic_relevance_mean": "Keep your answers more relevant and on-topic",
        "empathy_phrase_ratio": "Use more empathetic language like 'I understand', 'I see your point'",
        "reflective_response_ratio": "Show understanding by reflecting back key points",
        "eye_contact_ratio": "Maintain more consistent eye contact with the camera",
        "audio_confidence_prob": "Project more confidence through your voice",
        "emotion_consistency": "Maintain a more consistent emotional tone throughout",
    }
    
    for feat in low_features:
        if feat in feature_suggestions:
            suggestions.append(feature_suggestions[feat])
    
    # Score-based general suggestions
    if scores.get("confidence", 100) < 50:
        suggestions.append("Focus on projecting confidence through body language and voice")
    
    if scores.get("clarity", 100) < 50:
        suggestions.append("Structure your responses with clear beginnings, middles, and ends")
    
    if scores.get("empathy", 100) < 50:
        suggestions.append("Show more engagement and understanding of the interviewer's perspective")
    
    # Deduplicate and limit
    seen = set()
    unique_suggestions = []
    for s in suggestions:
        if s not in seen:
            seen.add(s)
            unique_suggestions.append(s)
    
    return unique_suggestions[:5]


# =============================================================================
# BATCH SCORING
# =============================================================================

def score_batch(
    features_list: List[Dict[str, Optional[float]]],
) -> List[Dict]:
    """
    Score multiple sessions in batch.
    
    More efficient than calling score_session multiple times.
    """
    return [score_session(features) for features in features_list]


# =============================================================================
# MODEL INFO
# =============================================================================

def get_model_info() -> Dict:
    """Get information about the loaded models."""
    
    if not _MODELS_LOADED:
        _load_models()
    
    # Load training info if available
    info_path = os.path.join(MODELS_DIR, "training_info.json")
    training_info = {}
    if os.path.exists(info_path):
        with open(info_path, 'r') as f:
            training_info = json.load(f)
    
    return {
        "models_loaded": _MODELS_LOADED,
        "skills": list(_MODELS.keys()),
        "n_features": N_FEATURES,
        "feature_names": ALL_FEATURES,
        "training_info": training_info,
        "feature_importance": _FEATURE_IMPORTANCE,
    }


# =============================================================================
# INITIALIZATION
# =============================================================================

# Load models when module is imported
_load_models()


if __name__ == "__main__":
    # Test scoring
    print("Testing scoring engine...")
    
    # Sample features
    test_features = {
        "semantic_relevance_mean": 0.75,
        "topic_drift_ratio": 0.1,
        "assertive_phrase_ratio": 0.3,
        "filler_word_ratio": 0.05,
        "silence_ratio": 0.15,
        "audio_confidence_prob": 0.7,
        "audio_nervous_prob": 0.2,
        "monotony_score": 0.2,
    }
    
    result = score_session(test_features)
    
    print("\nScoring Result:")
    print(f"  Confidence: {result['confidence']}")
    print(f"  Clarity: {result['clarity']}")
    print(f"  Empathy: {result['empathy']}")
    print(f"  Communication: {result['communication']}")
    print(f"  Overall: {result['overall']}")
    print(f"  Video Available: {result['video_available']}")
    print(f"  Low Features: {result['low_features']}")
    print(f"  Suggestions: {result['improvement_suggestions']}")
