"""
IEMOCAP PROXY DATASET PROCESSOR
================================
Converts IEMOCAP emotional speech dataset to our standardized feature schema.

IEMOCAP Structure:
- Element 0: Utterance IDs (Dict: session -> List[str])
- Element 1: Speakers M/F (Dict: session -> List[str])
- Element 2: Emotion labels 0-5 (Dict: session -> List[int])
- Element 3: Audio features MFCCs (Dict: session -> List[ndarray(100,)])
- Element 4: Audio features spectral (Dict: session -> List[ndarray(100,)])
- Element 5: Text embeddings (Dict: session -> List[ndarray(512,)])
- Element 6: Transcripts (Dict: session -> List[str])
- Element 7: Training session IDs (List[120])
- Element 8: Test session IDs (List[31])

Emotion Labels (IEMOCAP standard):
- 0: Neutral
- 1: Happy
- 2: Sad
- 3: Angry
- 4: Frustrated
- 5: Excited
"""

import pickle
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Optional
from collections import Counter
import re
import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.decision.feature_schema import (
    TEXT_FEATURE_NAMES,
    AUDIO_FEATURE_NAMES,
    VIDEO_FEATURE_NAMES,
    TARGET_NAMES,
)


# =============================================================================
# EMOTION MAPPINGS
# =============================================================================

EMOTION_MAP = {
    0: "neutral",
    1: "happy",
    2: "sad",
    3: "angry",
    4: "frustrated",
    5: "excited",
}

# Valence mapping: positive emotion = higher valence
EMOTION_VALENCE = {
    0: 0.5,    # neutral
    1: 0.8,    # happy
    2: 0.2,    # sad
    3: 0.1,    # angry
    4: 0.3,    # frustrated
    5: 0.9,    # excited
}

# Arousal mapping: high energy emotions = higher arousal
EMOTION_AROUSAL = {
    0: 0.3,    # neutral
    1: 0.7,    # happy
    2: 0.3,    # sad
    3: 0.9,    # angry
    4: 0.7,    # frustrated
    5: 0.9,    # excited
}

# Dominance mapping: assertive emotions = higher dominance
EMOTION_DOMINANCE = {
    0: 0.5,    # neutral
    1: 0.6,    # happy
    2: 0.2,    # sad
    3: 0.8,    # angry
    4: 0.4,    # frustrated
    5: 0.7,    # excited
}


# =============================================================================
# FEATURE MAPPING TABLE
# =============================================================================
"""
IEMOCAP Feature → Our Schema Mapping

IEMOCAP provides:
- MFCCs (100 dims): Capture voice quality, timbre
- Spectral features (100 dims): Energy, spectral characteristics
- Text embeddings (512 dims): Semantic content
- Emotion labels: Categorical emotions

We derive our metrics from these through aggregation and computation.
"""


# =============================================================================
# TEXT FEATURE EXTRACTION (from embeddings + transcripts)
# =============================================================================

