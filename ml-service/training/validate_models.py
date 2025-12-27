"""
FINAL MODEL VALIDATION
=======================
Comprehensive validation of the trained models.

Tests:
1. Synthetic samples - verify predictions match expected ranges
2. Proxy samples - verify generalization
3. Edge cases - verify stability with extreme inputs
4. Behavior validation - verify directional correctness
"""

import os
import sys
import json
import numpy as np
import pandas as pd
from typing import Dict, List

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.decision.scoring import score_session, get_models_status
from app.decision.feature_contract import ALL_FEATURES, FEATURE_METADATA


# =============================================================================
# TEST CASES
# =============================================================================

def test_synthetic_samples():
    """Test scoring on synthetic samples from training data."""
    print("\n" + "=" * 60)
    print("TEST 1: SYNTHETIC SAMPLES")
    print("=" * 60)
    
    # Load synthetic data
    data_path = "./data/synthetic_training.csv"
    if not os.path.exists(data_path):
        print("  ⚠ Synthetic data not found, skipping")
        return True
    
    df = pd.read_csv(data_path)
    
    # Sample 10 random rows
    samples = df.sample(n=min(10, len(df)), random_state=42)
    
    all_passed = True
    for idx, row in samples.iterrows():
        features = {col: row[col] for col in ALL_FEATURES if col in row.index}
        result = score_session(features)
        
        # Check scores are in valid range
        for skill in ["confidence", "clarity", "empathy", "communication"]:
            score = result[skill]
            if not (0 <= score <= 100):
                print(f"  ✗ Sample {idx}: {skill} = {score} (out of range)")
                all_passed = False
        
        # Check no NaN in output
        if any(v is None or (isinstance(v, float) and np.isnan(v)) 
               for v in [result["confidence"], result["clarity"], result["empathy"], result["communication"]]):
            print(f"  ✗ Sample {idx}: Contains NaN values")
            all_passed = False
    
    if all_passed:
        print(f"  ✓ All {len(samples)} synthetic samples passed")
    
    return all_passed


def test_proxy_samples():
    """Test scoring on proxy samples from IEMOCAP."""
    print("\n" + "=" * 60)
    print("TEST 2: PROXY SAMPLES")
    print("=" * 60)
    
    # Load proxy data
    data_path = "./data/proxy_training.csv"
    if not os.path.exists(data_path):
        print("  ⚠ Proxy data not found, skipping")
        return True
    
    df = pd.read_csv(data_path)
    
    # Sample 10 random rows
    samples = df.sample(n=min(10, len(df)), random_state=42)
    
    all_passed = True
    for idx, row in samples.iterrows():
        features = {col: row[col] if pd.notna(row[col]) else None 
                   for col in ALL_FEATURES if col in row.index}
        result = score_session(features)
        
        # Check scores are in valid range
        for skill in ["confidence", "clarity", "empathy", "communication"]:
            score = result[skill]
            if not (0 <= score <= 100):
                print(f"  ✗ Sample {idx}: {skill} = {score} (out of range)")
                all_passed = False
    
    if all_passed:
        print(f"  ✓ All {len(samples)} proxy samples passed")
    
    return all_passed


def test_edge_cases():
    """Test scoring with edge case inputs."""
    print("\n" + "=" * 60)
    print("TEST 3: EDGE CASES")
    print("=" * 60)
    
    test_cases = [
        # Empty input
        ("Empty input", {}),
        
        # All zeros
        ("All zeros", {feat: 0.0 for feat in ALL_FEATURES}),
        
        # All max values
        ("All max", {feat: FEATURE_METADATA[feat]["max"] for feat in ALL_FEATURES}),
        
        # All min values
        ("All min", {feat: FEATURE_METADATA[feat]["min"] for feat in ALL_FEATURES}),
        
        # Only text features
        ("Text only", {
            "semantic_relevance_mean": 0.8,
            "topic_drift_ratio": 0.1,
            "assertive_phrase_ratio": 0.5,
        }),
        
        # Only audio features
        ("Audio only", {
            "speech_rate_wpm": 150,
            "silence_ratio": 0.2,
            "audio_confidence_prob": 0.7,
        }),
        
        # Perfect candidate
        ("Perfect candidate", {
            "semantic_relevance_mean": 0.95,
            "topic_drift_ratio": 0.02,
            "assertive_phrase_ratio": 0.6,
            "filler_word_ratio": 0.01,
            "silence_ratio": 0.05,
            "audio_confidence_prob": 0.9,
            "audio_nervous_prob": 0.05,
            "monotony_score": 0.1,
            "empathy_phrase_ratio": 0.3,
            "eye_contact_ratio": 0.9,
        }),
        
        # Nervous candidate
        ("Nervous candidate", {
            "semantic_relevance_mean": 0.5,
            "topic_drift_ratio": 0.4,
            "hedge_ratio": 0.5,
            "filler_word_ratio": 0.3,
            "silence_ratio": 0.4,
            "audio_confidence_prob": 0.2,
            "audio_nervous_prob": 0.8,
            "monotony_score": 0.7,
        }),
        
        # Mixed with NaN
        ("With None values", {
            "semantic_relevance_mean": 0.7,
            "eye_contact_ratio": None,
            "smile_ratio": None,
        }),
    ]
    
    all_passed = True
    for name, features in test_cases:
        try:
            result = score_session(features)
            
            # Check all scores are valid
            valid = True
            for skill in ["confidence", "clarity", "empathy", "communication", "overall"]:
                score = result.get(skill)
                if score is None or not (0 <= score <= 100):
                    valid = False
                    break
            
            if valid:
                print(f"  ✓ {name}: conf={result['confidence']}, clar={result['clarity']}, "
                      f"emp={result['empathy']}, comm={result['communication']}")
            else:
                print(f"  ✗ {name}: Invalid scores")
                all_passed = False
                
        except Exception as e:
            print(f"  ✗ {name}: Exception - {e}")
            all_passed = False
    
    return all_passed


