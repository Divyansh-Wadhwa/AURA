"""
Normalization Utilities - Z-score and Min-Max normalization for features.
Uses predefined global statistics without updating state during inference.
"""

import numpy as np
from typing import Dict, Any, Optional
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)


@dataclass
class FeatureStatistics:
    """Predefined statistics for feature normalization."""
    mean: float = 0.0
    std: float = 1.0
    min_val: float = 0.0
    max_val: float = 1.0


# Global feature statistics (predefined baselines)
# These are calibrated based on actual interview session distributions
# For min-max normalization: raw values are scaled to [0,1] based on [min_val, max_val]
# The normalized value = raw value directly (no artificial scaling) for ratio metrics
GLOBAL_STATISTICS: Dict[str, FeatureStatistics] = {
    # Text metrics - ranges set to preserve raw signal integrity
    # For ratios that are already 0-1, we pass through with minimal transformation
    "semantic_relevance_mean": FeatureStatistics(0.4, 0.2, 0.0, 1.0),
    "semantic_relevance_std": FeatureStatistics(0.1, 0.08, 0.0, 1.0),
    "topic_drift_ratio": FeatureStatistics(0.3, 0.2, 0.0, 1.0),
    "avg_sentence_length": FeatureStatistics(12.0, 6.0, 0.0, 30.0),  # words per sentence
    "sentence_length_std": FeatureStatistics(4.0, 3.0, 0.0, 15.0),
    "avg_response_length_sec": FeatureStatistics(20.0, 15.0, 0.0, 60.0),
    "response_length_consistency": FeatureStatistics(0.8, 0.15, 0.0, 1.0),
    # Linguistic ratios - these are word counts / total words, typically 0-0.2
    # Use max_val=1.0 to preserve the raw ratio as-is (already meaningful)
    "assertive_phrase_ratio": FeatureStatistics(0.05, 0.05, 0.0, 1.0),
    "modal_verb_ratio": FeatureStatistics(0.05, 0.04, 0.0, 1.0),
    "hedge_ratio": FeatureStatistics(0.03, 0.03, 0.0, 1.0),
    "filler_word_ratio": FeatureStatistics(0.02, 0.02, 0.0, 1.0),
    "empathy_phrase_ratio": FeatureStatistics(0.1, 0.15, 0.0, 1.0),
    "reflective_response_ratio": FeatureStatistics(0.05, 0.1, 0.0, 1.0),
    "question_back_ratio": FeatureStatistics(0.1, 0.15, 0.0, 1.0),
    "avg_sentiment": FeatureStatistics(0.2, 0.4, -1.0, 1.0),
    "sentiment_variance": FeatureStatistics(0.1, 0.15, 0.0, 1.0),
    "negative_spike_count": FeatureStatistics(0.5, 1.0, 0.0, 10.0),
    
    # Audio metrics
    "speech_rate_wpm": FeatureStatistics(140.0, 30.0, 80.0, 220.0),
    "speech_rate_variance": FeatureStatistics(400.0, 300.0, 0.0, 2000.0),
    "mean_pause_duration": FeatureStatistics(0.8, 0.4, 0.0, 3.0),
    "pause_frequency": FeatureStatistics(0.5, 0.3, 0.0, 2.0),
    "silence_ratio": FeatureStatistics(0.25, 0.15, 0.0, 0.8),
    "pitch_mean": FeatureStatistics(180.0, 60.0, 80.0, 350.0),
    "pitch_variance": FeatureStatistics(1500.0, 1000.0, 0.0, 5000.0),
    "energy_mean": FeatureStatistics(0.05, 0.03, 0.0, 0.2),
    "energy_variance": FeatureStatistics(0.001, 0.001, 0.0, 0.01),
    "monotony_score": FeatureStatistics(0.5, 0.2, 0.0, 1.0),
    "audio_confidence_prob": FeatureStatistics(0.33, 0.15, 0.0, 1.0),
    "audio_nervous_prob": FeatureStatistics(0.33, 0.15, 0.0, 1.0),
    "audio_calm_prob": FeatureStatistics(0.33, 0.15, 0.0, 1.0),
    "emotion_consistency": FeatureStatistics(0.7, 0.2, 0.0, 1.0),
    
    # Video metrics
    "eye_contact_ratio": FeatureStatistics(0.7, 0.2, 0.0, 1.0),
    "gaze_variance": FeatureStatistics(0.02, 0.02, 0.0, 0.2),
    "head_turn_frequency": FeatureStatistics(0.3, 0.2, 0.0, 2.0),
    "expression_variance": FeatureStatistics(0.05, 0.04, 0.0, 0.3),
    "smile_ratio": FeatureStatistics(0.3, 0.2, 0.0, 1.0),
    "neutral_face_ratio": FeatureStatistics(0.5, 0.2, 0.0, 1.0),
    "emotion_mismatch_score": FeatureStatistics(0.1, 0.1, 0.0, 0.5),
}