def extract_text_features(
    transcripts: List[str],
    embeddings: List[np.ndarray],
) -> Dict[str, float]:
    """
    Extract text metrics from transcripts and embeddings.
    
    Mappings:
    - Embedding similarity → semantic_relevance
    - Word patterns → assertive/hedge/filler ratios
    - Sentiment patterns → avg_sentiment, sentiment_variance
    """
    features = {}
    
    # === Semantic relevance from embeddings ===
    if len(embeddings) > 1:
        # Compute pairwise cosine similarities
        emb_matrix = np.vstack(embeddings)
        # Normalize embeddings
        norms = np.linalg.norm(emb_matrix, axis=1, keepdims=True)
        norms = np.where(norms == 0, 1, norms)  # Avoid division by zero
        emb_normalized = emb_matrix / norms
        
        # Mean embedding (topic centroid)
        mean_emb = emb_normalized.mean(axis=0)
        mean_emb = mean_emb / (np.linalg.norm(mean_emb) + 1e-8)
        
        # Similarity to centroid (relevance)
        similarities = emb_normalized @ mean_emb
        features["semantic_relevance_mean"] = float(np.clip((similarities.mean() + 1) / 2, 0, 1))
        features["semantic_relevance_std"] = float(np.clip(similarities.std(), 0, 1))
        features["topic_drift_ratio"] = float(np.mean(similarities < 0.5))
    else:
        features["semantic_relevance_mean"] = 0.7
        features["semantic_relevance_std"] = 0.1
        features["topic_drift_ratio"] = 0.1
    
    # === Linguistic features from transcripts ===
    all_text = " ".join(transcripts)
    words = all_text.lower().split()
    sentences = [t for t in transcripts if t.strip()]
    
    # Sentence length metrics
    if sentences:
        sent_lengths = [len(s.split()) for s in sentences]
        features["avg_sentence_length"] = float(np.mean(sent_lengths))
        features["sentence_length_std"] = float(np.std(sent_lengths))
        features["response_length_consistency"] = float(
            1.0 - min(np.std(sent_lengths) / (np.mean(sent_lengths) + 1), 1.0)
        )
    else:
        features["avg_sentence_length"] = 10.0
        features["sentence_length_std"] = 3.0
        features["response_length_consistency"] = 0.5
    
    # Average response length (assume ~3 seconds per sentence as proxy)
    features["avg_response_length_sec"] = features["avg_sentence_length"] * 0.4 * len(sentences) / max(len(sentences), 1)
    
    # === Assertiveness & hesitation patterns ===
    assertive_patterns = r'\b(i did|i led|i managed|i decided|i achieved|i built|i created|definitely|absolutely|certainly)\b'
    modal_patterns = r'\b(might|maybe|could|would|perhaps|possibly|probably)\b'
    hedge_patterns = r'\b(kind of|sort of|i think|i guess|i feel like|it seems|somewhat)\b'
    filler_patterns = r'\b(uh|um|like|you know|basically|actually|literally)\b'
    
    word_count = len(words) if words else 1
    
    features["assertive_phrase_ratio"] = float(
        len(re.findall(assertive_patterns, all_text.lower())) / word_count
    )
    features["modal_verb_ratio"] = float(
        len(re.findall(modal_patterns, all_text.lower())) / word_count
    )
    features["hedge_ratio"] = float(
        len(re.findall(hedge_patterns, all_text.lower())) / word_count
    )
    features["filler_word_ratio"] = float(
        len(re.findall(filler_patterns, all_text.lower())) / word_count
    )
    
    # === Empathy & social patterns ===
    empathy_patterns = r'\b(i understand|i see|that makes sense|i hear you|i appreciate|thank you|please)\b'
    reflective_patterns = r'\b(so you\'re saying|if i understand|what you mean|in other words)\b'
    question_patterns = r'\?'
    
    features["empathy_phrase_ratio"] = float(
        len(re.findall(empathy_patterns, all_text.lower())) / word_count
    )
    features["reflective_response_ratio"] = float(
        len(re.findall(reflective_patterns, all_text.lower())) / word_count
    )
    features["question_back_ratio"] = float(
        len(re.findall(question_patterns, all_text)) / len(sentences) if sentences else 0
    )
    
    # === Sentiment proxies (from word patterns) ===
    positive_words = r'\b(good|great|wonderful|excellent|happy|love|enjoy|amazing|fantastic|positive)\b'
    negative_words = r'\b(bad|terrible|awful|hate|angry|sad|frustrated|annoyed|difficult|problem)\b'
    
    pos_count = len(re.findall(positive_words, all_text.lower()))
    neg_count = len(re.findall(negative_words, all_text.lower()))
    total_sentiment_words = pos_count + neg_count + 1
    
    features["avg_sentiment"] = float((pos_count - neg_count) / total_sentiment_words)
    features["sentiment_variance"] = float(min(abs(features["avg_sentiment"]), 0.5))
    features["negative_spike_count"] = int(neg_count)
    
    return features


# =============================================================================
# AUDIO FEATURE EXTRACTION (from MFCCs + spectral)
# =============================================================================

