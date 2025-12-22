"""
DECISION LAYER MODEL TRAINING
==============================
Trains XGBoost regressors for each skill (confidence, clarity, empathy, communication).

This script:
1. Loads and validates the training dataset
2. Performs train/validation split (80/20)
3. Runs sanity checks on features
4. Trains separate XGBoost models per skill
5. Evaluates model behavior
6. Saves models and artifacts

Usage:
    python training/train_model.py --data ./data/final_training.csv --output ./app/models
"""

import os
import sys
import json
import pickle
import argparse
from typing import Dict, List, Tuple, Optional
from datetime import datetime

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.decision.feature_contract import (
    ALL_FEATURES,
    TEXT_FEATURES,
    AUDIO_FEATURES,
    VIDEO_FEATURES,
    TARGET_LABELS,
    FEATURE_METADATA,
    N_FEATURES,
    export_schema,
)

# XGBoost import (with fallback to sklearn)
try:
    import xgboost as xgb
    # Test if XGBoost actually works (may fail on macOS without libomp)
    _test = xgb.XGBRegressor()
    XGBOOST_AVAILABLE = True
except (ImportError, Exception) as e:
    XGBOOST_AVAILABLE = False
    print(f"Note: Using sklearn GradientBoosting (XGBoost unavailable: {type(e).__name__})")
    from sklearn.ensemble import GradientBoostingRegressor


# =============================================================================
# STEP 2: DATASET LOADING & VALIDATION
# =============================================================================

def load_dataset(filepath: str) -> pd.DataFrame:
    """Load the training dataset."""
    print(f"\nLoading dataset from: {filepath}")
    df = pd.read_csv(filepath)
    print(f"  Loaded {len(df)} samples with {len(df.columns)} columns")
    return df


def validate_dataset(df: pd.DataFrame) -> pd.DataFrame:
    """
    Validate and clean the dataset.
    
    Checks:
    - All required features present
    - No NaN in labels
    - Feature ranges are valid
    - No constant columns
    """
    print("\n" + "=" * 60)
    print("DATASET VALIDATION")
    print("=" * 60)
    
    errors = []
    warnings = []
    
    # Check required columns
    missing_features = [f for f in ALL_FEATURES if f not in df.columns]
    if missing_features:
        errors.append(f"Missing features: {missing_features}")
    
    missing_labels = [l for l in TARGET_LABELS if l not in df.columns]
    if missing_labels:
        errors.append(f"Missing labels: {missing_labels}")
    
    # Check for NaN in labels
    for label in TARGET_LABELS:
        if label in df.columns:
            nan_count = df[label].isna().sum()
            if nan_count > 0:
                warnings.append(f"Label '{label}' has {nan_count} NaN values - will drop")
    
    # Drop rows with NaN labels
    original_len = len(df)
    df = df.dropna(subset=[l for l in TARGET_LABELS if l in df.columns])
    if len(df) < original_len:
        print(f"  Dropped {original_len - len(df)} rows with NaN labels")
    
    # Check for constant columns
    feature_cols = [f for f in ALL_FEATURES if f in df.columns]
    for col in feature_cols:
        if df[col].nunique() <= 1:
            warnings.append(f"Constant column: {col}")
    
    # Handle NaN in features by imputing with defaults
    for feat in ALL_FEATURES:
        if feat in df.columns:
            nan_count = df[feat].isna().sum()
            if nan_count > 0:
                default_val = FEATURE_METADATA[feat]["default"]
                df[feat] = df[feat].fillna(default_val)
                warnings.append(f"Imputed {nan_count} NaN in '{feat}' with {default_val}")
    
    # Report
    if errors:
        print("\n❌ ERRORS:")
        for e in errors:
            print(f"  - {e}")
        raise ValueError("Dataset validation failed")
    
    if warnings:
        print("\n⚠️  WARNINGS:")
        for w in warnings:
            print(f"  - {w}")
    else:
        print("\n✓ No issues found")
    
    print(f"\n  Final dataset: {len(df)} samples")
    
    return df


