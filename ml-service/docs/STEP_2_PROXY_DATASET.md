# Step 2: Proxy Dataset Processing - Completion Summary

**Date:** December 22, 2025  
**Status:** ✅ COMPLETED

---

## What Was Implemented

### 1. IEMOCAP Dataset Integration

**Source:** `IEMOCAP_features.pkl` (Interactive Emotional Dyadic Motion Capture)

| Metric | Value |
|--------|-------|
| Total Sessions | 151 |
| Total Utterances | 7,433 |
| Training Sessions | 120 |
| Test Sessions | 31 |
| Emotion Categories | 6 (neutral, happy, sad, angry, frustrated, excited) |

### 2. Feature Mapping Layer

Mapped IEMOCAP features to our standardized schema:

| IEMOCAP Feature | Our Metric | Transform |
|-----------------|------------|-----------|
| MFCCs (100 dims) | pitch_mean, pitch_variance | Statistical aggregation |
| MFCCs variance | monotony_score | Inverse normalization |
| Spectral energy | energy_mean, energy_variance | Direct mapping |
| Low energy ratio | silence_ratio, pause metrics | Threshold detection |
| Text embeddings | semantic_relevance_mean/std | Cosine similarity |
| Transcripts | assertive/hedge/filler ratios | Regex pattern matching |
| Transcripts | empathy/reflective ratios | Keyword detection |
| Emotion labels | audio_confidence/nervous/calm_prob | Probability mapping |
| Emotion consistency | emotion_consistency | Entropy-based |

### 3. Utterance-to-Session Aggregation

Converted 7,433 utterances → 151 session-level records:

```
Per-utterance features
        ↓
    Group by session_id
        ↓
    Aggregate using:
      - mean (for continuous)
      - std (for variance)
      - max (for spikes)
      - ratio (for counts)
        ↓
One row per session
```

### 4. Weak Supervision Label Generation

Generated proxy labels using emotion-based heuristics:

#### Confidence Proxy
```
confidence = 50
  + 30 × (dominance - 0.5)          # High dominance emotions
  + 20 × (1 - nervous_prob)         # Low nervousness
  + 15 × assertive_phrase_ratio     # Assertive language
  - 20 × silence_ratio              # Silence hurts
  - 10 × hedge_ratio                # Hedging hurts
  + noise(0, 5)
```

#### Clarity Proxy
```
clarity = 50
  + 25 × semantic_relevance_mean    # On-topic
  - 20 × topic_drift_ratio          # Drifting hurts
  + 15 × response_length_consistency
  - 15 × (pause_frequency / 20)
  + 10 × emotion_consistency
  + noise(0, 5)
```

#### Empathy Proxy
```
empathy = 50
  + 30 × valence                    # Positive emotions
  + 20 × empathy_phrase_ratio
  + 15 × reflective_response_ratio
  + 15 × question_back_ratio
  + 10 × calm_prob
  - 20 × angry_ratio
  + noise(0, 5)
```

#### Communication Proxy
```
communication = 50
  + 0.25 × (confidence - 50)
  + 0.30 × (clarity - 50)
  + 0.20 × (empathy - 50)
  + 15 × (1 - monotony_score)
  + 10 × semantic_relevance_mean
  + noise(0, 5)
```

### 5. Emotion-to-VAD Mapping

Used Valence-Arousal-Dominance model for emotion interpretation:

| Emotion | Valence | Arousal | Dominance |
|---------|---------|---------|-----------|
| Neutral | 0.5 | 0.3 | 0.5 |
| Happy | 0.8 | 0.7 | 0.6 |
| Sad | 0.2 | 0.3 | 0.2 |
| Angry | 0.1 | 0.9 | 0.8 |
| Frustrated | 0.3 | 0.7 | 0.4 |
| Excited | 0.9 | 0.9 | 0.7 |

---

## Files Generated

| File | Description | Size |
|------|-------------|------|
| `data/proxy_training.csv` | 151 sessions from IEMOCAP | ~50 KB |
| `data/final_training.csv` | Combined synthetic + proxy | ~1.7 MB |
| `training/process_iemocap.py` | Processing script | ~20 KB |

---

## Dataset Statistics

### Proxy Dataset (IEMOCAP only)

| Label | Mean | Std | Min | Max |
|-------|------|-----|-----|-----|
| Confidence | 60.7 | 9.5 | 37 | 80 |
| Clarity | 74.7 | 5.7 | 62 | 94 |
| Empathy | 66.6 | 12.8 | 34 | 94 |
| Communication | 74.5 | 7.7 | 57 | 94 |

### Combined Dataset (Synthetic + Proxy)

| Metric | Value |
|--------|-------|
| **Total Samples** | **5,151** |
| Synthetic samples | 5,000 (97%) |
| Proxy samples | 151 (3%) |
| Features | 38 |
| Labels | 4 |

| Label | Mean | Std |
|-------|------|-----|
| Confidence | 66.1 | 16.2 |
| Clarity | 71.0 | 12.2 |
| Empathy | 21.5 | 22.8 |
| Communication | 69.2 | 12.7 |

---

## Video Features Handling

IEMOCAP is audio-only, so video features are set to `null`:

```python
video_features = {
    "eye_contact_ratio": None,
    "gaze_variance": None,
    "head_turn_frequency": None,
    "expression_variance": None,
    "smile_ratio": None,
    "neutral_face_ratio": None,
    "emotion_mismatch_score": None,
}
```

The decision layer will mask these during training.

---

## Key Design Decisions

### 1. Weak Supervision Approach
- Labels are **proxies**, not ground truth
- Encode domain knowledge about emotion → skill relationships
- Acceptable noise (±5 points) for realism

### 2. Feature Derivation
- MFCCs → pitch/energy proxies (indirect mapping)
- Text patterns → linguistic ratios (regex-based)
- Embeddings → semantic coherence (cosine similarity)

### 3. Data Source Tracking
- Added `data_source` column to distinguish synthetic vs proxy
- Enables analysis of model performance by data type

---

## How to Regenerate

```bash
cd ml-service
source venv/bin/activate

# Process IEMOCAP only
python training/process_iemocap.py --input ./data/IEMOCAP_features.pkl --output_dir ./data

# Process and combine with synthetic
python training/process_iemocap.py --input ./data/IEMOCAP_features.pkl --output_dir ./data --combine
```

---

## Next Steps

1. **Train XGBoost model** on `final_training.csv`
2. **Evaluate** on held-out proxy data
3. **Implement inference** in `app/decision/scoring.py`
4. **Create FastAPI endpoints** for integration

---

## Notes on Label Quality

The proxy labels are **weak supervision** — they're noisy but directionally correct:

| Quality Aspect | Assessment |
|----------------|------------|
| Confidence proxy | Good — dominance/nervousness are strong signals |
| Clarity proxy | Moderate — semantic coherence is indirect |
| Empathy proxy | Good — valence and empathy phrases are clear signals |
| Communication proxy | Good — combines other proxies appropriately |

The XGBoost model will learn to weight features appropriately despite label noise.
