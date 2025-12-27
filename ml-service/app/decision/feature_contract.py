"""
FROZEN FEATURE CONTRACT
========================
This file defines the EXACT feature order and preprocessing rules
for the decision layer. This contract is IMMUTABLE after training.

DO NOT MODIFY without retraining all models.

Version: 1.0.0
Last Updated: 2025-12-23
"""

from typing import Dict, List, Optional, Tuple
import numpy as np

# =============================================================================
# FROZEN FEATURE ORDER (DO NOT CHANGE)
# =============================================================================

# Text metrics (27 features) - Updated with vagueness + semantic depth + LLM metrics
TEXT_FEATURES: List[str] = [
    "semantic_relevance_mean",      # 0: Cosine similarity to topic centroid
    "semantic_relevance_std",       # 1: Variance in topic adherence
    "topic_drift_ratio",            # 2: Proportion of off-topic responses
    "avg_sentence_length",          # 3: Mean words per sentence
    "sentence_length_std",          # 4: Variance in sentence length
    "avg_response_length_sec",      # 5: Mean response duration
    "response_length_consistency",  # 6: Consistency in response lengths
    "assertive_phrase_ratio",       # 7: Ratio of assertive phrases
    "modal_verb_ratio",             # 8: Ratio of modal verbs (might, could)
    "hedge_ratio",                  # 9: Ratio of hedging phrases
    "filler_word_ratio",            # 10: Ratio of filler words
    "vague_phrase_ratio",           # 11: Ratio of vague/non-specific phrases
    "information_density",          # 12: Content words / total words (Step 2)
    "specificity_score",            # 13: Named entities / sentences (Step 2)
    "redundancy_score",             # 14: Avg similarity between sentences (Step 2)
    "answer_depth_score",           # 15: Weighted depth score (Step 2)
    "llm_confidence_mean",          # 16: LLM-inferred implicit confidence (Step 3)
    "llm_clarity_mean",             # 17: LLM-inferred semantic clarity (Step 3)
    "llm_depth_mean",               # 18: LLM-inferred answer depth (Step 3)
    "llm_empathy_mean",             # 19: LLM-inferred empathy (Step 3)
    "llm_evasion_mean",             # 20: LLM-inferred evasion probability (Step 3)
    "empathy_phrase_ratio",         # 21: Ratio of empathy phrases
    "reflective_response_ratio",    # 22: Ratio of reflective responses
    "question_back_ratio",          # 23: Ratio of questions asked back
    "avg_sentiment",                # 24: Mean sentiment score [-1, 1]
    "sentiment_variance",           # 25: Variance in sentiment
    "negative_spike_count",         # 26: Count of negative sentiment spikes
]

# Audio metrics (14 features)
AUDIO_FEATURES: List[str] = [
    "speech_rate_wpm",              # 17: Words per minute
    "speech_rate_variance",         # 18: Variance in speech rate
    "mean_pause_duration",          # 19: Average pause length (seconds)
    "pause_frequency",              # 20: Pauses per minute
    "silence_ratio",                # 21: Proportion of silence
    "pitch_mean",                   # 22: Mean pitch (Hz)
    "pitch_variance",               # 23: Pitch variation
    "energy_mean",                  # 24: Mean energy level
    "energy_variance",              # 25: Energy variation
    "monotony_score",               # 26: Monotonicity (0=varied, 1=flat)
    "audio_confidence_prob",        # 27: P(confident) from audio model
    "audio_nervous_prob",           # 28: P(nervous) from audio model
    "audio_calm_prob",              # 29: P(calm) from audio model
    "emotion_consistency",          # 30: Emotional stability score
]

# Video metrics (7 features) - OPTIONAL MODALITY
# These are extracted by MediaPipe in the browser
VIDEO_FEATURES: List[str] = [
    "face_presence_ratio",          # 27: Proportion of frames with face detected
    "eye_contact_ratio",            # 28: Proportion with eye contact (facing camera)
    "head_motion_variance",         # 29: Variance in head movement (nervousness indicator)
    "facial_engagement_score",      # 30: Facial activity/engagement level
    "smile_ratio",                  # 31: Proportion of frames with smile detected
    "gaze_variance",                # 32: Variance in gaze direction
    "video_available",              # 33: Binary flag indicating video was available
]

# Complete feature vector (48 features total: 27 text + 14 audio + 7 video)
ALL_FEATURES: List[str] = TEXT_FEATURES + AUDIO_FEATURES + VIDEO_FEATURES

# Target labels
TARGET_LABELS: List[str] = ["confidence", "clarity", "empathy", "communication"]

# Feature indices for quick lookup
FEATURE_INDEX: Dict[str, int] = {name: idx for idx, name in enumerate(ALL_FEATURES)}

# =============================================================================
# FEATURE METADATA
# =============================================================================