class Normalizer:
    """
    Feature normalizer using predefined global statistics.
    Does not update state during inference.
    Uses min-max normalization by default for more stable scaling.
    """
    
    def __init__(
        self,
        use_zscore: bool = False,  # Default to min-max for stability
        clip_range: tuple = (-2.0, 2.0),  # Tighter clipping
        custom_statistics: Optional[Dict[str, FeatureStatistics]] = None
    ):
        """
        Initialize normalizer.
        
        Args:
            use_zscore: If True, use z-score normalization. Otherwise, min-max.
            clip_range: Range to clip z-scores to prevent extreme values.
            custom_statistics: Optional custom statistics to override globals.
        """
        self.use_zscore = use_zscore
        self.clip_range = clip_range
        self.statistics = {**GLOBAL_STATISTICS}
        
        if custom_statistics:
            self.statistics.update(custom_statistics)
    
    def normalize_value(
        self,
        feature_name: str,
        value: float,
        session_baseline: Optional[FeatureStatistics] = None
    ) -> float:
        """
        Normalize a single feature value.
        
        Args:
            feature_name: Name of the feature
            value: Raw feature value
            session_baseline: Optional session-specific baseline statistics
            
        Returns:
            Normalized value
        """
        # Get statistics (prefer session baseline if provided)
        stats = session_baseline or self.statistics.get(
            feature_name, FeatureStatistics()
        )
        
        if self.use_zscore:
            return self._zscore_normalize(value, stats)
        else:
            return self._minmax_normalize(value, stats)
    
    def normalize_metrics(
        self,
        metrics: Dict[str, Any],
        session_baselines: Optional[Dict[str, FeatureStatistics]] = None
    ) -> Dict[str, float]:
        """
        Normalize all metrics in a dictionary.
        
        Args:
            metrics: Dictionary of feature names to raw values
            session_baselines: Optional session-specific baselines
            
        Returns:
            Dictionary of normalized values
        """
        normalized = {}
        
        for feature_name, value in metrics.items():
            if isinstance(value, (int, float)):
                baseline = None
                if session_baselines and feature_name in session_baselines:
                    baseline = session_baselines[feature_name]
                
                normalized[feature_name] = self.normalize_value(
                    feature_name, float(value), baseline
                )
            else:
                # Keep non-numeric values as-is
                normalized[feature_name] = value
        
        return normalized
    
    def normalize_all(
        self,
        text_metrics: Dict[str, Any],
        audio_metrics: Dict[str, Any],
        video_metrics: Dict[str, Any],
        session_baselines: Optional[Dict[str, FeatureStatistics]] = None
    ) -> Dict[str, Dict[str, float]]:
        """
        Normalize all perception metrics.
        
        Args:
            text_metrics: Raw text metrics
            audio_metrics: Raw audio metrics
            video_metrics: Raw video metrics
            session_baselines: Optional session-specific baselines
            
        Returns:
            Dictionary with normalized text, audio, and video metrics
        """
        return {
            "text_metrics": self.normalize_metrics(text_metrics, session_baselines),
            "audio_metrics": self.normalize_metrics(audio_metrics, session_baselines),
            "video_metrics": self.normalize_metrics(video_metrics, session_baselines)
        }
    
    def _zscore_normalize(self, value: float, stats: FeatureStatistics) -> float:
        """Apply z-score normalization with clipping."""
        if stats.std == 0:
            return 0.0
        
        z_score = (value - stats.mean) / stats.std
        
        # Clip to prevent extreme values
        clipped = np.clip(z_score, self.clip_range[0], self.clip_range[1])
        
        # Scale to [0, 1] range
        normalized = (clipped - self.clip_range[0]) / (
            self.clip_range[1] - self.clip_range[0]
        )
        
        return float(normalized)
    
    def _minmax_normalize(self, value: float, stats: FeatureStatistics) -> float:
        """Apply min-max normalization."""
        range_val = stats.max_val - stats.min_val
        
        if range_val == 0:
            return 0.5
        
        normalized = (value - stats.min_val) / range_val
        
        # Clip to [0, 1]
        return float(np.clip(normalized, 0.0, 1.0))
    
    def get_feature_statistics(self, feature_name: str) -> Optional[FeatureStatistics]:
        """Get predefined statistics for a feature."""
        return self.statistics.get(feature_name)
    
    def update_session_baseline(
        self,
        feature_name: str,
        values: list,
        session_baselines: Dict[str, FeatureStatistics]
    ):
        """
        Calculate session-specific baseline from initial values.
        Call this at session start, not during inference.
        
        Args:
            feature_name: Name of the feature
            values: List of initial values to compute baseline from
            session_baselines: Dictionary to update with new baseline
        """
        if not values:
            return
        
        values_array = np.array(values)
        session_baselines[feature_name] = FeatureStatistics(
            mean=float(np.mean(values_array)),
            std=float(np.std(values_array)) or 1.0,
            min_val=float(np.min(values_array)),
            max_val=float(np.max(values_array))
        )
