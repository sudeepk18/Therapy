"""
training/train_no_show.py
Training script for the no-show prediction Logistic Regression model.

Dataset:
  Uses synthetic data from datasets/synthetic_sessions.csv during development.
  Replace with real validated session data before production use.

IMPORTANT:
  This script trains on SYNTHETIC data.
  The resulting model is a proof-of-concept.
  Performance metrics shown are on synthetic data only.
  Retrain with real data for production accuracy.

Usage:
  cd ai-service
  python training/train_no_show.py
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import pandas as pd
import numpy as np
from pathlib import Path
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score,
    f1_score, confusion_matrix, classification_report,
    roc_auc_score,
)
import joblib

# ── Paths ─────────────────────────────────────────────────────────────────────
DATASET_PATH   = Path(__file__).parent.parent / "datasets" / "synthetic_sessions.csv"
MODELS_DIR     = Path(__file__).parent.parent / "saved_models"
MODEL_PATH     = MODELS_DIR / "no_show_model.pkl"
SCALER_PATH    = MODELS_DIR / "no_show_scaler.pkl"

MODELS_DIR.mkdir(exist_ok=True)

# ── Feature columns ───────────────────────────────────────────────────────────
FEATURES = [
    "day_of_week",
    "hour_of_day",
    "booking_lead_days",
    "client_historical_no_show_rate",
    "client_total_sessions",
    "days_since_last_session",
    "is_video",
]
TARGET = "no_show"


def load_data():
    print(f"📂 Loading dataset from {DATASET_PATH}")
    df = pd.read_csv(DATASET_PATH)
    print(f"   Rows: {len(df)}, Columns: {list(df.columns)}")
    print(f"   No-show rate: {df[TARGET].mean():.2%}")
    return df


def prepare_features(df: pd.DataFrame):
    X = df[FEATURES].copy()
    y = df[TARGET].copy()
    # Fill missing days_since_last_session with -1 (first appointment)
    X["days_since_last_session"] = X["days_since_last_session"].fillna(-1)
    return X, y


def train():
    print("\n" + "="*60)
    print("  Unfazed AI — No-Show Prediction Model Training")
    print("  ⚠️  NOTE: Training on SYNTHETIC data (proof-of-concept)")
    print("="*60 + "\n")

    df = load_data()
    X, y = prepare_features(df)

    # Train/test split (stratified to preserve class balance)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    # Scale features
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled  = scaler.transform(X_test)

    # Logistic Regression (interpretable, fast, handles class imbalance)
    model = LogisticRegression(
        C=1.0,
        max_iter=1000,
        class_weight="balanced",  # Handle class imbalance
        random_state=42,
    )
    model.fit(X_train_scaled, y_train)

    # ── Evaluation ────────────────────────────────────────────────────────────
    y_pred  = model.predict(X_test_scaled)
    y_proba = model.predict_proba(X_test_scaled)[:, 1]

    print("\n📊 Evaluation Metrics (test set):")
    print(f"   Accuracy:  {accuracy_score(y_test, y_pred):.4f}")
    print(f"   Precision: {precision_score(y_test, y_pred):.4f}")
    print(f"   Recall:    {recall_score(y_test, y_pred):.4f}")
    print(f"   F1 Score:  {f1_score(y_test, y_pred):.4f}")
    print(f"   ROC-AUC:   {roc_auc_score(y_test, y_proba):.4f}")

    print("\n   Confusion Matrix:")
    cm = confusion_matrix(y_test, y_pred)
    print(f"   TN={cm[0,0]}  FP={cm[0,1]}")
    print(f"   FN={cm[1,0]}  TP={cm[1,1]}")

    print("\n   Classification Report:")
    print(classification_report(y_test, y_pred, target_names=["Show", "No-Show"]))

    # Cross-validation F1 score
    cv_scores = cross_val_score(
        LogisticRegression(C=1.0, max_iter=1000, class_weight="balanced", random_state=42),
        scaler.transform(X), y, cv=5, scoring="f1"
    )
    print(f"   5-fold CV F1: {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")

    # Feature importance (coefficients)
    print("\n🔍 Feature Coefficients:")
    for feat, coef in sorted(zip(FEATURES, model.coef_[0]), key=lambda x: abs(x[1]), reverse=True):
        print(f"   {feat:45s}: {coef:+.4f}")

    # ── Save ──────────────────────────────────────────────────────────────────
    joblib.dump(model,  MODEL_PATH)
    joblib.dump(scaler, SCALER_PATH)
    print(f"\n✅ Model saved  → {MODEL_PATH}")
    print(f"   Scaler saved → {SCALER_PATH}")
    print("\n⚠️  REMINDER: This model was trained on SYNTHETIC data.")
    print("   Retrain with real validated session data before production use.")


if __name__ == "__main__":
    train()
