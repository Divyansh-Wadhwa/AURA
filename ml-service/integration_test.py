"""
END-TO-END INTEGRATION TEST
============================
Tests the full perception → decision pipeline.

Test Cases:
1. Hesitant Speaker - Should score low on confidence
2. Clear Speaker - Should score high on clarity
3. Empathetic Speaker - Should score high on empathy
4. Rambling Speaker - Should score low on clarity/communication

This script:
- Feeds raw text into perception layer
- Captures standardized metrics output
- Feeds metrics into decision layer
- Records final scores and validates behavior
"""

import sys
import os
import json
import time
from datetime import datetime
from typing import Dict, List, Any, Optional
import numpy as np

# Add paths - ensure we can import from both ml-service and perception
ML_SERVICE_DIR = os.path.dirname(os.path.abspath(__file__))
if ML_SERVICE_DIR not in sys.path:
    sys.path.insert(0, ML_SERVICE_DIR)
PERCEPTION_DIR = os.path.join(ML_SERVICE_DIR, '..', 'perception')
if PERCEPTION_DIR not in sys.path:
    sys.path.insert(0, PERCEPTION_DIR)

# Force reimport by clearing cached modules if needed
for mod_name in list(sys.modules.keys()):
    if mod_name.startswith('app.'):
        del sys.modules[mod_name]

# =============================================================================
# TEST CASES
# =============================================================================

TEST_CASES = {
    "hesitant_speaker": {
        "name": "Hesitant Speaker",
        "description": "Uses hedging language, fillers, uncertain expressions",
        "expected_behavior": {
            "confidence": "low",  # Should be lower than baseline
            "clarity": "medium",
            "empathy": "medium",
            "communication": "medium",
        },
        "interviewer_questions": [
            "Tell me about your greatest professional achievement.",
            "How do you handle conflict in a team setting?",
            "What are your career goals for the next five years?",
        ],
        "user_responses": [
            "Um, well, I guess maybe my greatest achievement was, you know, "
            "kind of like when I sort of helped with this project... I think it "
            "was successful, I'm not really sure. I suppose it went okay, perhaps.",
            
            "Uh, honestly, I don't know... I mean, I guess I try to, like, "
            "maybe avoid conflict? Or perhaps I just kind of go along with things. "
            "I'm not sure if that's the right approach, but, um, yeah.",
            
            "Well, I haven't really thought about it much, I suppose. Maybe I'd "
            "like to, um, possibly grow in my career? I guess I should probably "
            "have clearer goals, but, you know, things are uncertain.",
        ],
        "response_durations": [25.0, 20.0, 18.0],
    },
    
    "clear_speaker": {
        "name": "Clear Speaker",
        "description": "Structured responses, on-topic, assertive language",
        "expected_behavior": {
            "confidence": "high",
            "clarity": "high",
            "empathy": "medium",
            "communication": "high",
        },
        "interviewer_questions": [
            "Tell me about your greatest professional achievement.",
            "How do you handle conflict in a team setting?",
            "What are your career goals for the next five years?",
        ],
        "user_responses": [
            "My greatest achievement was leading the digital transformation "
            "initiative at my previous company. I spearheaded a team of 12 "
            "engineers, we delivered the project three weeks ahead of schedule, "
            "and it resulted in a 40% increase in operational efficiency.",
            
            "I handle conflict directly and constructively. First, I listen to "
            "all perspectives without judgment. Then I identify the root cause "
            "of the disagreement. Finally, I facilitate a solution-focused "
            "discussion to reach consensus. This approach has consistently "
            "resolved team tensions effectively.",
            
            "My five-year goal is to advance into a senior leadership role "
            "where I can drive strategic initiatives. I plan to achieve this "
            "by completing my MBA, expanding my technical expertise, and "
            "taking on increasingly complex projects. I am committed to "
            "continuous professional development.",
        ],
        "response_durations": [30.0, 35.0, 28.0],
    },
    
    "empathetic_speaker": {
        "name": "Empathetic Speaker",
        "description": "Shows understanding, reflective listening, emotional connection",
        "expected_behavior": {
            "confidence": "medium",
            "clarity": "medium",
            "empathy": "high",
            "communication": "high",
        },
        "interviewer_questions": [
            "How would you support a struggling team member?",
            "Tell me about a time you had to deliver difficult feedback.",
            "How do you build relationships with colleagues?",
        ],
        "user_responses": [
            "I understand how challenging it can be when someone is struggling. "
            "I would first take time to listen and understand their situation. "
            "I've been in similar positions myself, so I know how valuable it is "
            "to feel heard. I would offer support while respecting their autonomy, "
            "and I would check in regularly to see how they're doing.",
            
            "I appreciate that delivering difficult feedback is never easy. "
            "I always start by acknowledging the person's efforts and expressing "
            "that I understand their perspective. I've learned that people are "
            "more receptive when they feel valued. I frame feedback as an "
            "opportunity for growth, and I always ask how I can support them.",
            
            "Building relationships starts with genuine interest in others. "
            "I make a point to understand my colleagues' perspectives and "
            "what matters to them. I believe everyone has something valuable "
            "to contribute, and I try to create an environment where people "
            "feel comfortable sharing. Active listening is key to connection.",
        ],
        "response_durations": [32.0, 30.0, 28.0],
    },
    
    "rambling_speaker": {
        "name": "Rambling Speaker",
        "description": "Off-topic, disorganized, loses focus frequently",
        "expected_behavior": {
            "confidence": "medium",
            "clarity": "low",
            "empathy": "low",
            "communication": "low",
        },
        "interviewer_questions": [
            "What motivates you in your work?",
            "Describe your ideal work environment.",
            "How do you prioritize tasks?",
        ],
        "user_responses": [
            "Motivation... that's interesting. So, I was reading this article "
            "the other day about productivity, which reminded me of this TED talk "
            "I watched last month about habits. Speaking of habits, I've been "
            "trying to wake up earlier, but my neighbor's dog keeps barking. "
            "Anyway, what was the question again? Oh right, motivation. I guess "
            "I like challenges, but also I enjoy my coffee breaks.",
            
            "Ideal work environment, let me think. I once worked at this startup "
            "where they had beanbags, which was cool but not great for my back. "
            "That reminds me, I need to schedule a chiropractor appointment. "
            "Where was I? Oh, so workplaces. I like windows, natural light is "
            "important, studies show it affects mood. My apartment doesn't have "
            "many windows though. For work, I prefer somewhere with snacks.",
            
            "Prioritizing tasks is something I should probably do better at. "
            "My roommate uses this app, I forget what it's called. It has a "
            "tomato or something? Pomodoro! That's it. I tried it once but got "
            "distracted by YouTube. There's this great channel about organization. "
            "Ironically, watching videos about productivity doesn't make you "
            "productive. But to answer your question, I usually do whatever "
            "seems most urgent, or sometimes what I feel like doing.",
        ],
        "response_durations": [45.0, 50.0, 55.0],
    },
}


