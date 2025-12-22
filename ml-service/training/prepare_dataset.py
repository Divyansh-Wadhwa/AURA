"""
SYNTHETIC DATASET GENERATOR
============================
Generates synthetic training data for the scoring model.

Each row = one interview session
Each column = one standardized metric (from perception layer)
Each label = skill score (0-100)

We simulate POST-PERCEPTION metrics, not raw text/audio/video.
"""

import numpy as np
import pandas as pd
from scipy import stats
from typing import Dict, List, Tuple
import os
import sys

# Add parent directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.decision.feature_schema import (
    TEXT_FEATURE_NAMES,
    AUDIO_FEATURE_NAMES,
    VIDEO_FEATURE_NAMES,
    ALL_FEATURE_NAMES,
    TARGET_NAMES,
    FEATURE_METADATA,
)


# =============================================================================
# FEATURE DISTRIBUTIONS (Realistic human-like patterns)
# =============================================================================

FEATURE_DISTRIBUTIONS: Dict[str, Dict] = {
    # TEXT METRICS
    "semantic_relevance_mean": {"dist": "beta", "a": 5, "b": 2},  # Skewed high (most people stay on topic)
    "semantic_relevance_std": {"dist": "beta", "a": 2, "b": 5},  # Skewed low (consistency)
    "topic_drift_ratio": {"dist": "beta", "a": 2, "b": 6},  # Skewed low (most don't drift much)
    "avg_sentence_length": {"dist": "normal", "mean": 15, "std": 5, "clip": (5, 40)},
    "sentence_length_std": {"dist": "normal", "mean": 6, "std": 3, "clip": (0, 20)},
    "avg_response_length_sec": {"dist": "normal", "mean": 45, "std": 20, "clip": (10, 120)},
    "response_length_consistency": {"dist": "beta", "a": 3, "b": 3},  # Centered
    "assertive_phrase_ratio": {"dist": "beta", "a": 2, "b": 5},  # Skewed low (assertiveness is rare)
    "modal_verb_ratio": {"dist": "beta", "a": 3, "b": 4},  # Slightly left-skewed
    "hedge_ratio": {"dist": "beta", "a": 2, "b": 6},  # Skewed low
    "filler_word_ratio": {"dist": "beta", "a": 2, "b": 5},  # Skewed low (fillers are minority)
    "empathy_phrase_ratio": {"dist": "beta", "a": 2, "b": 5},  # Empathy phrases are rare
    "reflective_response_ratio": {"dist": "beta", "a": 2, "b": 6},
    "question_back_ratio": {"dist": "beta", "a": 1.5, "b": 6},  # Very skewed low
    "avg_sentiment": {"dist": "normal", "mean": 0.2, "std": 0.3, "clip": (-1, 1)},  # Slightly positive
    "sentiment_variance": {"dist": "beta", "a": 2, "b": 4},
    "negative_spike_count": {"dist": "poisson", "lam": 1.5},  # Count data
    
    # AUDIO METRICS
    "speech_rate_wpm": {"dist": "normal", "mean": 140, "std": 25, "clip": (80, 200)},
    "speech_rate_variance": {"dist": "normal", "mean": 15, "std": 8, "clip": (0, 50)},
    "mean_pause_duration": {"dist": "normal", "mean": 0.8, "std": 0.4, "clip": (0.1, 3.0)},
    "pause_frequency": {"dist": "normal", "mean": 8, "std": 4, "clip": (0, 20)},
    "silence_ratio": {"dist": "beta", "a": 2, "b": 5},  # Skewed low
    "pitch_mean": {"dist": "normal", "mean": 150, "std": 40, "clip": (80, 300)},  # Gender-dependent in reality
    "pitch_variance": {"dist": "normal", "mean": 30, "std": 15, "clip": (0, 100)},
    "energy_mean": {"dist": "beta", "a": 3, "b": 3},  # Centered 0-1
    "energy_variance": {"dist": "beta", "a": 2, "b": 5},  # Low variance is common
    "monotony_score": {"dist": "beta", "a": 3, "b": 4},  # Slightly low (most have some expression)
    "audio_confidence_prob": {"dist": "beta", "a": 3, "b": 3},  # Centered
    "audio_nervous_prob": {"dist": "beta", "a": 2, "b": 4},  # Slightly low
    "audio_calm_prob": {"dist": "beta", "a": 3, "b": 3},  # Centered
    "emotion_consistency": {"dist": "beta", "a": 4, "b": 2},  # Skewed high (most are consistent)
    
    # VIDEO METRICS
    "eye_contact_ratio": {"dist": "beta", "a": 4, "b": 3},  # Slightly high
    "gaze_variance": {"dist": "beta", "a": 2, "b": 4},
    "head_turn_frequency": {"dist": "normal", "mean": 3, "std": 2, "clip": (0, 10)},
    "expression_variance": {"dist": "beta", "a": 3, "b": 3},
    "smile_ratio": {"dist": "beta", "a": 2, "b": 4},
    "neutral_face_ratio": {"dist": "beta", "a": 3, "b": 2},  # Most time is neutral
    "emotion_mismatch_score": {"dist": "beta", "a": 2, "b": 6},  # Low mismatch is common
}