def test_behavior_validation():
    """Test that models behave as expected (directional correctness)."""
    print("\n" + "=" * 60)
    print("TEST 4: BEHAVIOR VALIDATION")
    print("=" * 60)
    
    # Base case
    base = {
        "semantic_relevance_mean": 0.7,
        "topic_drift_ratio": 0.15,
        "assertive_phrase_ratio": 0.2,
        "filler_word_ratio": 0.1,
        "hedge_ratio": 0.1,
        "silence_ratio": 0.2,
        "audio_confidence_prob": 0.5,
        "audio_nervous_prob": 0.3,
        "monotony_score": 0.3,
        "empathy_phrase_ratio": 0.1,
        "audio_calm_prob": 0.5,
    }
    
    base_result = score_session(base)
    
    # Test directional changes
    tests = [
        # (feature_to_change, new_value, skill_expected_to_change, expected_direction)
        ("silence_ratio", 0.6, "confidence", "decrease"),
        ("audio_nervous_prob", 0.8, "confidence", "decrease"),
        ("assertive_phrase_ratio", 0.5, "confidence", "increase"),
        ("topic_drift_ratio", 0.5, "clarity", "decrease"),
        ("semantic_relevance_mean", 0.95, "clarity", "increase"),
        ("empathy_phrase_ratio", 0.4, "empathy", "increase"),
        ("monotony_score", 0.8, "communication", "decrease"),
        ("filler_word_ratio", 0.4, "communication", "decrease"),
    ]
    
    all_passed = True
    for feat, new_val, skill, direction in tests:
        modified = base.copy()
        modified[feat] = new_val
        
        modified_result = score_session(modified)
        
        base_score = base_result[skill]
        mod_score = modified_result[skill]
        
        if direction == "increase":
            passed = mod_score >= base_score
        else:
            passed = mod_score <= base_score
        
        status = "✓" if passed else "✗"
        change = mod_score - base_score
        print(f"  {status} {feat} → {new_val}: {skill} {base_score}→{mod_score} (Δ{change:+.0f}, expected {direction})")
        
        if not passed:
            all_passed = False
    
    return all_passed


def test_stability():
    """Test that same input produces same output."""
    print("\n" + "=" * 60)
    print("TEST 5: STABILITY (Determinism)")
    print("=" * 60)
    
    features = {
        "semantic_relevance_mean": 0.75,
        "topic_drift_ratio": 0.12,
        "assertive_phrase_ratio": 0.28,
        "silence_ratio": 0.18,
        "audio_confidence_prob": 0.65,
    }
    
    results = [score_session(features) for _ in range(5)]
    
    # Check all results are identical
    all_same = True
    for skill in ["confidence", "clarity", "empathy", "communication"]:
        scores = [r[skill] for r in results]
        if len(set(scores)) > 1:
            print(f"  ✗ {skill}: Non-deterministic - {scores}")
            all_same = False
    
    if all_same:
        print(f"  ✓ All 5 runs produced identical results")
        r = results[0]
        print(f"    confidence={r['confidence']}, clarity={r['clarity']}, "
              f"empathy={r['empathy']}, communication={r['communication']}")
    
    return all_same


def test_no_crashes():
    """Test that the service doesn't crash with various inputs."""
    print("\n" + "=" * 60)
    print("TEST 6: NO CRASHES")
    print("=" * 60)
    
    crash_tests = [
        {},
        None,
        {"invalid_feature": 999},
        {"semantic_relevance_mean": "not_a_number"},
        {"silence_ratio": float('inf')},
        {"silence_ratio": float('-inf')},
        {feat: np.random.random() for feat in ALL_FEATURES},
    ]
    
    all_passed = True
    for i, test_input in enumerate(crash_tests):
        try:
            if test_input is None:
                test_input = {}
            result = score_session(test_input)
            
            # Just check it returns something valid
            if "confidence" in result:
                print(f"  ✓ Test {i+1}: No crash")
            else:
                print(f"  ✗ Test {i+1}: Invalid response")
                all_passed = False
        except Exception as e:
            print(f"  ✗ Test {i+1}: Crashed with {type(e).__name__}: {e}")
            all_passed = False
    
    return all_passed


# =============================================================================
# MAIN
# =============================================================================

def main():
    """Run all validation tests."""
    print("=" * 60)
    print("DECISION LAYER FINAL VALIDATION")
    print("=" * 60)
    
    # Check models are loaded
    status = get_models_status()
    if not status["loaded"]:
        print("ERROR: Models not loaded!")
        return False
    
    print(f"\nModels loaded: {status['models']}")
    
    # Run all tests
    results = {
        "synthetic_samples": test_synthetic_samples(),
        "proxy_samples": test_proxy_samples(),
        "edge_cases": test_edge_cases(),
        "behavior_validation": test_behavior_validation(),
        "stability": test_stability(),
        "no_crashes": test_no_crashes(),
    }
    
    # Summary
    print("\n" + "=" * 60)
    print("VALIDATION SUMMARY")
    print("=" * 60)
    
    all_passed = True
    for test_name, passed in results.items():
        status = "✓ PASS" if passed else "✗ FAIL"
        print(f"  {status}: {test_name}")
        if not passed:
            all_passed = False
    
    print("\n" + "=" * 60)
    if all_passed:
        print("✓ ALL TESTS PASSED - Decision Layer is ready for production")
    else:
        print("✗ SOME TESTS FAILED - Review and fix issues")
    print("=" * 60)
    
    return all_passed


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