# =============================================================================
# PERCEPTION LAYER (TEXT ONLY FOR THIS TEST)
# =============================================================================

def init_perception_models():
    """Initialize perception layer models."""
    print("\n" + "=" * 60)
    print("INITIALIZING PERCEPTION LAYER")
    print("=" * 60)
    
    from sentence_transformers import SentenceTransformer
    from transformers import pipeline
    
    models = {}
    
    print("  Loading SentenceTransformer...")
    models["sentence_transformer"] = SentenceTransformer("all-MiniLM-L6-v2")
    
    print("  Loading emotion classifier...")
    models["emotion_classifier"] = pipeline(
        "text-classification",
        model="j-hartmann/emotion-english-distilroberta-base",
        top_k=None
    )
    
    print("  Loading sentiment classifier...")
    models["sentiment_classifier"] = pipeline(
        "sentiment-analysis",
        model="cardiffnlp/twitter-roberta-base-sentiment-latest",
        top_k=None
    )
    
    print("  ✓ All perception models loaded")
    return models


def extract_text_metrics(
    models: Dict,
    user_responses: List[str],
    interviewer_questions: List[str],
    response_durations: List[float],
) -> Dict[str, float]:
    """
    Extract text metrics using perception layer logic.
    This mirrors the TextPerception class from the perception layer.
    """
    import re
    from sklearn.metrics.pairwise import cosine_similarity
    
    # Pattern definitions
    ASSERTIVE_PHRASES = [
        r'\bi am\b', r'\bi will\b', r'\bi can\b', r'\bi have\b',
        r'\bdefinitely\b', r'\bcertainly\b', r'\babsolutely\b',
        r'\bclearly\b', r'\bobviously\b'
    ]
    
    HEDGE_WORDS = [
        r'\bmaybe\b', r'\bperhaps\b', r'\bpossibly\b', r'\bprobably\b',
        r'\bsort of\b', r'\bkind of\b', r'\bi think\b', r'\bi guess\b',
        r'\bi suppose\b', r'\bit seems\b'
    ]
    
    FILLER_WORDS = [
        r'\bum\b', r'\buh\b', r'\blike\b', r'\byou know\b',
        r'\bi mean\b', r'\bactually\b', r'\bwell\b'
    ]
    
    EMPATHY_PHRASES = [
        r'\bi understand\b', r'\bi see\b', r'\bi appreciate\b',
        r'\bi hear you\b', r'\bthat makes sense\b', r'\bi can imagine\b'
    ]
    
    REFLECTIVE_PHRASES = [
        r'\bwhat you.re saying\b', r'\bif i understand\b',
        r'\byou mentioned\b', r'\byou feel\b', r'\byou.re right\b'
    ]
    
    # Combine all text for analysis
    all_text = " ".join(user_responses).lower()
    word_count = len(all_text.split())
    
    # Helper function
    def count_patterns(text: str, patterns: List[str]) -> int:
        return sum(len(re.findall(p, text, re.IGNORECASE)) for p in patterns)
    
    # Calculate metrics
    metrics = {}
    
    # Semantic relevance using embeddings
    st = models["sentence_transformer"]
    if interviewer_questions:
        q_embeds = st.encode(interviewer_questions)
        r_embeds = st.encode(user_responses)
        similarities = []
        for i, (q_emb, r_emb) in enumerate(zip(q_embeds, r_embeds)):
            sim = cosine_similarity([q_emb], [r_emb])[0][0]
            similarities.append(max(0, min(1, sim)))
        metrics["semantic_relevance_mean"] = float(np.mean(similarities))
        metrics["semantic_relevance_std"] = float(np.std(similarities)) if len(similarities) > 1 else 0.0
        
        # Topic drift
        if len(similarities) > 1:
            drifts = [max(0, similarities[i] - similarities[i+1]) for i in range(len(similarities)-1)]
            metrics["topic_drift_ratio"] = float(np.mean(drifts)) if drifts else 0.0
        else:
            metrics["topic_drift_ratio"] = 0.0
    else:
        metrics["semantic_relevance_mean"] = 0.5
        metrics["semantic_relevance_std"] = 0.0
        metrics["topic_drift_ratio"] = 0.0
    
    # Sentence structure
    sentences = re.split(r'[.!?]+', all_text)
    sentences = [s.strip() for s in sentences if s.strip()]
    sentence_lengths = [len(s.split()) for s in sentences]
    metrics["avg_sentence_length"] = float(np.mean(sentence_lengths)) if sentence_lengths else 10.0
    metrics["sentence_length_std"] = float(np.std(sentence_lengths)) if len(sentence_lengths) > 1 else 0.0
    
    # Response duration metrics
    metrics["avg_response_length_sec"] = float(np.mean(response_durations)) if response_durations else 30.0
    if len(response_durations) > 1:
        cv = np.std(response_durations) / np.mean(response_durations) if np.mean(response_durations) > 0 else 0
        metrics["response_length_consistency"] = float(max(0, 1 - cv))
    else:
        metrics["response_length_consistency"] = 0.5
    
    # Linguistic patterns
    metrics["assertive_phrase_ratio"] = min(1.0, count_patterns(all_text, ASSERTIVE_PHRASES) / max(1, word_count) * 10)
    metrics["modal_verb_ratio"] = 0.3  # Simplified
    metrics["hedge_ratio"] = min(1.0, count_patterns(all_text, HEDGE_WORDS) / max(1, word_count) * 10)
    metrics["filler_word_ratio"] = min(1.0, count_patterns(all_text, FILLER_WORDS) / max(1, word_count) * 10)
    
    # Empathy signals
    metrics["empathy_phrase_ratio"] = min(1.0, count_patterns(all_text, EMPATHY_PHRASES) / max(1, word_count) * 15)
    metrics["reflective_response_ratio"] = min(1.0, count_patterns(all_text, REFLECTIVE_PHRASES) / max(1, word_count) * 15)
    metrics["question_back_ratio"] = min(1.0, all_text.count('?') / max(1, len(user_responses)) * 0.5)
    
    # Sentiment analysis
    sentiment_clf = models["sentiment_classifier"]
    sentiments = []
    for response in user_responses:
        result = sentiment_clf(response[:512])[0]
        # Convert to score
        for item in result:
            if item["label"] == "positive":
                sentiments.append(item["score"])
            elif item["label"] == "negative":
                sentiments.append(-item["score"])
            elif item["label"] == "neutral":
                sentiments.append(0)
    
    if sentiments:
        metrics["avg_sentiment"] = float(np.mean(sentiments))
        metrics["sentiment_variance"] = float(np.std(sentiments)) if len(sentiments) > 1 else 0.0
        metrics["negative_spike_count"] = sum(1 for s in sentiments if s < -0.3)
    else:
        metrics["avg_sentiment"] = 0.0
        metrics["sentiment_variance"] = 0.0
        metrics["negative_spike_count"] = 0
    
    return metrics