def extract_audio_features(
    mfccs: List[np.ndarray],
    spectral: List[np.ndarray],
) -> Dict[str, float]:
    """
    Extract audio metrics from MFCC and spectral features.
    
    Mappings:
    - MFCC variance → pitch_variance, monotony_score
    - Spectral energy → energy_mean, energy_variance
    - Feature statistics → speech rate proxies
    """
    features = {}
    
    # Stack all utterance features
    mfcc_matrix = np.vstack(mfccs)  # (n_utterances, 100)
    spec_matrix = np.vstack(spectral)  # (n_utterances, 100)
    
    # === Speech rate proxies ===
    # Use MFCC delta variance as proxy for speech rate variation
    mfcc_means = np.mean(mfcc_matrix, axis=1)
    features["speech_rate_wpm"] = float(np.clip(120 + 40 * np.tanh(mfcc_means.mean() / 10), 80, 200))
    features["speech_rate_variance"] = float(np.clip(mfcc_means.std() * 2, 0, 50))
    
    # === Pause/silence proxies ===
    # Low energy regions indicate pauses
    energy_per_utterance = np.sum(spec_matrix ** 2, axis=1)
    low_energy_mask = energy_per_utterance < np.percentile(energy_per_utterance, 25)
    
    features["mean_pause_duration"] = float(np.clip(0.5 + 0.5 * low_energy_mask.mean(), 0.1, 3.0))
    features["pause_frequency"] = float(np.clip(5 + 10 * low_energy_mask.mean(), 0, 20))
    features["silence_ratio"] = float(low_energy_mask.mean())
    
    # === Pitch proxies (from MFCCs) ===
    # MFCC[0] correlates with overall energy, MFCC[1-12] with spectral shape
    mfcc_first = mfcc_matrix[:, 0]
    mfcc_mid = mfcc_matrix[:, 1:13]
    
    features["pitch_mean"] = float(np.clip(150 + 30 * np.tanh(mfcc_first.mean() / 10), 80, 300))
    features["pitch_variance"] = float(np.clip(mfcc_mid.var() * 0.5, 0, 100))
    
    # === Energy metrics ===
    features["energy_mean"] = float(np.clip(spec_matrix.mean(), 0, 1))
    features["energy_variance"] = float(np.clip(spec_matrix.var(), 0, 0.5))
    
    # === Monotony score ===
    # High monotony = low variance in both pitch and energy
    pitch_var_norm = features["pitch_variance"] / 100
    energy_var_norm = features["energy_variance"] / 0.5
    features["monotony_score"] = float(1.0 - np.clip((pitch_var_norm + energy_var_norm) / 2, 0, 1))
    
    # === Audio emotion proxies (will be overridden by actual emotion labels) ===
    features["audio_confidence_prob"] = 0.5
    features["audio_nervous_prob"] = 0.3
    features["audio_calm_prob"] = 0.5
    features["emotion_consistency"] = float(1.0 - np.clip(mfcc_matrix.std(axis=0).mean() / 10, 0, 1))
    
    return features


def update_audio_emotions(
    audio_features: Dict[str, float],
    emotions: List[int],
) -> Dict[str, float]:
    """
    Update audio emotion probabilities based on actual emotion labels.
    """
    emotion_counts = Counter(emotions)
    total = len(emotions)
    
    # Confidence proxy: excited + angry + happy (assertive emotions)
    confident_emotions = emotion_counts.get(5, 0) + emotion_counts.get(3, 0) + emotion_counts.get(1, 0)
    audio_features["audio_confidence_prob"] = float(confident_emotions / total)
    
    # Nervous proxy: frustrated + sad
    nervous_emotions = emotion_counts.get(4, 0) + emotion_counts.get(2, 0)
    audio_features["audio_nervous_prob"] = float(nervous_emotions / total)
    
    # Calm proxy: neutral + happy
    calm_emotions = emotion_counts.get(0, 0) + emotion_counts.get(1, 0)
    audio_features["audio_calm_prob"] = float(calm_emotions / total)
    
    # Emotion consistency: how uniform are the emotions
    emotion_probs = np.array([emotion_counts.get(i, 0) / total for i in range(6)])
    entropy = -np.sum(emotion_probs * np.log(emotion_probs + 1e-8))
    max_entropy = np.log(6)
    audio_features["emotion_consistency"] = float(1.0 - entropy / max_entropy)
    
    return audio_features