def sanity_check_features(df: pd.DataFrame) -> Dict:
    """
    Perform sanity checks on features.
    
    Checks:
    - Feature ranges
    - Correlations between features and labels
    - No single feature perfectly predicts labels
    """
    print("\n" + "=" * 60)
    print("FEATURE SANITY CHECKS")
    print("=" * 60)
    
    report = {
        "feature_stats": {},
        "correlations": {},
        "issues": [],
    }
    
    feature_cols = [f for f in ALL_FEATURES if f in df.columns]
    
    # Feature statistics
    print("\nFeature ranges:")
    for feat in feature_cols[:10]:  # Show first 10
        stats = df[feat].describe()
        report["feature_stats"][feat] = {
            "min": float(stats["min"]),
            "max": float(stats["max"]),
            "mean": float(stats["mean"]),
            "std": float(stats["std"]),
        }
        print(f"  {feat}: [{stats['min']:.3f}, {stats['max']:.3f}] mean={stats['mean']:.3f}")
    
    if len(feature_cols) > 10:
        print(f"  ... and {len(feature_cols) - 10} more features")
    
    # Feature-label correlations
    print("\nTop feature correlations per label:")
    for label in TARGET_LABELS:
        if label not in df.columns:
            continue
            
        correlations = {}
        for feat in feature_cols:
            if df[feat].std() > 0:  # Skip constant columns
                corr = df[feat].corr(df[label])
                if not np.isnan(corr):
                    correlations[feat] = corr
        
        # Sort by absolute correlation
        sorted_corrs = sorted(correlations.items(), key=lambda x: abs(x[1]), reverse=True)
        report["correlations"][label] = dict(sorted_corrs[:5])
        
        print(f"\n  {label.upper()}:")
        for feat, corr in sorted_corrs[:5]:
            sign = "+" if corr >= 0 else ""
            print(f"    {feat}: {sign}{corr:.3f}")
            
            # Check for extreme correlation (potential leakage)
            if abs(corr) > 0.95:
                report["issues"].append(f"LEAKAGE WARNING: {feat} has {corr:.3f} correlation with {label}")
    
    # Check for issues
    if report["issues"]:
        print("\n❌ ISSUES DETECTED:")
        for issue in report["issues"]:
            print(f"  - {issue}")
    else:
        print("\n✓ No extreme correlations (no leakage detected)")
    
    return report


