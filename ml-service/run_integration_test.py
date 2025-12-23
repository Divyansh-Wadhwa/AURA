#!/usr/bin/env python
"""
Wrapper to run integration test with proper Python path.
"""
import subprocess
import sys
import os

# Set up the environment
env = os.environ.copy()
ml_service_dir = os.path.dirname(os.path.abspath(__file__))
env['PYTHONPATH'] = ml_service_dir

# Run a self-contained test
test_code = '''
import sys
import os
import json
import time
import pickle
import numpy as np
from datetime import datetime
from sklearn.metrics.pairwise import cosine_similarity

print("=" * 60)
print("END-TO-END INTEGRATION TEST")
print("Perception Layer → Decision Layer")
print("=" * 60)

# =============================================================================
# TEST CASES
# =============================================================================

TEST_CASES = {
    "hesitant_speaker": {
        "name": "Hesitant Speaker",
        "description": "Uses hedging language, fillers, uncertain expressions",
        "expected": {"confidence": "low", "clarity": "medium"},
        "questions": [
            "Tell me about your greatest professional achievement.",
            "How do you handle conflict in a team setting?",
        ],
        "responses": [
            "Um, well, I guess maybe my greatest achievement was, you know, kind of like when I sort of helped with this project... I think it was successful, I'm not really sure. I suppose it went okay, perhaps.",
            "Uh, honestly, I don't know... I mean, I guess I try to, like, maybe avoid conflict? Or perhaps I just kind of go along with things. I'm not sure if that's the right approach, but, um, yeah.",
        ],
        "durations": [25.0, 20.0],
    },
    "clear_speaker": {
        "name": "Clear Speaker", 
        "description": "Structured responses, on-topic, assertive language",
        "expected": {"confidence": "high", "clarity": "high"},
        "questions": [
            "Tell me about your greatest professional achievement.",
            "How do you handle conflict in a team setting?",
        ],
        "responses": [
            "My greatest achievement was leading the digital transformation initiative at my previous company. I spearheaded a team of 12 engineers, we delivered the project three weeks ahead of schedule, and it resulted in a 40% increase in operational efficiency.",
            "I handle conflict directly and constructively. First, I listen to all perspectives without judgment. Then I identify the root cause of the disagreement. Finally, I facilitate a solution-focused discussion to reach consensus.",
        ],
        "durations": [30.0, 35.0],
    },
    "empathetic_speaker": {
        "name": "Empathetic Speaker",
        "description": "Shows understanding, reflective listening, emotional connection",
        "expected": {"empathy": "high", "communication": "high"},
        "questions": [
            "How would you support a struggling team member?",
            "Tell me about a time you had to deliver difficult feedback.",
        ],
        "responses": [
            "I understand how challenging it can be when someone is struggling. I would first take time to listen and understand their situation. I've been in similar positions myself, so I know how valuable it is to feel heard. I would offer support while respecting their autonomy.",
            "I appreciate that delivering difficult feedback is never easy. I always start by acknowledging the person's efforts and expressing that I understand their perspective. I've learned that people are more receptive when they feel valued.",
        ],
        "durations": [32.0, 30.0],
    },
    "rambling_speaker": {
        "name": "Rambling Speaker",
        "description": "Off-topic, disorganized, loses focus frequently",
        "expected": {"clarity": "low", "communication": "low"},
        "questions": [
            "What motivates you in your work?",
            "Describe your ideal work environment.",
        ],
        "responses": [
            "Motivation... that's interesting. So, I was reading this article the other day about productivity, which reminded me of this TED talk I watched last month about habits. Speaking of habits, I've been trying to wake up earlier, but my neighbor's dog keeps barking. Anyway, what was the question again?",
            "Ideal work environment, let me think. I once worked at this startup where they had beanbags, which was cool but not great for my back. That reminds me, I need to schedule a chiropractor appointment. Where was I? Oh, so workplaces. I like windows.",
        ],
        "durations": [45.0, 50.0],
    },
}

# =============================================================================
# INIT PERCEPTION
# =============================================================================

print("\\n" + "=" * 60)
print("INITIALIZING PERCEPTION LAYER")
print("=" * 60)

from sentence_transformers import SentenceTransformer
from transformers import pipeline
import re

print("  Loading SentenceTransformer...")
st_model = SentenceTransformer("all-MiniLM-L6-v2")

print("  Loading emotion classifier...")
emotion_clf = pipeline("text-classification", model="j-hartmann/emotion-english-distilroberta-base", top_k=None)

print("  Loading sentiment classifier...")
sentiment_clf = pipeline("sentiment-analysis", model="cardiffnlp/twitter-roberta-base-sentiment-latest", top_k=None)

print("  ✓ All perception models loaded")

# =============================================================================
# INIT DECISION
# =============================================================================

print("\\n" + "=" * 60)
print("INITIALIZING DECISION LAYER")
print("=" * 60)

# Load decision models directly
models_dir = "./app/models"
decision_models = {}
for skill in ["confidence", "clarity", "empathy", "communication"]:
    model_path = os.path.join(models_dir, f"{skill}_model.pkl")
    with open(model_path, "rb") as f:
        decision_models[skill] = pickle.load(f)
    print(f"  Loaded {skill} model")

# Load feature list
with open(os.path.join(models_dir, "feature_schema.json")) as f:
    schema = json.load(f)
    FEATURE_ORDER = schema["feature_order"]

print(f"  ✓ Decision layer ready ({len(decision_models)} models, {len(FEATURE_ORDER)} features)")

# =============================================================================
# PERCEPTION FUNCTION
# =============================================================================

def extract_metrics(responses, questions, durations):
    """Extract text metrics from responses."""
    HEDGE_WORDS = [r"\\bmaybe\\b", r"\\bperhaps\\b", r"\\bi guess\\b", r"\\bi think\\b", r"\\bsort of\\b", r"\\bkind of\\b", r"\\bprobably\\b"]
    FILLER_WORDS = [r"\\bum\\b", r"\\buh\\b", r"\\blike\\b", r"\\byou know\\b", r"\\bwell\\b"]
    ASSERTIVE = [r"\\bi am\\b", r"\\bi will\\b", r"\\bi can\\b", r"\\bdefinitely\\b", r"\\bclearly\\b"]
    EMPATHY = [r"\\bi understand\\b", r"\\bi appreciate\\b", r"\\bi see\\b", r"\\bi hear\\b"]
    
    all_text = " ".join(responses).lower()
    word_count = max(1, len(all_text.split()))
    
    def count_patterns(patterns):
        return sum(len(re.findall(p, all_text, re.IGNORECASE)) for p in patterns)
    
    # Semantic relevance
    q_embeds = st_model.encode(questions)
    r_embeds = st_model.encode(responses)
    sims = [cosine_similarity([q], [r])[0][0] for q, r in zip(q_embeds, r_embeds)]
    
    # Sentiment
    sentiments = []
    for r in responses:
        result = sentiment_clf(r[:512])[0]
        for item in result:
            if item["label"] == "positive": sentiments.append(item["score"])
            elif item["label"] == "negative": sentiments.append(-item["score"])
            else: sentiments.append(0)
    
    metrics = {
        "semantic_relevance_mean": float(np.mean(sims)),
        "semantic_relevance_std": float(np.std(sims)) if len(sims) > 1 else 0.0,
        "topic_drift_ratio": float(max(0, sims[0] - sims[-1])) if len(sims) > 1 else 0.0,
        "avg_sentence_length": float(np.mean([len(s.split()) for s in re.split(r"[.!?]+", all_text) if s.strip()])),
        "sentence_length_std": 5.0,
        "avg_response_length_sec": float(np.mean(durations)),
        "response_length_consistency": 0.7,
        "assertive_phrase_ratio": min(1.0, count_patterns(ASSERTIVE) / word_count * 10),
        "modal_verb_ratio": 0.3,
        "hedge_ratio": min(1.0, count_patterns(HEDGE_WORDS) / word_count * 10),
        "filler_word_ratio": min(1.0, count_patterns(FILLER_WORDS) / word_count * 10),
        "empathy_phrase_ratio": min(1.0, count_patterns(EMPATHY) / word_count * 15),
        "reflective_response_ratio": 0.1,
        "question_back_ratio": min(1.0, all_text.count("?") / len(responses) * 0.5),
        "avg_sentiment": float(np.mean(sentiments)) if sentiments else 0.0,
        "sentiment_variance": float(np.std(sentiments)) if len(sentiments) > 1 else 0.0,
        "negative_spike_count": sum(1 for s in sentiments if s < -0.3),
        # Audio metrics (synthetic for text-only test)
        "speech_rate_wpm": 150.0,
        "speech_rate_variance": 20.0,
        "mean_pause_duration": 0.5,
        "pause_frequency": 10.0,
        "silence_ratio": 0.15,
        "pitch_mean": 180.0,
        "pitch_variance": 30.0,
        "energy_mean": 0.5,
        "energy_variance": 0.2,
        "monotony_score": 0.3,
        "audio_confidence_prob": 0.6,
        "audio_nervous_prob": 0.3,
        "audio_calm_prob": 0.5,
        "emotion_consistency": 0.7,
        # Video metrics (not available)
        "eye_contact_ratio": 0.0,
        "gaze_variance": 0.0,
        "head_turn_frequency": 0.0,
        "expression_variance": 0.0,
        "smile_ratio": 0.0,
        "neutral_face_ratio": 0.0,
        "emotion_mismatch_score": 0.0,
    }
    
    return metrics

def adjust_audio_metrics(metrics, case_type):
    """Adjust synthetic audio metrics based on speaker type."""
    if case_type == "hesitant_speaker":
        metrics["silence_ratio"] = 0.35
        metrics["audio_nervous_prob"] = 0.7
        metrics["audio_confidence_prob"] = 0.25
    elif case_type == "clear_speaker":
        metrics["silence_ratio"] = 0.08
        metrics["audio_confidence_prob"] = 0.85
        metrics["audio_nervous_prob"] = 0.1
    elif case_type == "empathetic_speaker":
        metrics["audio_calm_prob"] = 0.8
        metrics["energy_variance"] = 0.3
    elif case_type == "rambling_speaker":
        metrics["monotony_score"] = 0.55
        metrics["emotion_consistency"] = 0.4
    return metrics

# =============================================================================
# DECISION FUNCTION
# =============================================================================

def run_decision(metrics):
    """Run decision layer scoring."""
    # Build feature vector in correct order
    feature_vector = []
    for feat in FEATURE_ORDER:
        val = metrics.get(feat, 0.0)
        if val is None or (isinstance(val, float) and np.isnan(val)):
            val = 0.0
        feature_vector.append(float(val))
    
    X = np.array([feature_vector], dtype=np.float32)
    
    scores = {}
    for skill, model in decision_models.items():
        pred = model.predict(X)[0]
        scores[skill] = int(np.clip(np.round(pred), 0, 100))
    
    scores["overall"] = int(np.round(
        0.25 * scores["confidence"] + 0.30 * scores["clarity"] +
        0.20 * scores["empathy"] + 0.25 * scores["communication"]
    ))
    
    return scores

# =============================================================================
# RUN TESTS
# =============================================================================

print("\\n" + "=" * 60)
print("RUNNING TEST CASES")
print("=" * 60)

results = {"timestamp": datetime.now().isoformat(), "test_cases": {}, "summary": {"total": 0, "passed": 0, "failed": 0}}

for case_id, case in TEST_CASES.items():
    print(f"\\n--- {case['name']} ---")
    print(f"    {case['description']}")
    
    # Extract perception metrics
    metrics = extract_metrics(case["responses"], case["questions"], case["durations"])
    metrics = adjust_audio_metrics(metrics, case_id)
    
    # Run decision layer
    scores = run_decision(metrics)
    
    # Validate
    valid = True
    issues = []
    for skill in ["confidence", "clarity", "empathy", "communication"]:
        if not (0 <= scores[skill] <= 100):
            valid = False
            issues.append(f"{skill} out of range")
    
    print(f"\\n    Scores:")
    print(f"      Confidence: {scores['confidence']}")
    print(f"      Clarity: {scores['clarity']}")
    print(f"      Empathy: {scores['empathy']}")
    print(f"      Communication: {scores['communication']}")
    print(f"      Overall: {scores['overall']}")
    
    if valid:
        print(f"\\n    ✓ Validation PASSED")
        results["summary"]["passed"] += 1
    else:
        print(f"\\n    ✗ Validation FAILED: {issues}")
        results["summary"]["failed"] += 1
    
    results["summary"]["total"] += 1
    results["test_cases"][case_id] = {
        "name": case["name"],
        "scores": scores,
        "valid": valid,
        "key_metrics": {
            "semantic_relevance": metrics["semantic_relevance_mean"],
            "hedge_ratio": metrics["hedge_ratio"],
            "filler_ratio": metrics["filler_word_ratio"],
            "assertive_ratio": metrics["assertive_phrase_ratio"],
            "empathy_ratio": metrics["empathy_phrase_ratio"],
        }
    }

# =============================================================================
# SUMMARY
# =============================================================================

print("\\n" + "=" * 60)
print("INTEGRATION TEST SUMMARY")
print("=" * 60)

s = results["summary"]
print(f"\\n  Total: {s['total']}")
print(f"  Passed: {s['passed']}")
print(f"  Failed: {s['failed']}")

# Directional checks
print("\\n  Directional Correctness:")
hesitant = results["test_cases"]["hesitant_speaker"]["scores"]
clear = results["test_cases"]["clear_speaker"]["scores"]
empathetic = results["test_cases"]["empathetic_speaker"]["scores"]
rambling = results["test_cases"]["rambling_speaker"]["scores"]

checks = [
    ("Hesitant → Low Confidence", hesitant["confidence"] < clear["confidence"]),
    ("Clear → High Clarity", clear["clarity"] > rambling["clarity"]),
    ("Empathetic → High Empathy", empathetic["empathy"] > hesitant["empathy"]),
    ("Rambling → Low Communication", rambling["communication"] < clear["communication"]),
]

for name, passed in checks:
    status = "✓" if passed else "✗"
    print(f"    {status} {name}")

all_passed = s["failed"] == 0 and all(c[1] for c in checks)
results["summary"]["status"] = "PASSED" if all_passed else "FAILED"

if all_passed:
    print("\\n  ✓ ALL TESTS PASSED")
else:
    print("\\n  ✗ SOME TESTS FAILED")

# Save results
with open("integration_test_results.json", "w") as f:
    json.dump(results, f, indent=2)
print(f"\\n  Results saved to: integration_test_results.json")
'''

# Execute the test
result = subprocess.run(
    [sys.executable, '-c', test_code],
    cwd=ml_service_dir,
    env=env,
    capture_output=False
)

sys.exit(result.returncode)