# =============================================================================
# VIDEO FEATURES (Not available in IEMOCAP audio-only)
# =============================================================================

def get_null_video_features() -> Dict[str, Optional[float]]:
    """Return null video features (IEMOCAP has no video)."""
    return {
        "eye_contact_ratio": None,
        "gaze_variance": None,
        "head_turn_frequency": None,
        "expression_variance": None,
        "smile_ratio": None,
        "neutral_face_ratio": None,
        "emotion_mismatch_score": None,
    }


# =============================================================================
# WEAK SUPERVISION LABEL GENERATION
# =============================================================================

def generate_weak_labels(
    text_features: Dict[str, float],
    audio_features: Dict[str, float],
    emotions: List[int],
) -> Dict[str, float]:
    """
    Generate weak supervision labels for confidence, clarity, empathy, communication.
    
    These are PROXIES, not ground truth. They encode domain knowledge about
    how IEMOCAP features relate to interview skills.
    """
    labels = {}
    
    # Emotion statistics
    emotion_counts = Counter(emotions)
    total = len(emotions) if emotions else 1
    
    # Valence, arousal, dominance from emotions
    valence = np.mean([EMOTION_VALENCE[e] for e in emotions]) if emotions else 0.5
    arousal = np.mean([EMOTION_AROUSAL[e] for e in emotions]) if emotions else 0.5
    dominance = np.mean([EMOTION_DOMINANCE[e] for e in emotions]) if emotions else 0.5
    
    # === CONFIDENCE ===
    # High confidence = high dominance, low nervousness, assertive language
    confidence = 50.0
    confidence += 30 * (dominance - 0.5)  # Dominance contribution
    confidence += 20 * (1 - audio_features["audio_nervous_prob"])  # Low nervousness
    confidence += 15 * text_features["assertive_phrase_ratio"] * 10  # Assertive language
    confidence -= 20 * audio_features["silence_ratio"]  # Silence hurts confidence
    confidence -= 10 * text_features["hedge_ratio"] * 10  # Hedging hurts confidence
    confidence += 10 * (1 - audio_features["monotony_score"])  # Expressive voice
    labels["confidence"] = float(np.clip(confidence + np.random.normal(0, 5), 0, 100))
    
    # === CLARITY ===
    # High clarity = coherent speech, on-topic, structured
    clarity = 50.0
    clarity += 25 * text_features["semantic_relevance_mean"]  # On-topic
    clarity -= 20 * text_features["topic_drift_ratio"]  # Drifting hurts
    clarity += 15 * text_features["response_length_consistency"]  # Consistent structure
    clarity -= 15 * audio_features["pause_frequency"] / 20  # Too many pauses hurt
    clarity += 10 * audio_features["emotion_consistency"]  # Stable delivery
    clarity -= 10 * text_features["filler_word_ratio"] * 10  # Fillers hurt
    labels["clarity"] = float(np.clip(clarity + np.random.normal(0, 5), 0, 100))
    
    # === EMPATHY ===
    # High empathy = positive affect, engagement, reflective responses
    empathy = 50.0
    empathy += 30 * valence  # Positive emotions
    empathy += 20 * text_features["empathy_phrase_ratio"] * 10  # Empathy phrases
    empathy += 15 * text_features["reflective_response_ratio"] * 10  # Reflection
    empathy += 15 * text_features["question_back_ratio"]  # Asking questions
    empathy += 10 * audio_features["audio_calm_prob"]  # Calm demeanor
    # Angry/frustrated emotions reduce empathy score
    angry_ratio = (emotion_counts.get(3, 0) + emotion_counts.get(4, 0)) / total
    empathy -= 20 * angry_ratio
    labels["empathy"] = float(np.clip(empathy + np.random.normal(0, 5), 0, 100))
    
    # === COMMUNICATION ===
    # Overall communication = weighted average of other skills + delivery
    communication = 50.0
    communication += 0.25 * (labels["confidence"] - 50)  # Confidence contribution
    communication += 0.30 * (labels["clarity"] - 50)  # Clarity contribution
    communication += 0.20 * (labels["empathy"] - 50)  # Empathy contribution
    communication += 15 * (1 - audio_features["monotony_score"])  # Engaging delivery
    communication += 10 * text_features["semantic_relevance_mean"]  # On-topic
    communication -= 10 * text_features["filler_word_ratio"] * 10
    labels["communication"] = float(np.clip(communication + np.random.normal(0, 5), 0, 100))
    
    return labels