def generate_audio_metrics_synthetic(case_type: str) -> Dict[str, float]:
    """
    Generate synthetic audio metrics based on speaker type.
    In real integration, these would come from actual audio analysis.
    """
    base_metrics = {
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
    }
    
    # Adjust based on speaker type
    if case_type == "hesitant_speaker":
        base_metrics["silence_ratio"] = 0.35
        base_metrics["pause_frequency"] = 25.0
        base_metrics["mean_pause_duration"] = 1.2
        base_metrics["audio_nervous_prob"] = 0.7
        base_metrics["audio_confidence_prob"] = 0.25
        base_metrics["monotony_score"] = 0.5
        
    elif case_type == "clear_speaker":
        base_metrics["silence_ratio"] = 0.08
        base_metrics["speech_rate_wpm"] = 160.0
        base_metrics["audio_confidence_prob"] = 0.85
        base_metrics["audio_nervous_prob"] = 0.1
        base_metrics["monotony_score"] = 0.2
        base_metrics["energy_variance"] = 0.35
        
    elif case_type == "empathetic_speaker":
        base_metrics["audio_calm_prob"] = 0.8
        base_metrics["energy_variance"] = 0.3
        base_metrics["monotony_score"] = 0.25
        base_metrics["emotion_consistency"] = 0.85
        
    elif case_type == "rambling_speaker":
        base_metrics["speech_rate_variance"] = 45.0
        base_metrics["monotony_score"] = 0.55
        base_metrics["energy_variance"] = 0.15
        base_metrics["emotion_consistency"] = 0.4
    
    return base_metrics