FEATURE_METADATA: Dict[str, Dict] = {
    # Text features
    "semantic_relevance_mean": {"min": 0.0, "max": 1.0, "default": 0.7, "modality": "text"},
    "semantic_relevance_std": {"min": 0.0, "max": 1.0, "default": 0.2, "modality": "text"},
    "topic_drift_ratio": {"min": 0.0, "max": 1.0, "default": 0.15, "modality": "text"},
    "avg_sentence_length": {"min": 1.0, "max": 50.0, "default": 15.0, "modality": "text"},
    "sentence_length_std": {"min": 0.0, "max": 20.0, "default": 5.0, "modality": "text"},
    "avg_response_length_sec": {"min": 1.0, "max": 120.0, "default": 30.0, "modality": "text"},
    "response_length_consistency": {"min": 0.0, "max": 1.0, "default": 0.5, "modality": "text"},
    "assertive_phrase_ratio": {"min": 0.0, "max": 1.0, "default": 0.1, "modality": "text"},
    "modal_verb_ratio": {"min": 0.0, "max": 1.0, "default": 0.1, "modality": "text"},
    "hedge_ratio": {"min": 0.0, "max": 1.0, "default": 0.1, "modality": "text"},
    "filler_word_ratio": {"min": 0.0, "max": 1.0, "default": 0.1, "modality": "text"},
    "vague_phrase_ratio": {"min": 0.0, "max": 1.0, "default": 0.15, "modality": "text"},
    "information_density": {"min": 0.0, "max": 1.0, "default": 0.5, "modality": "text"},
    "specificity_score": {"min": 0.0, "max": 1.0, "default": 0.3, "modality": "text"},
    "redundancy_score": {"min": 0.0, "max": 1.0, "default": 0.3, "modality": "text"},
    "answer_depth_score": {"min": 0.0, "max": 1.0, "default": 0.4, "modality": "text"},
    "llm_confidence_mean": {"min": 0.0, "max": 1.0, "default": 0.5, "modality": "text"},
    "llm_clarity_mean": {"min": 0.0, "max": 1.0, "default": 0.5, "modality": "text"},
    "llm_depth_mean": {"min": 0.0, "max": 1.0, "default": 0.5, "modality": "text"},
    "llm_empathy_mean": {"min": 0.0, "max": 1.0, "default": 0.5, "modality": "text"},
    "llm_evasion_mean": {"min": 0.0, "max": 1.0, "default": 0.5, "modality": "text"},
    "empathy_phrase_ratio": {"min": 0.0, "max": 1.0, "default": 0.05, "modality": "text"},
    "reflective_response_ratio": {"min": 0.0, "max": 1.0, "default": 0.1, "modality": "text"},
    "question_back_ratio": {"min": 0.0, "max": 1.0, "default": 0.1, "modality": "text"},
    "avg_sentiment": {"min": -1.0, "max": 1.0, "default": 0.0, "modality": "text"},
    "sentiment_variance": {"min": 0.0, "max": 1.0, "default": 0.2, "modality": "text"},
    "negative_spike_count": {"min": 0.0, "max": 20.0, "default": 1.0, "modality": "text"},
    
    # Audio features
    "speech_rate_wpm": {"min": 60.0, "max": 250.0, "default": 140.0, "modality": "audio"},
    "speech_rate_variance": {"min": 0.0, "max": 50.0, "default": 10.0, "modality": "audio"},
    "mean_pause_duration": {"min": 0.1, "max": 5.0, "default": 0.8, "modality": "audio"},
    "pause_frequency": {"min": 0.0, "max": 30.0, "default": 8.0, "modality": "audio"},
    "silence_ratio": {"min": 0.0, "max": 1.0, "default": 0.2, "modality": "audio"},
    "pitch_mean": {"min": 50.0, "max": 400.0, "default": 150.0, "modality": "audio"},
    "pitch_variance": {"min": 0.0, "max": 100.0, "default": 25.0, "modality": "audio"},
    "energy_mean": {"min": 0.0, "max": 1.0, "default": 0.5, "modality": "audio"},
    "energy_variance": {"min": 0.0, "max": 0.5, "default": 0.15, "modality": "audio"},
    "monotony_score": {"min": 0.0, "max": 1.0, "default": 0.3, "modality": "audio"},
    "audio_confidence_prob": {"min": 0.0, "max": 1.0, "default": 0.5, "modality": "audio"},
    "audio_nervous_prob": {"min": 0.0, "max": 1.0, "default": 0.3, "modality": "audio"},
    "audio_calm_prob": {"min": 0.0, "max": 1.0, "default": 0.5, "modality": "audio"},
    "emotion_consistency": {"min": 0.0, "max": 1.0, "default": 0.6, "modality": "audio"},
    
    # Video features (optional) - from MediaPipe browser analysis
    "face_presence_ratio": {"min": 0.0, "max": 1.0, "default": 0.5, "modality": "video", "optional": True},
    "eye_contact_ratio": {"min": 0.0, "max": 1.0, "default": 0.5, "modality": "video", "optional": True},
    "head_motion_variance": {"min": 0.0, "max": 1.0, "default": 0.3, "modality": "video", "optional": True},
    "facial_engagement_score": {"min": 0.0, "max": 1.0, "default": 0.4, "modality": "video", "optional": True},
    "smile_ratio": {"min": 0.0, "max": 1.0, "default": 0.3, "modality": "video", "optional": True},
    "gaze_variance": {"min": 0.0, "max": 1.0, "default": 0.3, "modality": "video", "optional": True},
    "video_available": {"min": 0.0, "max": 1.0, "default": 0.0, "modality": "video", "optional": True},
}