# =============================================================================
# SESSION-LEVEL AGGREGATION
# =============================================================================

def process_session(
    session_id: str,
    utterance_ids: List[str],
    speakers: List[str],
    emotions: List[int],
    mfccs: List[np.ndarray],
    spectral: List[np.ndarray],
    embeddings: List[np.ndarray],
    transcripts: List[str],
) -> Dict[str, float]:
    """
    Process a single session and return aggregated features + labels.
    """
    # Extract text features
    text_features = extract_text_features(transcripts, embeddings)
    
    # Extract audio features
    audio_features = extract_audio_features(mfccs, spectral)
    
    # Update audio emotions with actual labels
    audio_features = update_audio_emotions(audio_features, emotions)
    
    # Video features (null for IEMOCAP)
    video_features = get_null_video_features()
    
    # Generate weak supervision labels
    labels = generate_weak_labels(text_features, audio_features, emotions)
    
    # Combine all features
    result = {"session_id": session_id}
    result.update(text_features)
    result.update(audio_features)
    result.update(video_features)
    result.update(labels)
    result["data_source"] = "proxy_iemocap"
    
    return result


# =============================================================================
# MAIN PROCESSING PIPELINE
# =============================================================================

def load_iemocap(filepath: str) -> Tuple:
    """Load IEMOCAP pickle file."""
    with open(filepath, 'rb') as f:
        data = pickle.load(f)
    
    return (
        data[0],  # utterance_ids
        data[1],  # speakers
        data[2],  # emotions
        data[3],  # mfccs
        data[4],  # spectral
        data[5],  # embeddings
        data[6],  # transcripts
        data[7],  # train_sessions
        data[8],  # test_sessions
    )


def process_iemocap(
    filepath: str,
    output_dir: str,
    random_seed: int = 42,
) -> pd.DataFrame:
    """
    Main processing function.
    
    Converts IEMOCAP to our standardized schema:
    - Aggregates utterance-level to session-level
    - Maps features to our schema
    - Generates weak supervision labels
    - Outputs standardized CSV
    """
    np.random.seed(random_seed)
    
    print("=" * 60)
    print("IEMOCAP PROXY DATASET PROCESSOR")
    print("=" * 60)
    
    # Load data
    print("\nLoading IEMOCAP data...")
    (utterance_ids, speakers, emotions, mfccs, spectral, 
     embeddings, transcripts, train_sessions, test_sessions) = load_iemocap(filepath)
    
    all_sessions = list(utterance_ids.keys())
    print(f"Total sessions: {len(all_sessions)}")
    print(f"Training sessions: {len(train_sessions)}")
    print(f"Test sessions: {len(test_sessions)}")
    
    # Process each session
    print("\nProcessing sessions...")
    results = []
    
    for i, session_id in enumerate(all_sessions):
        if i % 20 == 0:
            print(f"  Processing session {i+1}/{len(all_sessions)}...")
        
        try:
            session_result = process_session(
                session_id=session_id,
                utterance_ids=utterance_ids[session_id],
                speakers=speakers[session_id],
                emotions=emotions[session_id],
                mfccs=mfccs[session_id],
                spectral=spectral[session_id],
                embeddings=embeddings[session_id],
                transcripts=transcripts[session_id],
            )
            results.append(session_result)
        except Exception as e:
            print(f"  Warning: Error processing {session_id}: {e}")
            continue
    
    # Create DataFrame
    df = pd.DataFrame(results)
    
    # Ensure column order matches our schema
    feature_cols = TEXT_FEATURE_NAMES + AUDIO_FEATURE_NAMES + VIDEO_FEATURE_NAMES
    label_cols = TARGET_NAMES
    meta_cols = ["session_id", "data_source"]
    
    # Reorder columns
    ordered_cols = feature_cols + label_cols
    available_cols = [c for c in ordered_cols if c in df.columns]
    df_features = df[available_cols].copy()
    
    print(f"\nProcessed {len(df)} sessions")
    print(f"Features: {len(feature_cols)}")
    print(f"Labels: {label_cols}")
    
    # Statistics
    print("\n" + "=" * 60)
    print("LABEL DISTRIBUTIONS")
    print("=" * 60)
    for label in label_cols:
        if label in df_features.columns:
            print(f"  {label}: mean={df_features[label].mean():.1f}, std={df_features[label].std():.1f}, "
                  f"range=[{df_features[label].min():.0f}, {df_features[label].max():.0f}]")
    
    # Save
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, "proxy_training.csv")
    df_features.to_csv(output_path, index=False)
    print(f"\nSaved proxy dataset to: {output_path}")
    
    return df_features


