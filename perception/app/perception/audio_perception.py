"""
Audio Perception Layer - Extracts numerical features from audio signals.
Uses librosa for audio analysis. All computations are stateless per request.
"""

import io
import numpy as np
from typing import Dict, Any, Optional, List, Tuple
from dataclasses import dataclass
import librosa
import logging

logger = logging.getLogger(__name__)


@dataclass
class AudioMetrics:
    """Container for all audio-based metrics."""
    # Speech rate and timing
    speech_rate_wpm: float = 0.0
    speech_rate_variance: float = 0.0
    mean_pause_duration: float = 0.0
    pause_frequency: float = 0.0
    silence_ratio: float = 0.0
    
    # Prosodic features
    pitch_mean: float = 0.0
    pitch_variance: float = 0.0
    energy_mean: float = 0.0
    energy_variance: float = 0.0
    monotony_score: float = 0.0
    
    # Emotion probabilities (classifier confidence only)
    audio_confidence_prob: float = 0.0
    audio_nervous_prob: float = 0.0
    audio_calm_prob: float = 0.0
    emotion_consistency: float = 0.0
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "speech_rate_wpm": self.speech_rate_wpm,
            "speech_rate_variance": self.speech_rate_variance,
            "mean_pause_duration": self.mean_pause_duration,
            "pause_frequency": self.pause_frequency,
            "silence_ratio": self.silence_ratio,
            "pitch_mean": self.pitch_mean,
            "pitch_variance": self.pitch_variance,
            "energy_mean": self.energy_mean,
            "energy_variance": self.energy_variance,
            "monotony_score": self.monotony_score,
            "audio_confidence_prob": self.audio_confidence_prob,
            "audio_nervous_prob": self.audio_nervous_prob,
            "audio_calm_prob": self.audio_calm_prob,
            "emotion_consistency": self.emotion_consistency
        }


