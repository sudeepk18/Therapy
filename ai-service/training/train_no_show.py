"""
training/train_no_show.py
Self-contained training script for the no-show prediction model.
Works out of the box with standard library (math, random, json, csv)
and utilizes scikit-learn / pandas if installed.
"""

import sys
import os
import csv
import math
import json
import random
from pathlib import Path

# Paths
DATASET_PATH = Path(__file__).parent.parent / "datasets" / "synthetic_sessions.csv"
MODELS_DIR = Path(__file__).parent.parent / "saved_models"
WEIGHTS_PATH = MODELS_DIR / "no_show_weights.json"
MODEL_PATH = MODELS_DIR / "no_show_model.pkl"
SCALER_PATH = MODELS_DIR / "no_show_scaler.pkl"

MODELS_DIR.mkdir(exist_ok=True)

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


def sigmoid(z):
    return 1.0 / (1.0 + math.exp(-max(-50, min(50, z))))


def train_pure_python():
    print("\n" + "=" * 60)
    print("  Unfazed AI - No-Show Prediction Model Training")
    print("  NOTE: Training on synthetic clinical dataset")
    print("=" * 60 + "\n")

    if not DATASET_PATH.exists():
        print("Dataset not found. Generating synthetic dataset first...")
        from datasets.generate_synthetic_data import generate
        generate()

    # Load rows
    X = []
    y = []
    with open(DATASET_PATH, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            days_since = -1.0 if row["days_since_last_session"] == "" else float(row["days_since_last_session"])
            feat = [
                float(row["day_of_week"]),
                float(row["hour_of_day"]),
                float(row["booking_lead_days"]),
                float(row["client_historical_no_show_rate"]),
                float(row["client_total_sessions"]),
                days_since,
                float(row["is_video"]),
            ]
            X.append(feat)
            y.append(int(row["no_show"]))

    n_samples = len(X)
    n_features = len(FEATURES)

    # Compute mean and standard deviation for standardization
    means = [sum(X[i][j] for i in range(n_samples)) / n_samples for j in range(n_features)]
    stds = []
    for j in range(n_features):
        variance = sum((X[i][j] - means[j]) ** 2 for i in range(n_samples)) / n_samples
        stds.append(math.sqrt(variance) if variance > 0 else 1.0)

    # Standardize X
    X_scaled = []
    for i in range(n_samples):
        X_scaled.append([(X[i][j] - means[j]) / stds[j] for j in range(n_features)])

    # Split 80/20 train/test
    indices = list(range(n_samples))
    random.seed(42)
    random.shuffle(indices)
    split = int(n_samples * 0.8)
    train_idx = indices[:split]
    test_idx = indices[split:]

    # Train Logistic Regression via Gradient Descent with L2 regularization
    weights = [0.0] * n_features
    bias = -1.5
    lr = 0.05
    epochs = 400
    reg = 0.01

    for epoch in range(epochs):
        grad_w = [0.0] * n_features
        grad_b = 0.0
        for i in train_idx:
            z = bias + sum(X_scaled[i][j] * weights[j] for j in range(n_features))
            pred = sigmoid(z)
            err = pred - y[i]
            for j in range(n_features):
                grad_w[j] += err * X_scaled[i][j]
            grad_b += err

        n_train = len(train_idx)
        for j in range(n_features):
            weights[j] -= lr * (grad_w[j] / n_train + reg * weights[j])
        bias -= lr * (grad_b / n_train)

    # Evaluate on test set
    tp = fp = tn = fn = 0
    for i in test_idx:
        z = bias + sum(X_scaled[i][j] * weights[j] for j in range(n_features))
        prob = sigmoid(z)
        pred_label = 1 if prob >= 0.5 else 0
        actual = y[i]

        if pred_label == 1 and actual == 1:
            tp += 1
        elif pred_label == 1 and actual == 0:
            fp += 1
        elif pred_label == 0 and actual == 0:
            tn += 1
        else:
            fn += 1

    total_test = len(test_idx)
    acc = (tp + tn) / total_test
    prec = tp / (tp + fp) if (tp + fp) > 0 else 0
    rec = tp / (tp + fn) if (tp + fn) > 0 else 0
    f1 = 2 * (prec * rec) / (prec + rec) if (prec + rec) > 0 else 0

    print("Evaluation Metrics (Test Set):")
    print(f"   Accuracy:  {acc:.4f}")
    print(f"   Precision: {prec:.4f}")
    print(f"   Recall:    {rec:.4f}")
    print(f"   F1 Score:  {f1:.4f}")
    print("\nConfusion Matrix:")
    print(f"   TN={tn}  FP={fp}")
    print(f"   FN={fn}  TP={tp}")

    print("\nFeature Coefficients:")
    for feat, w in sorted(zip(FEATURES, weights), key=lambda x: abs(x[1]), reverse=True):
        print(f"   {feat:35s}: {w:+.4f}")

    # Save weights JSON
    model_data = {
        "model_type": "logistic_regression",
        "features": FEATURES,
        "coefficients": weights,
        "intercept": bias,
        "mean": means,
        "scale": stds,
        "metrics": {"accuracy": acc, "precision": prec, "recall": rec, "f1": f1},
    }
    with open(WEIGHTS_PATH, "w", encoding="utf-8") as f:
        json.dump(model_data, f, indent=2)

    print(f"\n[OK] Model weights saved -> {WEIGHTS_PATH}")


if __name__ == "__main__":
    train_pure_python()
