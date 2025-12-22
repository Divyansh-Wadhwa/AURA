# A.U.R.A ML Service - Decision Layer

## Overview

This is the ML Service for A.U.R.A (AI-Based Unified Response Assessment). It provides **deterministic scoring** of interview performance based on features extracted by the Perception Layer.

**Purpose:** Pure intelligence - No UI, No Auth, Deterministic Scoring

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PERCEPTION LAYER                         │
│         (Text, Audio, Video Feature Extraction)             │
│              [Handled by another collaborator]              │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼ Frozen Feature Schema (JSON)
┌─────────────────────────────────────────────────────────────┐
│                    DECISION LAYER                           │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   Feature   │  │   XGBoost   │  │   Score Output      │ │
│  │   Vector    │─▶│   Scoring   │─▶│   + Explainability  │ │
│  │   Builder   │  │   Model     │  │                     │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Folder Structure

```
ml-service/
├── app/
│   ├── main.py                 # FastAPI entry point (TODO)
│   ├── api/
│   │   └── routes.py           # API endpoints (TODO)
│   ├── decision/
│   │   ├── feature_schema.py   # ✅ Frozen feature contract
│   │   ├── feature_vector.py   # Feature vector builder (TODO)
│   │   ├── scoring.py          # XGBoost inference (TODO)
│   │   └── model_loader.py     # Model loading (TODO)
│   ├── models/
│   │   └── scoring_model.pkl   # Trained model (TODO)
│   └── utils/
│       └── normalizers.py      # Normalization utils (TODO)
├── training/
│   ├── prepare_dataset.py      # ✅ Synthetic data generator
│   ├── train_model.py          # Model training (TODO)
│   └── evaluate.py             # Model evaluation (TODO)
├── data/
│   ├── synthetic_features.csv  # ✅ Generated features
│   ├── synthetic_labels.csv    # ✅ Generated labels
│   ├── synthetic_training.csv  # ✅ Combined dataset
│   └── validation_report.json  # ✅ Data validation
├── requirements.txt            # ✅ Dependencies
└── README.md                   # ✅ This file
```

## Completed Components

### 1. Frozen Feature Schema (`app/decision/feature_schema.py`)

Defines the **contract between Perception and Decision layers**:

- **38 total features** across 3 modalities
- **17 text metrics** (semantic, linguistic, assertiveness, empathy, emotion)
- **14 audio metrics** (temporal, prosodic, emotion)
- **7 video metrics** (eye contact, expression, multimodal consistency)
- **4 target labels** (confidence, clarity, empathy, communication)

### 2. Synthetic Dataset Generator (`training/prepare_dataset.py`)

Generates realistic training data with:

- **Human-interpretable scoring rubrics** for each skill
- **Realistic feature distributions** (Beta, Normal, Poisson)
- **Video availability simulation** (60% have video data)
- **Noise injection** for realism
- **Validation and correlation analysis**

## Generated Dataset

| Metric | Value |
|--------|-------|
| Samples | 5,000 |
| Features | 38 |
| Labels | 4 (confidence, clarity, empathy, communication) |
| Video availability | 60% |

### Label Distributions

| Skill | Mean | Std | Range |
|-------|------|-----|-------|
| Confidence | 66.2 | 16.3 | [8, 100] |
| Clarity | 70.9 | 12.3 | [23, 100] |
| Empathy | 20.1 | 21.6 | [0, 100] |
| Communication | 69.0 | 12.8 | [23, 100] |

### Top Feature Correlations

**Confidence:**
- `audio_nervous_prob`: -0.401
- `assertive_phrase_ratio`: +0.355
- `audio_confidence_prob`: +0.353

**Clarity:**
- `topic_drift_ratio`: -0.410
- `semantic_relevance_mean`: +0.373
- `energy_variance`: +0.325

**Empathy:**
- `empathy_phrase_ratio`: +0.430
- `energy_variance`: +0.422
- `reflective_response_ratio`: +0.365

**Communication:**
- `monotony_score`: -0.327
- `topic_drift_ratio`: -0.318
- `filler_word_ratio`: -0.302

## Scoring Rubrics

Each skill score is computed as:

```
score = base_score + Σ(feature_value × weight) + noise
```

### Confidence Rubric
| Feature | Weight | Rationale |
|---------|--------|-----------|
| assertive_phrase_ratio | +18 | Assertive language shows confidence |
| audio_confident_prob | +15 | Model-detected confidence |
| eye_contact_ratio | +12 | Eye contact = confidence |
| hedge_ratio | -15 | Hedging shows uncertainty |
| filler_word_ratio | -14 | Fillers show nervousness |
| audio_nervous_prob | -18 | Model-detected nervousness |
| silence_ratio | -16 | Too much silence = hesitation |

### Clarity Rubric
| Feature | Weight | Rationale |
|---------|--------|-----------|
| semantic_relevance_mean | +15 | On-topic responses |
| response_length_consistency | +8 | Consistent structure |
| topic_drift_ratio | -18 | Drifting = unclear |
| hedge_ratio | -12 | Hedging reduces clarity |
| filler_word_ratio | -10 | Fillers break flow |

### Empathy Rubric
| Feature | Weight | Rationale |
|---------|--------|-----------|
| empathy_phrase_ratio | +40 | Empathy phrases |
| reflective_response_ratio | +35 | Reflection = understanding |
| question_back_ratio | +30 | Questions = engagement |
| smile_ratio | +22 | Warmth |
| audio_calm_prob | +25 | Calm = composed |

### Communication Rubric
| Feature | Weight | Rationale |
|---------|--------|-----------|
| semantic_relevance_mean | +12 | Staying on topic |
| emotion_consistency | +10 | Stable emotions |
| monotony_score | -12 | Monotone = disengaging |
| filler_word_ratio | -12 | Breaks flow |
| topic_drift_ratio | -14 | Loses audience |

## Next Steps

1. **Receive proxy dataset** from user (real/labeled data)
2. **Train XGBoost model** using `training/train_model.py`
3. **Implement inference** in `app/decision/scoring.py`
4. **Create FastAPI endpoints** in `app/api/routes.py`
5. **Integrate with Node.js backend** via HTTP calls

## Usage

### Generate Synthetic Dataset

```bash
cd ml-service
source venv/bin/activate
python training/prepare_dataset.py --n_samples 5000 --output_dir ./data
```

### Train Model (TODO)

```bash
python training/train_model.py --data ./data/synthetic_training.csv
```

### Run Service (TODO)

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## API Endpoints (Planned)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/analyze` | POST | Score a session from perception features |
| `/model/info` | GET | Model metadata and feature importance |

## Tech Stack

- **Framework:** FastAPI + Uvicorn
- **ML:** XGBoost, scikit-learn
- **Data:** pandas, numpy, scipy
- **Validation:** matplotlib, seaborn