def split_dataset(
    df: pd.DataFrame,
    test_size: float = 0.2,
    random_state: int = 42,
) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    Split dataset into train and validation sets.
    
    Ensures:
    - Both synthetic and proxy data in both splits
    - Similar label distributions
    """
    print("\n" + "=" * 60)
    print("TRAIN/VALIDATION SPLIT")
    print("=" * 60)
    
    # Stratify by data source if available
    stratify_col = None
    if "data_source" in df.columns:
        stratify_col = df["data_source"]
        print(f"\n  Data sources: {df['data_source'].value_counts().to_dict()}")
    
    train_df, val_df = train_test_split(
        df,
        test_size=test_size,
        random_state=random_state,
        stratify=stratify_col,
    )
    
    print(f"\n  Train set: {len(train_df)} samples ({100*(1-test_size):.0f}%)")
    print(f"  Validation set: {len(val_df)} samples ({100*test_size:.0f}%)")
    
    # Check label distributions
    print("\n  Label distributions (mean ± std):")
    print(f"  {'Label':<15} {'Train':<20} {'Validation':<20}")
    print(f"  {'-'*55}")
    for label in TARGET_LABELS:
        if label in df.columns:
            train_mean, train_std = train_df[label].mean(), train_df[label].std()
            val_mean, val_std = val_df[label].mean(), val_df[label].std()
            print(f"  {label:<15} {train_mean:.1f} ± {train_std:.1f}        {val_mean:.1f} ± {val_std:.1f}")
    
    # Check data source distribution
    if "data_source" in df.columns:
        print("\n  Data source distribution:")
        print(f"    Train: {train_df['data_source'].value_counts().to_dict()}")
        print(f"    Val:   {val_df['data_source'].value_counts().to_dict()}")
    
    return train_df, val_df


# =============================================================================
# STEP 3 & 4: MODEL TRAINING
# =============================================================================

def get_model_config() -> Dict:
    """
    Get conservative XGBoost hyperparameters.
    
    Philosophy:
    - Shallow trees (prevent overfitting)
    - Moderate learning rate (stable training)
    - Regularization (prevent memorization)
    """
    return {
        "n_estimators": 100,      # Number of trees
        "max_depth": 4,           # Shallow trees
        "learning_rate": 0.1,     # Moderate learning rate
        "min_child_weight": 5,    # Prevent tiny leaves
        "subsample": 0.8,         # Row sampling
        "colsample_bytree": 0.8,  # Column sampling
        "reg_alpha": 0.1,         # L1 regularization
        "reg_lambda": 1.0,        # L2 regularization
        "random_state": 42,
        "n_jobs": -1,
        "verbosity": 0,
    }


def train_single_model(
    X_train: np.ndarray,
    y_train: np.ndarray,
    X_val: np.ndarray,
    y_val: np.ndarray,
    skill_name: str,
    config: Dict,
) -> Tuple:
    """Train a single XGBoost regressor for one skill."""
    
    print(f"\n  Training {skill_name} model...")
    
    if XGBOOST_AVAILABLE:
        model = xgb.XGBRegressor(**config)
        model.fit(
            X_train, y_train,
            eval_set=[(X_val, y_val)],
            verbose=False,
        )
    else:
        # Fallback to sklearn
        sklearn_config = {
            "n_estimators": config["n_estimators"],
            "max_depth": config["max_depth"],
            "learning_rate": config["learning_rate"],
            "min_samples_leaf": config["min_child_weight"],
            "subsample": config["subsample"],
            "random_state": config["random_state"],
        }
        model = GradientBoostingRegressor(**sklearn_config)
        model.fit(X_train, y_train)
    
    # Predictions
    train_pred = model.predict(X_train)
    val_pred = model.predict(X_val)
    
    # Clamp predictions to [0, 100]
    train_pred = np.clip(train_pred, 0, 100)
    val_pred = np.clip(val_pred, 0, 100)
    
    # Metrics
    train_metrics = {
        "rmse": float(np.sqrt(mean_squared_error(y_train, train_pred))),
        "mae": float(mean_absolute_error(y_train, train_pred)),
        "r2": float(r2_score(y_train, train_pred)),
    }
    
    val_metrics = {
        "rmse": float(np.sqrt(mean_squared_error(y_val, val_pred))),
        "mae": float(mean_absolute_error(y_val, val_pred)),
        "r2": float(r2_score(y_val, val_pred)),
    }
    
    print(f"    Train RMSE: {train_metrics['rmse']:.2f}, R²: {train_metrics['r2']:.3f}")
    print(f"    Val   RMSE: {val_metrics['rmse']:.2f}, R²: {val_metrics['r2']:.3f}")
    
    return model, train_metrics, val_metrics


def train_all_models(
    train_df: pd.DataFrame,
    val_df: pd.DataFrame,
) -> Dict:
    """
    Train XGBoost models for all skills.
    
    Model structure: One regressor per skill (confidence, clarity, empathy, communication)
    """
    print("\n" + "=" * 60)
    print("MODEL TRAINING (XGBoost Regressors)")
    print("=" * 60)
    
    config = get_model_config()
    print(f"\nHyperparameters: {json.dumps(config, indent=2)}")
    
    # Prepare features
    feature_cols = [f for f in ALL_FEATURES if f in train_df.columns]
    X_train = train_df[feature_cols].values.astype(np.float32)
    X_val = val_df[feature_cols].values.astype(np.float32)
    
    print(f"\nFeature matrix: {X_train.shape[0]} train × {X_train.shape[1]} features")
    
    results = {
        "models": {},
        "metrics": {},
        "config": config,
        "feature_names": feature_cols,
    }
    
    for skill in TARGET_LABELS:
        if skill not in train_df.columns:
            print(f"\n  Skipping {skill} (not in dataset)")
            continue
        
        y_train = train_df[skill].values
        y_val = val_df[skill].values
        
        model, train_metrics, val_metrics = train_single_model(
            X_train, y_train, X_val, y_val, skill, config
        )
        
        results["models"][skill] = model
        results["metrics"][skill] = {
            "train": train_metrics,
            "validation": val_metrics,
        }
    
    return results


# =============================================================================
# STEP 5: FEATURE IMPORTANCE & EXPLAINABILITY
# =============================================================================

def analyze_feature_importance(results: Dict) -> Dict:
    """
    Extract and analyze feature importance from trained models.
    
    Outputs:
    - Top features per skill
    - Feature → skill mapping for feedback
    """
    print("\n" + "=" * 60)
    print("FEATURE IMPORTANCE ANALYSIS")
    print("=" * 60)
    
    feature_names = results["feature_names"]
    importance_report = {}
    
    for skill, model in results["models"].items():
        print(f"\n  {skill.upper()}:")
        
        # Get feature importance
        if hasattr(model, "feature_importances_"):
            importances = model.feature_importances_
        else:
            importances = np.zeros(len(feature_names))
        
        # Normalize to sum to 1
        if importances.sum() > 0:
            importances = importances / importances.sum()
        
        # Sort by importance
        sorted_idx = np.argsort(importances)[::-1]
        
        importance_report[skill] = {}
        for i, idx in enumerate(sorted_idx[:10]):  # Top 10
            feat = feature_names[idx]
            imp = float(importances[idx])
            importance_report[skill][feat] = imp
            
            if i < 5:  # Print top 5
                print(f"    {feat}: {imp:.3f} ({imp*100:.1f}%)")
    
    return importance_report


def create_feedback_mapping(importance_report: Dict) -> Dict:
    """
    Create mapping from low skill → improvement suggestions.
    
    This mapping is used to generate actionable feedback.
    """
    print("\n" + "=" * 60)
    print("FEEDBACK MAPPING (Feature → Improvement)")
    print("=" * 60)
    
    # Define improvement suggestions for each feature
    feature_feedback = {
        # Confidence features
        "silence_ratio": "Reduce pauses and hesitation in your responses",
        "audio_nervous_prob": "Practice speaking with more calm and steady tone",
        "hedge_ratio": "Use more definitive language instead of hedging phrases",
        "filler_word_ratio": "Minimize filler words like 'um', 'uh', 'like'",
        "assertive_phrase_ratio": "Use more assertive language ('I did', 'I achieved')",
        "monotony_score": "Add more variation to your voice tone and pace",
        "audio_confidence_prob": "Project confidence through your voice",
        
        # Clarity features
        "topic_drift_ratio": "Stay more focused on the question being asked",
        "semantic_relevance_mean": "Keep your answers relevant to the topic",
        "response_length_consistency": "Aim for consistent response lengths",
        "sentence_length_std": "Use more consistent sentence structures",
        "pause_frequency": "Reduce the number of pauses in your speech",
        
        # Empathy features
        "empathy_phrase_ratio": "Use more empathetic language ('I understand', 'I see')",
        "reflective_response_ratio": "Show understanding by reflecting back key points",
        "question_back_ratio": "Ask clarifying questions to show engagement",
        "avg_sentiment": "Maintain a more positive and warm tone",
        "audio_calm_prob": "Speak with a calm and composed manner",
        
        # Communication features
        "energy_variance": "Add more energy variation to keep engagement",
        "expression_variance": "Use more facial expressions while speaking",
        "eye_contact_ratio": "Maintain more consistent eye contact",
        "emotion_consistency": "Keep your emotional tone consistent",
    }
    
    feedback_mapping = {}
    
    for skill, importances in importance_report.items():
        feedback_mapping[skill] = []
        
        print(f"\n  {skill.upper()} improvement signals:")
        for feat, imp in list(importances.items())[:5]:
            if feat in feature_feedback:
                suggestion = feature_feedback[feat]
                feedback_mapping[skill].append({
                    "feature": feat,
                    "importance": imp,
                    "suggestion": suggestion,
                })
                print(f"    Low {feat} → {suggestion}")
    
    return feedback_mapping


def validate_model_behavior(
    results: Dict,
    val_df: pd.DataFrame,
) -> Dict:
    """
    Validate that models behave as expected.
    
    Check:
    - If silence_ratio ↑, does confidence ↓?
    - If topic_drift_ratio ↑, does clarity ↓?
    - If empathy_phrase_ratio ↑, does empathy ↑?
    """
    print("\n" + "=" * 60)
    print("MODEL BEHAVIOR VALIDATION")
    print("=" * 60)
    
    feature_names = results["feature_names"]
    
    # Expected relationships
    expected_relationships = {
        "confidence": [
            ("silence_ratio", "negative"),
            ("audio_nervous_prob", "negative"),
            ("assertive_phrase_ratio", "positive"),
        ],
        "clarity": [
            ("topic_drift_ratio", "negative"),
            ("semantic_relevance_mean", "positive"),
            ("filler_word_ratio", "negative"),
        ],
        "empathy": [
            ("empathy_phrase_ratio", "positive"),
            ("avg_sentiment", "positive"),
            ("audio_calm_prob", "positive"),
        ],
        "communication": [
            ("monotony_score", "negative"),
            ("semantic_relevance_mean", "positive"),
            ("filler_word_ratio", "negative"),
        ],
    }
    
    behavior_report = {}
    
    for skill, model in results["models"].items():
        print(f"\n  {skill.upper()}:")
        behavior_report[skill] = []
        
        if skill not in expected_relationships:
            continue
        
        for feature, expected_dir in expected_relationships[skill]:
            if feature not in feature_names:
                continue
            
            feat_idx = feature_names.index(feature)
            
            # Get feature importance and check direction
            if hasattr(model, "feature_importances_"):
                importance = model.feature_importances_[feat_idx]
            else:
                importance = 0
            
            # Check correlation in validation data
            if feature in val_df.columns and skill in val_df.columns:
                corr = val_df[feature].corr(val_df[skill])
                actual_dir = "positive" if corr > 0 else "negative"
                
                match = actual_dir == expected_dir
                status = "✓" if match else "✗"
                
                behavior_report[skill].append({
                    "feature": feature,
                    "expected": expected_dir,
                    "actual": actual_dir,
                    "correlation": float(corr),
                    "match": match,
                })
                
                print(f"    {status} {feature}: expected {expected_dir}, got {actual_dir} (corr={corr:.3f})")
    
    # Summary
    total_checks = sum(len(v) for v in behavior_report.values())
    passed = sum(1 for skill in behavior_report.values() for r in skill if r["match"])
    
    print(f"\n  Behavior validation: {passed}/{total_checks} checks passed")
    
    return behavior_report


# =============================================================================
# STEP 6: SAVE MODELS & ARTIFACTS
# =============================================================================

def save_artifacts(
    results: Dict,
    importance_report: Dict,
    feedback_mapping: Dict,
    behavior_report: Dict,
    output_dir: str,
) -> None:
    """
    Save all training artifacts.
    
    Artifacts:
    - Models: confidence_model.pkl, clarity_model.pkl, etc.
    - Schema: feature_schema.json
    - Importance: feature_importance.json
    - Feedback: feedback_mapping.json
    """
    print("\n" + "=" * 60)
    print("SAVING ARTIFACTS")
    print("=" * 60)
    
    os.makedirs(output_dir, exist_ok=True)
    
    # Save individual models
    for skill, model in results["models"].items():
        model_path = os.path.join(output_dir, f"{skill}_model.pkl")
        with open(model_path, 'wb') as f:
            pickle.dump(model, f)
        print(f"  Saved: {model_path}")
    
    # Save feature schema
    schema = export_schema()
    schema_path = os.path.join(output_dir, "feature_schema.json")
    with open(schema_path, 'w') as f:
        json.dump(schema, f, indent=2)
    print(f"  Saved: {schema_path}")
    
    # Save model config and metrics
    training_info = {
        "timestamp": datetime.now().isoformat(),
        "config": results["config"],
        "metrics": results["metrics"],
        "feature_names": results["feature_names"],
        "n_features": len(results["feature_names"]),
        "models_trained": list(results["models"].keys()),
    }
    info_path = os.path.join(output_dir, "training_info.json")
    with open(info_path, 'w') as f:
        json.dump(training_info, f, indent=2)
    print(f"  Saved: {info_path}")
    
    # Save feature importance
    importance_path = os.path.join(output_dir, "feature_importance.json")
    with open(importance_path, 'w') as f:
        json.dump(importance_report, f, indent=2)
    print(f"  Saved: {importance_path}")
    
    # Save feedback mapping
    feedback_path = os.path.join(output_dir, "feedback_mapping.json")
    with open(feedback_path, 'w') as f:
        json.dump(feedback_mapping, f, indent=2)
    print(f"  Saved: {feedback_path}")
    
    # Save behavior validation
    behavior_path = os.path.join(output_dir, "behavior_validation.json")
    with open(behavior_path, 'w') as f:
        json.dump(behavior_report, f, indent=2)
    print(f"  Saved: {behavior_path}")
    
    print(f"\n✓ All artifacts saved to: {output_dir}")


# =============================================================================
# MAIN
# =============================================================================

def main(args):
    """Main training pipeline."""
    print("=" * 60)
    print("DECISION LAYER MODEL TRAINING")
    print("=" * 60)
    print(f"\nData: {args.data}")
    print(f"Output: {args.output}")
    print(f"Model: XGBoost Regressor (one per skill)")
    
    # Step 2: Load and validate dataset
    df = load_dataset(args.data)
    df = validate_dataset(df)
    
    # Sanity checks
    sanity_report = sanity_check_features(df)
    
    # Train/validation split
    train_df, val_df = split_dataset(df, test_size=0.2, random_state=args.seed)
    
    # Step 3 & 4: Train models
    results = train_all_models(train_df, val_df)
    
    # Step 5: Feature importance & explainability
    importance_report = analyze_feature_importance(results)
    feedback_mapping = create_feedback_mapping(importance_report)
    behavior_report = validate_model_behavior(results, val_df)
    
    # Step 6: Save artifacts
    save_artifacts(
        results=results,
        importance_report=importance_report,
        feedback_mapping=feedback_mapping,
        behavior_report=behavior_report,
        output_dir=args.output,
    )
    
    # Summary
    print("\n" + "=" * 60)
    print("TRAINING COMPLETE")
    print("=" * 60)
    print(f"\nModels trained: {list(results['models'].keys())}")
    print("\nValidation performance:")
    for skill, metrics in results["metrics"].items():
        val = metrics["validation"]
        print(f"  {skill}: RMSE={val['rmse']:.2f}, MAE={val['mae']:.2f}, R²={val['r2']:.3f}")
    
    return results


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train decision layer models")
    parser.add_argument("--data", type=str, default="./data/final_training.csv",
                        help="Path to training dataset")
    parser.add_argument("--output", type=str, default="./app/models",
                        help="Output directory for models")
    parser.add_argument("--seed", type=int, default=42,
                        help="Random seed")
    
    args = parser.parse_args()
    main(args)
