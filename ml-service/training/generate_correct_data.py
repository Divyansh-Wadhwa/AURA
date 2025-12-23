"""
CORRECT TRAINING DATA GENERATOR
================================
Generates synthetic training data with PROPER feature-to-score relationships.

The key insight is that scores should be DERIVED from features using domain knowledge,
not randomly assigned. This ensures the model learns correct patterns.

Feature-to-Score Mapping Philosophy:
====================================

CONFIDENCE is indicated by:
- HIGH assertive_phrase_ratio (using "I did", "I achieved", "I led")
- LOW hedge_ratio (avoiding "maybe", "perhaps", "I think")
- LOW filler_word_ratio (avoiding "um", "uh", "like")
- LOW silence_ratio (speaking fluently without long pauses)
- HIGH audio_confidence_prob (confident voice tone)
- LOW audio_nervous_prob (not nervous sounding)

CLARITY is indicated by:
- HIGH semantic_relevance_mean (staying on topic)
- LOW topic_drift_ratio (not drifting off topic)
- MODERATE avg_sentence_length (not too short, not too long)
- LOW filler_word_ratio (clear speech)
- HIGH response_length_consistency (consistent answer lengths)

EMPATHY is indicated by:
- HIGH empathy_phrase_ratio (using "I understand", "I see your point")
- HIGH reflective_response_ratio (reflecting back what was said)
- HIGH question_back_ratio (asking clarifying questions)
- POSITIVE avg_sentiment (warm, positive tone)
- HIGH audio_calm_prob (calm, warm voice)

COMMUNICATION is indicated by:
- Combination of all above
- LOW monotony_score (varied, engaging speech)
- HIGH emotion_consistency (stable emotional tone)
- HIGH eye_contact_ratio (engaging visually)
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Tuple
import os
import sys

# Add parent to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.decision.feature_contract import (
    ALL_FEATURES,
    TEXT_FEATURES,
    AUDIO_FEATURES,
    VIDEO_FEATURES,
    TARGET_LABELS,
    FEATURE_METADATA,
)

np.random.seed(42)


def generate_feature_sample(
    profile: str = "random",
    noise_level: float = 0.1,
) -> Dict[str, float]:
    """
    Generate a single sample with correlated features based on profile.
    
    Profiles:
    - "high_confidence": High assertiveness, low hedging
    - "low_confidence": Low assertiveness, high hedging
    - "high_empathy": High empathy phrases, positive sentiment
    - "low_empathy": Low empathy phrases, neutral/negative sentiment
    - "high_clarity": High relevance, low drift
    - "low_clarity": Low relevance, high drift
    - "balanced": Average across all dimensions
    - "random": Random profile selection
    """
    
    if profile == "random":
        profiles = ["high_confidence", "low_confidence", "high_empathy", 
                   "low_empathy", "high_clarity", "low_clarity", "balanced",
                   "high_all", "low_all"]
        profile = np.random.choice(profiles)
    
    features = {}
    
    # Generate base values based on profile
    if profile == "high_confidence":
        base_confidence = np.random.uniform(0.7, 0.95)
        base_empathy = np.random.uniform(0.3, 0.6)
        base_clarity = np.random.uniform(0.5, 0.8)
    elif profile == "low_confidence":
        base_confidence = np.random.uniform(0.1, 0.35)
        base_empathy = np.random.uniform(0.3, 0.7)
        base_clarity = np.random.uniform(0.4, 0.7)
    elif profile == "high_empathy":
        base_confidence = np.random.uniform(0.4, 0.7)
        base_empathy = np.random.uniform(0.7, 0.95)
        base_clarity = np.random.uniform(0.5, 0.8)
    elif profile == "low_empathy":
        base_confidence = np.random.uniform(0.4, 0.8)
        base_empathy = np.random.uniform(0.05, 0.3)
        base_clarity = np.random.uniform(0.5, 0.8)
    elif profile == "high_clarity":
        base_confidence = np.random.uniform(0.4, 0.7)
        base_empathy = np.random.uniform(0.3, 0.6)
        base_clarity = np.random.uniform(0.75, 0.95)
    elif profile == "low_clarity":
        base_confidence = np.random.uniform(0.3, 0.6)
        base_empathy = np.random.uniform(0.3, 0.6)
        base_clarity = np.random.uniform(0.1, 0.35)
    elif profile == "high_all":
        base_confidence = np.random.uniform(0.75, 0.95)
        base_empathy = np.random.uniform(0.75, 0.95)
        base_clarity = np.random.uniform(0.75, 0.95)
    elif profile == "low_all":
        base_confidence = np.random.uniform(0.1, 0.3)
        base_empathy = np.random.uniform(0.1, 0.3)
        base_clarity = np.random.uniform(0.1, 0.3)
    else:  # balanced
        base_confidence = np.random.uniform(0.4, 0.6)
        base_empathy = np.random.uniform(0.4, 0.6)
        base_clarity = np.random.uniform(0.4, 0.6)
    
    # Add noise
    def add_noise(val, noise=noise_level):
        return np.clip(val + np.random.uniform(-noise, noise), 0, 1)
    
    # =========================================================================
    # TEXT FEATURES - Correlated with base scores
    # =========================================================================
    
    # Clarity-related text features
    features["semantic_relevance_mean"] = add_noise(base_clarity * 0.9 + 0.1)
    features["semantic_relevance_std"] = add_noise((1 - base_clarity) * 0.4)
    features["topic_drift_ratio"] = add_noise((1 - base_clarity) * 0.5)
    
    # Sentence structure
    features["avg_sentence_length"] = 8 + base_clarity * 15 + np.random.uniform(-3, 3)
    features["avg_sentence_length"] = np.clip(features["avg_sentence_length"], 5, 35)
    features["sentence_length_std"] = 2 + (1 - base_clarity) * 8 + np.random.uniform(-1, 1)
    features["sentence_length_std"] = np.clip(features["sentence_length_std"], 1, 15)
    
    # Response timing (for text-only, these are less relevant but still generated)
    features["avg_response_length_sec"] = 15 + base_clarity * 30 + np.random.uniform(-5, 5)
    features["response_length_consistency"] = add_noise(base_clarity * 0.7 + 0.1)
    
    # Confidence-related text features
    features["assertive_phrase_ratio"] = add_noise(base_confidence * 0.4)
    features["modal_verb_ratio"] = add_noise((1 - base_confidence) * 0.3 + 0.05)
    features["hedge_ratio"] = add_noise((1 - base_confidence) * 0.4)
    features["filler_word_ratio"] = add_noise((1 - base_confidence) * 0.3)
    
    # Empathy-related text features
    features["empathy_phrase_ratio"] = add_noise(base_empathy * 0.5)
    features["reflective_response_ratio"] = add_noise(base_empathy * 0.4)
    features["question_back_ratio"] = add_noise(base_empathy * 0.3)
    
    # Sentiment
    features["avg_sentiment"] = (base_empathy * 0.6 + base_confidence * 0.2) * 2 - 1  # [-1, 1]
    features["avg_sentiment"] = np.clip(features["avg_sentiment"] + np.random.uniform(-0.2, 0.2), -1, 1)
    features["sentiment_variance"] = add_noise((1 - base_empathy) * 0.3 + 0.05)
    features["negative_spike_count"] = int((1 - base_empathy) * 5 + np.random.randint(0, 3))
    
    # =========================================================================
    # AUDIO FEATURES - Correlated with base scores
    # =========================================================================
    
    features["speech_rate_wpm"] = 100 + base_confidence * 60 + np.random.uniform(-20, 20)
    features["speech_rate_variance"] = 5 + (1 - base_confidence) * 20 + np.random.uniform(-3, 3)
    features["mean_pause_duration"] = 0.3 + (1 - base_confidence) * 1.5 + np.random.uniform(-0.2, 0.2)
    features["pause_frequency"] = 5 + (1 - base_confidence) * 15 + np.random.uniform(-2, 2)
    features["silence_ratio"] = add_noise((1 - base_confidence) * 0.4)
    
    features["pitch_mean"] = 100 + base_empathy * 100 + np.random.uniform(-20, 20)
    features["pitch_variance"] = 10 + base_confidence * 30 + np.random.uniform(-5, 5)
    features["energy_mean"] = add_noise(base_confidence * 0.5 + 0.3)
    features["energy_variance"] = add_noise(base_confidence * 0.3 + 0.1)
    
    features["monotony_score"] = add_noise((1 - base_confidence) * 0.5 + (1 - base_clarity) * 0.2)
    features["audio_confidence_prob"] = add_noise(base_confidence * 0.8 + 0.1)
    features["audio_nervous_prob"] = add_noise((1 - base_confidence) * 0.6)
    features["audio_calm_prob"] = add_noise(base_empathy * 0.6 + 0.2)
    features["emotion_consistency"] = add_noise(base_empathy * 0.5 + base_clarity * 0.3 + 0.1)
    
    # =========================================================================
    # VIDEO FEATURES - Correlated with base scores
    # =========================================================================
    
    # Some samples have video, some don't
    has_video = np.random.random() > 0.3  # 70% have video
    
    if has_video:
        base_communication = (base_confidence + base_empathy + base_clarity) / 3
        features["eye_contact_ratio"] = add_noise(base_communication * 0.7 + 0.2)
        features["gaze_variance"] = add_noise((1 - base_communication) * 0.4)
        features["head_turn_frequency"] = 1 + (1 - base_communication) * 5 + np.random.uniform(-0.5, 0.5)
        features["expression_variance"] = add_noise(base_empathy * 0.4 + 0.2)
        features["smile_ratio"] = add_noise(base_empathy * 0.5)
        features["neutral_face_ratio"] = add_noise((1 - base_empathy) * 0.5 + 0.2)
        features["emotion_mismatch_score"] = add_noise((1 - base_communication) * 0.3)
    else:
        # Set video features to None (will be imputed)
        for feat in VIDEO_FEATURES:
            features[feat] = None
    
    return features, base_confidence, base_empathy, base_clarity


def calculate_scores(
    features: Dict[str, float],
    base_confidence: float,
    base_empathy: float,
    base_clarity: float,
) -> Dict[str, float]:
    """
    Calculate scores based on features using domain knowledge.
    
    This is the CORRECT mapping that the model should learn.
    Scores are 0-100.
    """
    
    # =========================================================================
    # CONFIDENCE SCORE (0-100)
    # =========================================================================
    confidence_score = 0.0
    
    # Text features contributing to confidence
    assertive = features.get("assertive_phrase_ratio", 0.1)
    hedge = features.get("hedge_ratio", 0.1)
    filler = features.get("filler_word_ratio", 0.1)
    
    # Audio features
    audio_conf = features.get("audio_confidence_prob", 0.5)
    audio_nerv = features.get("audio_nervous_prob", 0.3)
    silence = features.get("silence_ratio", 0.2)
    monotony = features.get("monotony_score", 0.3)
    
    # Weighted combination
    confidence_score = (
        assertive * 100 * 0.25 +           # More assertive = higher confidence
        (1 - hedge) * 100 * 0.15 +         # Less hedging = higher confidence
        (1 - filler) * 100 * 0.15 +        # Fewer fillers = higher confidence
        audio_conf * 100 * 0.20 +          # Confident voice = higher confidence
        (1 - audio_nerv) * 100 * 0.10 +    # Less nervous = higher confidence
        (1 - silence) * 100 * 0.10 +       # Less silence = higher confidence
        (1 - monotony) * 100 * 0.05        # Less monotone = higher confidence
    )
    
    # =========================================================================
    # CLARITY SCORE (0-100)
    # =========================================================================
    
    relevance = features.get("semantic_relevance_mean", 0.7)
    drift = features.get("topic_drift_ratio", 0.15)
    filler = features.get("filler_word_ratio", 0.1)
    consistency = features.get("response_length_consistency", 0.5)
    
    clarity_score = (
        relevance * 100 * 0.35 +           # More relevant = higher clarity
        (1 - drift) * 100 * 0.30 +         # Less drift = higher clarity
        (1 - filler) * 100 * 0.15 +        # Fewer fillers = higher clarity
        consistency * 100 * 0.20           # More consistent = higher clarity
    )
    
    # =========================================================================
    # EMPATHY SCORE (0-100)
    # =========================================================================
    
    empathy_phrases = features.get("empathy_phrase_ratio", 0.05)
    reflective = features.get("reflective_response_ratio", 0.1)
    questions = features.get("question_back_ratio", 0.1)
    sentiment = features.get("avg_sentiment", 0)  # [-1, 1]
    sentiment_normalized = (sentiment + 1) / 2  # [0, 1]
    audio_calm = features.get("audio_calm_prob", 0.5)
    
    empathy_score = (
        empathy_phrases * 100 * 0.35 +     # More empathy phrases = higher empathy
        reflective * 100 * 0.20 +          # More reflection = higher empathy
        questions * 100 * 0.15 +           # More questions = higher empathy
        sentiment_normalized * 100 * 0.15 + # More positive = higher empathy
        audio_calm * 100 * 0.15            # Calmer voice = higher empathy
    )
    
    # =========================================================================
    # COMMUNICATION SCORE (0-100)
    # =========================================================================
    
    # Communication is a blend of all skills plus some unique factors
    relevance = features.get("semantic_relevance_mean", 0.7)
    monotony = features.get("monotony_score", 0.3)
    emotion_consistency = features.get("emotion_consistency", 0.6)
    filler = features.get("filler_word_ratio", 0.1)
    
    # Video factors (if available)
    eye_contact = features.get("eye_contact_ratio")
    if eye_contact is None:
        eye_contact = 0.6  # Default
    
    communication_score = (
        relevance * 100 * 0.25 +           # Relevant = better communication
        (1 - monotony) * 100 * 0.20 +      # Varied = better communication
        emotion_consistency * 100 * 0.15 + # Consistent emotions = better
        (1 - filler) * 100 * 0.15 +        # Fewer fillers = better
        eye_contact * 100 * 0.25           # Eye contact = better
    )
    
    # Add some noise to make it realistic
    noise = np.random.uniform(-3, 3)
    
    return {
        "confidence": np.clip(confidence_score + noise, 0, 100),
        "clarity": np.clip(clarity_score + noise, 0, 100),
        "empathy": np.clip(empathy_score + noise, 0, 100),
        "communication": np.clip(communication_score + noise, 0, 100),
    }


def generate_dataset(n_samples: int = 5000) -> pd.DataFrame:
    """Generate a complete training dataset with proper correlations."""
    
    print(f"Generating {n_samples} samples with correct feature-score correlations...")
    
    rows = []
    
    for i in range(n_samples):
        # Generate features
        features, base_conf, base_emp, base_clar = generate_feature_sample(profile="random")
        
        # Calculate scores based on features
        scores = calculate_scores(features, base_conf, base_emp, base_clar)
        
        # Combine into row
        row = {}
        for feat in ALL_FEATURES:
            val = features.get(feat)
            if val is not None:
                row[feat] = val
            else:
                # For missing video features, use NaN (will be handled by training)
                row[feat] = np.nan
        
        # Add scores
        row["confidence"] = scores["confidence"]
        row["clarity"] = scores["clarity"]
        row["empathy"] = scores["empathy"]
        row["communication"] = scores["communication"]
        row["data_source"] = "synthetic_v2"
        
        rows.append(row)
        
        if (i + 1) % 1000 == 0:
            print(f"  Generated {i + 1}/{n_samples} samples...")
    
    df = pd.DataFrame(rows)
    
    # Validate correlations
    print("\nValidating feature-score correlations:")
    expected_correlations = [
        ("assertive_phrase_ratio", "confidence", "positive"),
        ("empathy_phrase_ratio", "empathy", "positive"),
        ("semantic_relevance_mean", "clarity", "positive"),
        ("topic_drift_ratio", "clarity", "negative"),
        ("hedge_ratio", "confidence", "negative"),
        ("filler_word_ratio", "confidence", "negative"),
    ]
    
    all_correct = True
    for feat, label, expected in expected_correlations:
        if feat in df.columns and label in df.columns:
            corr = df[feat].corr(df[label])
            actual = "positive" if corr > 0 else "negative"
            status = "✓" if actual == expected else "✗"
            print(f"  {status} {feat} → {label}: expected {expected}, got {actual} (r={corr:.3f})")
            if actual != expected:
                all_correct = False
    
    if all_correct:
        print("\n✅ All correlations are correct!")
    else:
        print("\n⚠️  Some correlations are incorrect - check the generation logic")
    
    return df


def main():
    """Generate and save the corrected training dataset."""
    
    print("=" * 60)
    print("GENERATING CORRECTED TRAINING DATA")
    print("=" * 60)
    
    # Generate dataset
    df = generate_dataset(n_samples=5000)
    
    # Save dataset
    output_path = os.path.join(os.path.dirname(__file__), "..", "data", "corrected_training.csv")
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    df.to_csv(output_path, index=False)
    
    print(f"\n✓ Dataset saved to: {output_path}")
    print(f"  Samples: {len(df)}")
    print(f"  Features: {len(ALL_FEATURES)}")
    print(f"  Labels: {TARGET_LABELS}")
    
    # Show score distributions
    print("\nScore distributions:")
    for label in TARGET_LABELS:
        mean = df[label].mean()
        std = df[label].std()
        min_val = df[label].min()
        max_val = df[label].max()
        print(f"  {label}: {mean:.1f} ± {std:.1f} (range: {min_val:.1f} - {max_val:.1f})")
    
    return df


if __name__ == "__main__":
    main()