# =============================================================================
# SCORING RUBRICS (Human-interpretable rules)
# =============================================================================
# These define how features contribute to each skill score.
# Positive weight = feature increases score
# Negative weight = feature decreases score

CONFIDENCE_RUBRIC: Dict[str, float] = {
    # Text features (reduced weights, more balanced)
    "assertive_phrase_ratio": 18.0,      # Strong positive: assertive language
    "hedge_ratio": -15.0,                # Negative: hedging shows uncertainty
    "filler_word_ratio": -14.0,          # Negative: fillers show nervousness
    "modal_verb_ratio": -10.0,           # Negative: tentative language
    "semantic_relevance_mean": 8.0,      # Positive: staying on topic shows confidence
    "topic_drift_ratio": -12.0,          # Negative: drifting shows lack of focus
    
    # Audio features
    "silence_ratio": -16.0,              # Negative: too much silence = hesitation
    "pitch_variance": 10.0,              # Positive: expressive = confident
    "monotony_score": -14.0,             # Negative: monotone = nervous/unsure
    "audio_confidence_prob": 15.0,       # Positive: model detected confidence
    "audio_nervous_prob": -18.0,         # Negative: model detected nervousness
    "speech_rate_variance": -6.0,        # Slightly negative: inconsistent pace
    
    # Video features
    "eye_contact_ratio": 12.0,           # Positive: eye contact = confidence
    "gaze_variance": -8.0,               # Negative: looking around = nervous
    "smile_ratio": 6.0,                  # Slightly positive
}

CLARITY_RUBRIC: Dict[str, float] = {
    # Text features (reduced weights)
    "semantic_relevance_mean": 15.0,     # Positive: on-topic responses
    "topic_drift_ratio": -18.0,          # Negative: drifting = unclear
    "avg_sentence_length": -0.2,         # Slightly negative: very long sentences hurt clarity
    "sentence_length_std": -4.0,         # Negative: inconsistent structure
    "response_length_consistency": 8.0,  # Positive: consistent response lengths
    "hedge_ratio": -12.0,                # Negative: hedging reduces clarity
    "filler_word_ratio": -10.0,          # Negative: fillers break flow
    
    # Audio features
    "speech_rate_wpm": 0.03,             # Slightly positive: reasonable pace
    "speech_rate_variance": -6.0,        # Negative: inconsistent pace hurts clarity
    "mean_pause_duration": -8.0,         # Negative: long pauses break flow
    "pause_frequency": -5.0,             # Negative: too many pauses
    "monotony_score": -8.0,              # Negative: monotone = hard to follow
    "energy_variance": 6.0,              # Positive: dynamic delivery
    
    # Video features
    "expression_variance": 8.0,          # Positive: expressive = engaging
    "emotion_mismatch_score": -12.0,     # Negative: mismatch = confusing
}