def combine_datasets(
    synthetic_path: str,
    proxy_path: str,
    output_path: str,
) -> pd.DataFrame:
    """
    Combine synthetic and proxy datasets into final training dataset.
    """
    print("\n" + "=" * 60)
    print("COMBINING DATASETS")
    print("=" * 60)
    
    # Load datasets
    synthetic_df = pd.read_csv(synthetic_path)
    proxy_df = pd.read_csv(proxy_path)
    
    print(f"Synthetic dataset: {len(synthetic_df)} samples")
    print(f"Proxy dataset: {len(proxy_df)} samples")
    
    # Ensure same columns
    common_cols = list(set(synthetic_df.columns) & set(proxy_df.columns))
    print(f"Common columns: {len(common_cols)}")
    
    # Add data source column
    synthetic_df["data_source"] = "synthetic"
    proxy_df["data_source"] = "proxy"
    
    # Combine
    combined = pd.concat([synthetic_df[common_cols + ["data_source"]], 
                          proxy_df[common_cols + ["data_source"]]], 
                         ignore_index=True)
    
    print(f"Combined dataset: {len(combined)} samples")
    
    # Save
    combined.to_csv(output_path, index=False)
    print(f"Saved combined dataset to: {output_path}")
    
    # Statistics
    print("\n" + "=" * 60)
    print("COMBINED LABEL DISTRIBUTIONS")
    print("=" * 60)
    for label in TARGET_NAMES:
        if label in combined.columns:
            print(f"  {label}: mean={combined[label].mean():.1f}, std={combined[label].std():.1f}")
    
    return combined


# =============================================================================
# MAIN
# =============================================================================

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Process IEMOCAP to proxy dataset")
    parser.add_argument("--input", type=str, default="./data/IEMOCAP_features.pkl",
                        help="Path to IEMOCAP pickle file")
    parser.add_argument("--output_dir", type=str, default="./data",
                        help="Output directory")
    parser.add_argument("--seed", type=int, default=42, help="Random seed")
    parser.add_argument("--combine", action="store_true",
                        help="Also combine with synthetic dataset")
    
    args = parser.parse_args()
    
    # Process IEMOCAP
    proxy_df = process_iemocap(
        filepath=args.input,
        output_dir=args.output_dir,
        random_seed=args.seed,
    )
    
    # Optionally combine with synthetic
    if args.combine:
        synthetic_path = os.path.join(args.output_dir, "synthetic_training.csv")
        proxy_path = os.path.join(args.output_dir, "proxy_training.csv")
        combined_path = os.path.join(args.output_dir, "final_training.csv")
        
        if os.path.exists(synthetic_path):
            combine_datasets(synthetic_path, proxy_path, combined_path)
        else:
            print(f"\nWarning: Synthetic dataset not found at {synthetic_path}")
            print("Run prepare_dataset.py first to generate synthetic data.")
    
    print("\n✓ Processing complete!")