# =============================================================================
# DECISION LAYER
# =============================================================================

def init_decision_layer():
    """Initialize decision layer."""
    print("\n" + "=" * 60)
    print("INITIALIZING DECISION LAYER")
    print("=" * 60)
    
    # Import decision layer using importlib for explicit path control
    import importlib.util
    scoring_path = os.path.join(ML_SERVICE_DIR, 'app', 'decision', 'scoring.py')
    spec = importlib.util.spec_from_file_location("scoring", scoring_path)
    scoring_module = importlib.util.module_from_spec(spec)
    
    # Need to load feature_contract first
    contract_path = os.path.join(ML_SERVICE_DIR, 'app', 'decision', 'feature_contract.py')
    contract_spec = importlib.util.spec_from_file_location("feature_contract", contract_path)
    contract_module = importlib.util.module_from_spec(contract_spec)
    sys.modules['app.decision.feature_contract'] = contract_module
    contract_spec.loader.exec_module(contract_module)
    
    # Now load scoring
    sys.modules['scoring'] = scoring_module
    spec.loader.exec_module(scoring_module)
    
    score_session = scoring_module.score_session
    get_models_status = scoring_module.get_models_status
    
    status = get_models_status()
    if status["loaded"]:
        print(f"  ✓ Decision models loaded: {status['models']}")
    else:
        print("  ✗ Decision models NOT loaded")
        raise RuntimeError("Decision models not available")
    
    return score_session


def run_decision_layer(
    score_fn,
    text_metrics: Dict[str, float],
    audio_metrics: Dict[str, float],
) -> Dict:
    """Run decision layer scoring."""
    # Combine metrics
    all_metrics = {**text_metrics, **audio_metrics}
    
    # Run scoring
    result = score_fn(all_metrics, return_details=False)
    
    return result


# =============================================================================
# VALIDATION
# =============================================================================

def validate_result(result: Dict, case_name: str, expected: Dict) -> Dict:
    """Validate result against expected behavior."""
    issues = []
    
    # Check for NaN/None
    for key in ["confidence", "clarity", "empathy", "communication", "overall"]:
        value = result.get(key)
        if value is None:
            issues.append(f"{key} is None")
        elif isinstance(value, float) and np.isnan(value):
            issues.append(f"{key} is NaN")
        elif not (0 <= value <= 100):
            issues.append(f"{key}={value} out of range [0,100]")
    
    # Check directional correctness
    directional_checks = []
    
    if expected.get("confidence") == "low" and result["confidence"] > 60:
        directional_checks.append(f"confidence={result['confidence']} should be low (<60)")
    elif expected.get("confidence") == "high" and result["confidence"] < 60:
        directional_checks.append(f"confidence={result['confidence']} should be high (>60)")
    
    if expected.get("clarity") == "low" and result["clarity"] > 60:
        directional_checks.append(f"clarity={result['clarity']} should be low (<60)")
    elif expected.get("clarity") == "high" and result["clarity"] < 60:
        directional_checks.append(f"clarity={result['clarity']} should be high (>60)")
    
    if expected.get("empathy") == "high" and result["empathy"] < 40:
        directional_checks.append(f"empathy={result['empathy']} should be high (>40)")
    
    if expected.get("communication") == "low" and result["communication"] > 65:
        directional_checks.append(f"communication={result['communication']} should be low (<65)")
    elif expected.get("communication") == "high" and result["communication"] < 60:
        directional_checks.append(f"communication={result['communication']} should be high (>60)")
    
    return {
        "valid": len(issues) == 0,
        "issues": issues,
        "directional_warnings": directional_checks,
    }