EMPATHY_RUBRIC: Dict[str, float] = {
    # Text features (increased weights to boost empathy scores)
    "empathy_phrase_ratio": 40.0,        # Strong positive: empathy phrases
    "reflective_response_ratio": 35.0,   # Positive: reflection shows understanding
    "question_back_ratio": 30.0,         # Positive: asking questions = engagement
    "avg_sentiment": 20.0,               # Positive: positive tone
    "negative_spike_count": -8.0,        # Negative: negative spikes
    "assertive_phrase_ratio": -3.0,      # Slightly negative: too assertive = less empathetic
    
    # Audio features
    "audio_calm_prob": 25.0,             # Positive: calm = composed, empathetic
    "audio_nervous_prob": -8.0,          # Negative: nervousness reduces connection
    "pitch_variance": 15.0,              # Positive: expressive voice
    "energy_variance": 18.0,             # Positive: engaged delivery
    "emotion_consistency": 18.0,         # Positive: stable emotions
    
    # Video features
    "eye_contact_ratio": 18.0,           # Positive: connection through eye contact
    "smile_ratio": 22.0,                 # Positive: warmth
    "expression_variance": 15.0,         # Positive: responsive expressions
    "neutral_face_ratio": -6.0,          # Slightly negative: too neutral = disengaged
}

COMMUNICATION_RUBRIC: Dict[str, float] = {
    # Text features (reduced weights)
    "semantic_relevance_mean": 12.0,
    "topic_drift_ratio": -14.0,
    "response_length_consistency": 8.0,
    "filler_word_ratio": -12.0,
    "hedge_ratio": -8.0,
    "avg_sentiment": 6.0,
    
    # Audio features
    "speech_rate_wpm": 0.02,             # Reasonable pace
    "speech_rate_variance": -5.0,
    "silence_ratio": -10.0,
    "pitch_variance": 10.0,
    "energy_mean": 8.0,
    "monotony_score": -12.0,
    "emotion_consistency": 10.0,
    
    # Video features
    "eye_contact_ratio": 10.0,
    "expression_variance": 8.0,
    "emotion_mismatch_score": -10.0,
}

ALL_RUBRICS: Dict[str, Dict[str, float]] = {
    "confidence": CONFIDENCE_RUBRIC,
    "clarity": CLARITY_RUBRIC,
    "empathy": EMPATHY_RUBRIC,
    "communication": COMMUNICATION_RUBRIC,
}


# =============================================================================
# SYNTHETIC DATA GENERATION FUNCTIONS
# =============================================================================

def sample_feature(feature_name: str, n_samples: int) -> np.ndarray:
    """Generate realistic samples for a single feature based on its distribution."""
    
    dist_config = FEATURE_DISTRIBUTIONS.get(feature_name)
    if dist_config is None:
        # Default to uniform if not specified
        return np.random.uniform(0, 1, n_samples)
    
    dist_type = dist_config["dist"]
    
    if dist_type == "beta":
        samples = np.random.beta(dist_config["a"], dist_config["b"], n_samples)
    
    elif dist_type == "normal":
        samples = np.random.normal(dist_config["mean"], dist_config["std"], n_samples)
        clip_min, clip_max = dist_config.get("clip", (-np.inf, np.inf))
        samples = np.clip(samples, clip_min, clip_max)
    
    elif dist_type == "poisson":
        samples = np.random.poisson(dist_config["lam"], n_samples).astype(float)
    
    else:
        samples = np.random.uniform(0, 1, n_samples)
    
    return samples


def generate_features(n_samples: int, include_video: bool = True) -> pd.DataFrame:
    """Generate synthetic feature matrix."""
    
    data = {}
    
    # Text features
    for feature in TEXT_FEATURE_NAMES:
        data[feature] = sample_feature(feature, n_samples)
    
    # Audio features
    for feature in AUDIO_FEATURE_NAMES:
        data[feature] = sample_feature(feature, n_samples)
    
    # Video features (optional)
    if include_video:
        for feature in VIDEO_FEATURE_NAMES:
            data[feature] = sample_feature(feature, n_samples)
    else:
        for feature in VIDEO_FEATURE_NAMES:
            data[feature] = np.full(n_samples, np.nan)
    
    return pd.DataFrame(data)