# =============================================================================
# PREPROCESSING FUNCTIONS
# =============================================================================

def get_video_available(features: Dict[str, Optional[float]]) -> int:
    """
    Determine if video modality is available.
    Returns 1 if any video feature is not None, 0 otherwise.
    """
    for feat in VIDEO_FEATURES:
        if feat in features and features[feat] is not None:
            return 1
    return 0


def impute_missing_features(
    features: Dict[str, Optional[float]],
    video_available: bool = False,
) -> Dict[str, float]:
    """
    Impute missing features with neutral/default values.
    
    Rules:
    1. Text and audio features: Use default values if missing
    2. Video features: 
       - If video_available=True: Use default values
       - If video_available=False: Use neutral values (0.5 or 0.0)
    
    This is DETERMINISTIC - same input always produces same output.
    """
    imputed = {}
    
    for feature_name in ALL_FEATURES:
        meta = FEATURE_METADATA[feature_name]
        value = features.get(feature_name)
        
        # Check if value is valid (not None, not NaN, is numeric)
        is_valid = False
        if value is not None:
            try:
                # Convert to float and check for NaN/Inf
                float_val = float(value)
                if not (np.isnan(float_val) or np.isinf(float_val)):
                    is_valid = True
                    value = float_val
            except (TypeError, ValueError):
                is_valid = False
        
        if is_valid:
            # Clip to valid range
            imputed[feature_name] = float(np.clip(value, meta["min"], meta["max"]))
        else:
            # Impute missing value
            if meta.get("optional", False):
                # Video feature - use neutral if video not available
                if video_available:
                    imputed[feature_name] = meta["default"]
                else:
                    # Neutral values for missing video
                    imputed[feature_name] = 0.0  # Will be masked by video_available flag
            else:
                # Required feature - use default
                imputed[feature_name] = meta["default"]
    
    return imputed


def build_feature_vector(
    features: Dict[str, Optional[float]],
) -> Tuple[np.ndarray, int]:
    """
    Build the feature vector from a dictionary of features.
    
    Returns:
        - feature_vector: np.ndarray of shape (38,)
        - video_available: 1 if video data present, 0 otherwise
    
    This is the ONLY way to create input for the models.
    """
    # Determine video availability
    video_available = get_video_available(features)
    
    # Impute missing features
    imputed = impute_missing_features(features, video_available=bool(video_available))
    
    # Build vector in EXACT order
    vector = np.array([imputed[feat] for feat in ALL_FEATURES], dtype=np.float32)
    
    return vector, video_available


def validate_feature_vector(vector: np.ndarray) -> bool:
    """Validate that feature vector is well-formed."""
    if vector.shape != (len(ALL_FEATURES),):
        return False
    if np.any(np.isnan(vector)):
        return False
    if np.any(np.isinf(vector)):
        return False
    return True


# =============================================================================
# EXPORT SCHEMA AS JSON (for persistence)
# =============================================================================

def export_schema() -> Dict:
    """Export the complete schema as a dictionary (for JSON serialization)."""
    return {
        "version": "1.0.0",
        "n_features": len(ALL_FEATURES),
        "n_text_features": len(TEXT_FEATURES),
        "n_audio_features": len(AUDIO_FEATURES),
        "n_video_features": len(VIDEO_FEATURES),
        "feature_order": ALL_FEATURES,
        "target_labels": TARGET_LABELS,
        "feature_metadata": FEATURE_METADATA,
        "text_features": TEXT_FEATURES,
        "audio_features": AUDIO_FEATURES,
        "video_features": VIDEO_FEATURES,
    }


# =============================================================================
# CONSTANTS
# =============================================================================

N_FEATURES = len(ALL_FEATURES)  # 48 (27 text + 14 audio + 7 video)
N_TEXT_FEATURES = len(TEXT_FEATURES)  # 27
N_AUDIO_FEATURES = len(AUDIO_FEATURES)  # 14
N_VIDEO_FEATURES = len(VIDEO_FEATURES)  # 7
N_TARGETS = len(TARGET_LABELS)  # 4


if __name__ == "__main__":
    # Print schema summary
    print("=" * 60)
    print("FROZEN FEATURE CONTRACT")
    print("=" * 60)
    print(f"\nTotal features: {N_FEATURES}")
    print(f"  Text features: {N_TEXT_FEATURES}")
    print(f"  Audio features: {N_AUDIO_FEATURES}")
    print(f"  Video features: {N_VIDEO_FEATURES}")
    print(f"\nTarget labels: {TARGET_LABELS}")
    print(f"\nFeature order (FROZEN):")
    for i, feat in enumerate(ALL_FEATURES):
        meta = FEATURE_METADATA[feat]
        optional = " (OPTIONAL)" if meta.get("optional", False) else ""
        print(f"  [{i:2d}] {feat}: [{meta['min']}, {meta['max']}] default={meta['default']}{optional}")