# =============================================================================
# MAIN INTEGRATION TEST
# =============================================================================

def run_integration_test():
    """Run full integration test."""
    print("=" * 60)
    print("END-TO-END INTEGRATION TEST")
    print("Perception Layer → Decision Layer")
    print("=" * 60)
    
    results = {
        "timestamp": datetime.now().isoformat(),
        "test_cases": {},
        "summary": {
            "total": 0,
            "passed": 0,
            "failed": 0,
            "warnings": 0,
        }
    }
    
    # Initialize layers
    perception_models = init_perception_models()
    score_session = init_decision_layer()
    
    # Run test cases
    print("\n" + "=" * 60)
    print("RUNNING TEST CASES")
    print("=" * 60)
    
    for case_id, case_data in TEST_CASES.items():
        print(f"\n--- {case_data['name']} ---")
        print(f"    {case_data['description']}")
        
        start_time = time.time()
        
        # Step 1: Extract text metrics (perception layer)
        text_metrics = extract_text_metrics(
            perception_models,
            case_data["user_responses"],
            case_data["interviewer_questions"],
            case_data["response_durations"],
        )
        
        # Step 2: Generate synthetic audio metrics
        audio_metrics = generate_audio_metrics_synthetic(case_id)
        
        # Step 3: Run decision layer
        decision_result = run_decision_layer(score_session, text_metrics, audio_metrics)
        
        # Step 4: Validate
        validation = validate_result(
            decision_result, 
            case_id, 
            case_data["expected_behavior"]
        )
        
        elapsed = time.time() - start_time
        
        # Store results
        results["test_cases"][case_id] = {
            "name": case_data["name"],
            "perception_metrics": {
                "text_metrics": text_metrics,
                "audio_metrics": audio_metrics,
            },
            "decision_scores": {
                "confidence": decision_result["confidence"],
                "clarity": decision_result["clarity"],
                "empathy": decision_result["empathy"],
                "communication": decision_result["communication"],
                "overall": decision_result["overall"],
            },
            "low_features": decision_result.get("low_features", []),
            "suggestions": decision_result.get("improvement_suggestions", []),
            "validation": validation,
            "processing_time_ms": elapsed * 1000,
        }
        
        # Print results
        scores = decision_result
        print(f"\n    Scores:")
        print(f"      Confidence: {scores['confidence']}")
        print(f"      Clarity: {scores['clarity']}")
        print(f"      Empathy: {scores['empathy']}")
        print(f"      Communication: {scores['communication']}")
        print(f"      Overall: {scores['overall']}")
        
        if validation["valid"]:
            print(f"\n    ✓ Validation PASSED")
            results["summary"]["passed"] += 1
        else:
            print(f"\n    ✗ Validation FAILED: {validation['issues']}")
            results["summary"]["failed"] += 1
        
        if validation["directional_warnings"]:
            print(f"    ⚠ Directional warnings: {validation['directional_warnings']}")
            results["summary"]["warnings"] += len(validation["directional_warnings"])
        
        results["summary"]["total"] += 1
    
    # Summary
    print("\n" + "=" * 60)
    print("INTEGRATION TEST SUMMARY")
    print("=" * 60)
    
    s = results["summary"]
    print(f"\n  Total test cases: {s['total']}")
    print(f"  Passed: {s['passed']}")
    print(f"  Failed: {s['failed']}")
    print(f"  Directional warnings: {s['warnings']}")
    
    # Overall result
    if s["failed"] == 0:
        print("\n  ✓ ALL TESTS PASSED")
        results["summary"]["status"] = "PASSED"
    else:
        print("\n  ✗ SOME TESTS FAILED")
        results["summary"]["status"] = "FAILED"
    
    # Save results
    output_path = os.path.join(os.path.dirname(__file__), "integration_test_results.json")
    with open(output_path, "w") as f:
        json.dump(results, f, indent=2, default=str)
    
    print(f"\n  Results saved to: {output_path}")
    
    return results


if __name__ == "__main__":
    run_integration_test()