def compute_score_from_rubric(
    features: pd.DataFrame,
    rubric: Dict[str, float],
    base_score: float = 50.0,
    noise_std: float = 4.0,
) -> np.ndarray:
    """
    Compute skill score from features using the rubric.
    
    Score = base_score + sum(feature * weight) + noise
    Clamped to [0, 100]
    """
    n_samples = len(features)
    scores = np.full(n_samples, base_score)
    
    for feature_name, weight in rubric.items():
        if feature_name in features.columns:
            feature_values = features[feature_name].values
            
            # Handle NaN values (missing video features)
            mask = ~np.isnan(feature_values)
            
            # Normalize feature to roughly [-1, 1] range for consistent weighting
            if feature_name in FEATURE_METADATA:
                meta = FEATURE_METADATA[feature_name]
                low, high = meta["range"]
                normalized = (feature_values - (low + high) / 2) / ((high - low) / 2)
            else:
                normalized = feature_values - 0.5  # Assume 0-1 range
            
            # Apply weight (only where not NaN)
            contribution = np.zeros(n_samples)
            contribution[mask] = normalized[mask] * weight
            scores += contribution
    
    # Add Gaussian noise for realism
    noise = np.random.normal(0, noise_std, n_samples)
    scores += noise
    
    # Clamp to [0, 100]
    scores = np.clip(scores, 0, 100)
    
    return scores


def generate_labels(features: pd.DataFrame) -> pd.DataFrame:
    """Generate skill scores (labels) from features using rubrics."""
    
    # Skill-specific base scores to compensate for feature distribution skew
    # Lower base for skills that naturally score high, higher for empathy
    BASE_SCORES = {
        "confidence": 35.0,    # Natural features push this up
        "clarity": 30.0,       # Natural features push this up
        "empathy": 55.0,       # Natural features push this down
        "communication": 35.0, # Natural features push this up
    }
    
    labels = {}
    
    for skill_name, rubric in ALL_RUBRICS.items():
        base = BASE_SCORES.get(skill_name, 50.0)
        labels[skill_name] = compute_score_from_rubric(features, rubric, base_score=base)
    
    return pd.DataFrame(labels)