class AudioPerception:
    """
    Extracts numerical features from audio without making judgments.
    All outputs are raw metrics suitable for downstream processing.
    """
    
    # Default audio parameters
    DEFAULT_SR = 22050  # Sample rate
    HOP_LENGTH = 512
    FRAME_LENGTH = 2048
    
    # Silence detection thresholds
    SILENCE_THRESHOLD_DB = -40
    MIN_PAUSE_DURATION = 0.3  # seconds
    
    def __init__(self, sample_rate: int = DEFAULT_SR):
        self.sample_rate = sample_rate
    
    def extract_metrics(
        self,
        audio_data: bytes,
        word_count: Optional[int] = None,
        sample_rate: Optional[int] = None
    ) -> AudioMetrics:
        """
        Extract all audio metrics from raw audio bytes.
        
        Args:
            audio_data: Raw audio bytes (WAV, MP3, etc.)
            word_count: Optional word count for WPM calculation
            sample_rate: Optional sample rate override
            
        Returns:
            AudioMetrics containing all extracted features
        """
        metrics = AudioMetrics()
        
        try:
            # Load audio from bytes
            y, sr = self._load_audio(audio_data, sample_rate)
            
            if y is None or len(y) == 0:
                logger.warning("Empty audio data received")
                return metrics
            
            duration = len(y) / sr
            
            # Extract timing and speech rate metrics
            self._extract_timing_metrics(metrics, y, sr, duration, word_count)
            
            # Extract prosodic features
            self._extract_prosodic_metrics(metrics, y, sr)
            
            # Extract emotion-related audio features
            self._extract_emotion_features(metrics, y, sr)
            
        except Exception as e:
            logger.error(f"Audio processing error: {e}")
        
        return metrics
    
    def extract_metrics_from_segments(
        self,
        audio_segments: List[bytes],
        word_counts: Optional[List[int]] = None,
        sample_rate: Optional[int] = None
    ) -> AudioMetrics:
        """
        Extract aggregated metrics from multiple audio segments.
        
        Args:
            audio_segments: List of audio byte segments
            word_counts: Optional word counts per segment
            sample_rate: Optional sample rate override
            
        Returns:
            AudioMetrics with aggregated statistics
        """
        if not audio_segments:
            return AudioMetrics()
        
        all_metrics = []
        speech_rates = []
        
        for i, audio_data in enumerate(audio_segments):
            wc = word_counts[i] if word_counts and i < len(word_counts) else None
            segment_metrics = self.extract_metrics(audio_data, wc, sample_rate)
            all_metrics.append(segment_metrics)
            if segment_metrics.speech_rate_wpm > 0:
                speech_rates.append(segment_metrics.speech_rate_wpm)
        
        # Aggregate metrics
        aggregated = AudioMetrics()
        
        if all_metrics:
            aggregated.speech_rate_wpm = float(np.mean([m.speech_rate_wpm for m in all_metrics]))
            aggregated.speech_rate_variance = float(np.var(speech_rates)) if speech_rates else 0.0
            aggregated.mean_pause_duration = float(np.mean([m.mean_pause_duration for m in all_metrics]))
            aggregated.pause_frequency = float(np.mean([m.pause_frequency for m in all_metrics]))
            aggregated.silence_ratio = float(np.mean([m.silence_ratio for m in all_metrics]))
            
            aggregated.pitch_mean = float(np.mean([m.pitch_mean for m in all_metrics]))
            aggregated.pitch_variance = float(np.mean([m.pitch_variance for m in all_metrics]))
            aggregated.energy_mean = float(np.mean([m.energy_mean for m in all_metrics]))
            aggregated.energy_variance = float(np.mean([m.energy_variance for m in all_metrics]))
            aggregated.monotony_score = float(np.mean([m.monotony_score for m in all_metrics]))
            
            aggregated.audio_confidence_prob = float(np.mean([m.audio_confidence_prob for m in all_metrics]))
            aggregated.audio_nervous_prob = float(np.mean([m.audio_nervous_prob for m in all_metrics]))
            aggregated.audio_calm_prob = float(np.mean([m.audio_calm_prob for m in all_metrics]))
            
            # Emotion consistency based on variance of emotion scores
            confidence_scores = [m.audio_confidence_prob for m in all_metrics]
            if len(confidence_scores) > 1:
                emotion_var = np.var(confidence_scores)
                aggregated.emotion_consistency = float(1.0 / (1.0 + emotion_var))
        
        return aggregated
    
    def _load_audio(
        self,
        audio_data: bytes,
        sample_rate: Optional[int] = None
    ) -> Tuple[Optional[np.ndarray], int]:
        """Load audio from bytes."""
        try:
            sr = sample_rate or self.sample_rate
            audio_buffer = io.BytesIO(audio_data)
            y, loaded_sr = librosa.load(audio_buffer, sr=sr, mono=True)
            return y, loaded_sr
        except Exception as e:
            logger.error(f"Failed to load audio: {e}")
            return None, self.sample_rate
    
    def _extract_timing_metrics(
        self,
        metrics: AudioMetrics,
        y: np.ndarray,
        sr: int,
        duration: float,
        word_count: Optional[int]
    ):
        """Extract speech timing and rate metrics."""
        # Detect non-silent intervals
        intervals = librosa.effects.split(
            y,
            top_db=abs(self.SILENCE_THRESHOLD_DB),
            frame_length=self.FRAME_LENGTH,
            hop_length=self.HOP_LENGTH
        )
        
        if len(intervals) == 0:
            metrics.silence_ratio = 1.0
            return
        
        # Calculate speech and silence durations
        speech_duration = sum(
            (end - start) / sr for start, end in intervals
        )
        silence_duration = duration - speech_duration
        
        metrics.silence_ratio = float(silence_duration / duration) if duration > 0 else 0.0
        
        # Calculate speech rate (WPM)
        if word_count and speech_duration > 0:
            metrics.speech_rate_wpm = float((word_count / speech_duration) * 60)
        
        # Analyze pauses
        pauses = []
        for i in range(1, len(intervals)):
            pause_start = intervals[i-1][1]
            pause_end = intervals[i][0]
            pause_duration = (pause_end - pause_start) / sr
            
            if pause_duration >= self.MIN_PAUSE_DURATION:
                pauses.append(pause_duration)
        
        if pauses:
            metrics.mean_pause_duration = float(np.mean(pauses))
            metrics.pause_frequency = float(len(pauses) / duration) if duration > 0 else 0.0
    
    def _extract_prosodic_metrics(
        self,
        metrics: AudioMetrics,
        y: np.ndarray,
        sr: int
    ):
        """Extract pitch and energy prosodic features."""
        # Extract pitch (F0) using pyin
        try:
            f0, voiced_flag, voiced_probs = librosa.pyin(
                y,
                fmin=librosa.note_to_hz('C2'),
                fmax=librosa.note_to_hz('C7'),
                sr=sr
            )
            
            # Filter out unvoiced frames
            f0_voiced = f0[~np.isnan(f0)]
            
            if len(f0_voiced) > 0:
                metrics.pitch_mean = float(np.mean(f0_voiced))
                metrics.pitch_variance = float(np.var(f0_voiced))
                
                # Monotony score based on pitch coefficient of variation
                if metrics.pitch_mean > 0:
                    cv = np.std(f0_voiced) / metrics.pitch_mean
                    # Lower CV = more monotonous (invert and normalize)
                    metrics.monotony_score = float(1.0 / (1.0 + cv))
        except Exception as e:
            logger.warning(f"Pitch extraction failed: {e}")
        
        # Extract energy (RMS)
        try:
            rms = librosa.feature.rms(
                y=y,
                frame_length=self.FRAME_LENGTH,
                hop_length=self.HOP_LENGTH
            )[0]
            
            if len(rms) > 0:
                metrics.energy_mean = float(np.mean(rms))
                metrics.energy_variance = float(np.var(rms))
        except Exception as e:
            logger.warning(f"Energy extraction failed: {e}")
    
    def _extract_emotion_features(
        self,
        metrics: AudioMetrics,
        y: np.ndarray,
        sr: int
    ):
        """
        Extract emotion-related features from audio.
        These are prosodic correlates, not behavioral judgments.
        """
        try:
            # Extract spectral features correlated with emotional states
            spectral_centroids = librosa.feature.spectral_centroid(
                y=y, sr=sr, hop_length=self.HOP_LENGTH
            )[0]
            
            spectral_rolloff = librosa.feature.spectral_rolloff(
                y=y, sr=sr, hop_length=self.HOP_LENGTH
            )[0]
            
            zcr = librosa.feature.zero_crossing_rate(
                y, frame_length=self.FRAME_LENGTH, hop_length=self.HOP_LENGTH
            )[0]
            
            # MFCC features
            mfccs = librosa.feature.mfcc(
                y=y, sr=sr, n_mfcc=13, hop_length=self.HOP_LENGTH
            )
            
            # Compute feature statistics
            centroid_mean = np.mean(spectral_centroids)
            centroid_std = np.std(spectral_centroids)
            zcr_mean = np.mean(zcr)
            energy_variance = metrics.energy_variance
            pitch_variance = metrics.pitch_variance
            
            # Heuristic emotion correlates based on prosodic features
            # High energy + high pitch variance -> confidence indicator
            # High ZCR + low energy -> nervous indicator
            # Low variance overall -> calm indicator
            
            # Normalize features for probability estimation
            confidence_features = []
            nervous_features = []
            calm_features = []
            
            # Confidence correlates: stable high energy, pitch variation
            if metrics.energy_mean > 0:
                confidence_features.append(min(metrics.energy_mean * 10, 1.0))
            if pitch_variance > 0:
                confidence_features.append(min(np.sqrt(pitch_variance) / 100, 1.0))
            
            # Nervousness correlates: high ZCR, energy variance
            nervous_features.append(min(zcr_mean * 5, 1.0))
            if energy_variance > 0:
                nervous_features.append(min(energy_variance * 100, 1.0))
            
            # Calm correlates: low variance, steady pitch
            if metrics.monotony_score > 0:
                calm_features.append(metrics.monotony_score)
            calm_features.append(1.0 - min(zcr_mean * 5, 1.0))
            
            # Aggregate as probability estimates
            metrics.audio_confidence_prob = float(
                np.mean(confidence_features) if confidence_features else 0.5
            )
            metrics.audio_nervous_prob = float(
                np.mean(nervous_features) if nervous_features else 0.5
            )
            metrics.audio_calm_prob = float(
                np.mean(calm_features) if calm_features else 0.5
            )
            
            # Normalize probabilities
            total = (
                metrics.audio_confidence_prob +
                metrics.audio_nervous_prob +
                metrics.audio_calm_prob
            )
            if total > 0:
                metrics.audio_confidence_prob /= total
                metrics.audio_nervous_prob /= total
                metrics.audio_calm_prob /= total
            
        except Exception as e:
            logger.warning(f"Emotion feature extraction failed: {e}")