def generate_synthetic_dataset(
    n_samples: int = 5000,
    include_video: bool = True,
    video_availability_ratio: float = 0.6,
    random_seed: int = 42,
) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    Generate complete synthetic training dataset.
    
    Args:
        n_samples: Number of samples to generate
        include_video: Whether to include video features
        video_availability_ratio: Fraction of samples with video data
        random_seed: Random seed for reproducibility
    
    Returns:
        features: DataFrame with feature columns
        labels: DataFrame with skill score columns
    """
    np.random.seed(random_seed)
    
    # Generate features
    features = generate_features(n_samples, include_video=True)
    
    # Randomly mask video features for some samples
    if include_video:
        n_no_video = int(n_samples * (1 - video_availability_ratio))
        no_video_indices = np.random.choice(n_samples, n_no_video, replace=False)
        
        for feature in VIDEO_FEATURE_NAMES:
            features.loc[no_video_indices, feature] = np.nan
    
    # Generate labels from rubrics
    labels = generate_labels(features)
    
    return features, labels


def save_dataset(
    features: pd.DataFrame,
    labels: pd.DataFrame,
    output_dir: str,
    prefix: str = "synthetic",
) -> str:
    """Save dataset to CSV files."""
    
    os.makedirs(output_dir, exist_ok=True)
    
    # Combine features and labels
    combined = pd.concat([features, labels], axis=1)
    
    # Save paths
    features_path = os.path.join(output_dir, f"{prefix}_features.csv")
    labels_path = os.path.join(output_dir, f"{prefix}_labels.csv")
    combined_path = os.path.join(output_dir, f"{prefix}_training.csv")
    
    features.to_csv(features_path, index=False)
    labels.to_csv(labels_path, index=False)
    combined.to_csv(combined_path, index=False)
    
    print(f"Dataset saved:")
    print(f"  Features: {features_path}")
    print(f"  Labels: {labels_path}")
    print(f"  Combined: {combined_path}")
    
    return combined_path


def validate_dataset(features: pd.DataFrame, labels: pd.DataFrame) -> Dict:
    """Validate synthetic dataset quality."""
    
    validation_results = {
        "n_samples": len(features),
        "n_features": len(features.columns),
        "n_labels": len(labels.columns),
        "feature_stats": {},
        "label_stats": {},
        "correlations": {},
        "issues": [],
    }
    
    # Feature statistics
    for col in features.columns:
        col_data = features[col].dropna()
        validation_results["feature_stats"][col] = {
            "mean": float(col_data.mean()),
            "std": float(col_data.std()),
            "min": float(col_data.min()),
            "max": float(col_data.max()),
            "missing_ratio": float(features[col].isna().mean()),
        }
    
    # Label statistics
    for col in labels.columns:
        validation_results["label_stats"][col] = {
            "mean": float(labels[col].mean()),
            "std": float(labels[col].std()),
            "min": float(labels[col].min()),
            "max": float(labels[col].max()),
        }
    
    # Check for issues
    for col, stats in validation_results["label_stats"].items():
        if stats["std"] < 5:
            validation_results["issues"].append(f"Low variance in {col}: std={stats['std']:.2f}")
        if stats["mean"] < 20 or stats["mean"] > 80:
            validation_results["issues"].append(f"Skewed distribution in {col}: mean={stats['mean']:.2f}")
    
    # Top correlations between features and labels
    combined = pd.concat([features, labels], axis=1)
    for label in labels.columns:
        correlations = {}
        for feature in features.columns:
            if not features[feature].isna().all():
                corr = combined[[feature, label]].dropna().corr().iloc[0, 1]
                if not np.isnan(corr):
                    correlations[feature] = float(corr)
        
        # Sort by absolute correlation
        sorted_corr = sorted(correlations.items(), key=lambda x: abs(x[1]), reverse=True)
        validation_results["correlations"][label] = sorted_corr[:10]  # Top 10
    
    return validation_results


# =============================================================================
# MAIN EXECUTION
# =============================================================================

if __name__ == "__main__":
    import json
    import argparse
    
    parser = argparse.ArgumentParser(description="Generate synthetic training dataset")
    parser.add_argument("--n_samples", type=int, default=5000, help="Number of samples")
    parser.add_argument("--output_dir", type=str, default="./data", help="Output directory")
    parser.add_argument("--seed", type=int, default=42, help="Random seed")
    parser.add_argument("--video_ratio", type=float, default=0.6, help="Ratio of samples with video")
    
    args = parser.parse_args()
    
    print("=" * 60)
    print("SYNTHETIC DATASET GENERATOR")
    print("=" * 60)
    print(f"\nGenerating {args.n_samples} samples...")
    print(f"Video availability ratio: {args.video_ratio}")
    print(f"Random seed: {args.seed}")
    
    # Generate dataset
    features, labels = generate_synthetic_dataset(
        n_samples=args.n_samples,
        video_availability_ratio=args.video_ratio,
        random_seed=args.seed,
    )
    
    # Validate
    print("\nValidating dataset...")
    validation = validate_dataset(features, labels)
    
    print(f"\nDataset shape: {features.shape[0]} samples x {features.shape[1]} features")
    print(f"Labels: {list(labels.columns)}")
    
    print("\nLabel distributions:")
    for label, stats in validation["label_stats"].items():
        print(f"  {label}: mean={stats['mean']:.1f}, std={stats['std']:.1f}, range=[{stats['min']:.0f}, {stats['max']:.0f}]")
    
    if validation["issues"]:
        print("\nWarnings:")
        for issue in validation["issues"]:
            print(f"  ⚠️  {issue}")
    else:
        print("\n✓ No issues detected")
    
    print("\nTop feature correlations per label:")
    for label, corrs in validation["correlations"].items():
        print(f"\n  {label.upper()}:")
        for feat, corr in corrs[:5]:
            direction = "+" if corr > 0 else ""
            print(f"    {feat}: {direction}{corr:.3f}")
    
    # Save dataset
    print("\n" + "=" * 60)
    output_path = save_dataset(features, labels, args.output_dir)
    
    # Save validation report
    validation_path = os.path.join(args.output_dir, "validation_report.json")
    with open(validation_path, "w") as f:
        json.dump(validation, f, indent=2)
    print(f"  Validation: {validation_path}")
    
    print("\n✓ Dataset generation complete!")
    print("=" * 60)
