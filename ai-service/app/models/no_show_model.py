"""
app/models/no_show_model.py
No-show risk prediction using Logistic Regression with built-in heuristic fallback.
"""

import os
import logging
import json
from pathlib import Path

logger = logging.getLogger(__name__)

MODEL_PATH = Path(__file__).parent.parent.parent / "saved_models" / "no_show_model.pkl"
SCALER_PATH = Path(__file__).parent.parent.parent / "saved_models" / "no_show_scaler.pkl"
WEIGHTS_PATH = Path(__file__).parent.parent.parent / "saved_models" / "no_show_weights.json"

MODEL_VERSION = "1.0.0-logistic"

# Risk thresholds
THRESHOLD_HIGH   = 0.65
THRESHOLD_MEDIUM = 0.40

# Minimum sessions before we trust the model's output
MIN_SESSIONS_FOR_CONFIDENCE = 3

_model = None
_scaler = None
_weights = None


def load_model():
    global _model, _scaler, _weights
    # Try loading joblib / sklearn model if installed
    if MODEL_PATH.exists() and SCALER_PATH.exists():
        try:
            import joblib
            _model  = joblib.load(MODEL_PATH)
            _scaler = joblib.load(SCALER_PATH)
            logger.info(f"No-show model loaded from {MODEL_PATH}")
            return
        except Exception as e:
            logger.warning(f"Could not load sklearn model: {e}")

    # Try loading trained JSON weights
    if WEIGHTS_PATH.exists():
        try:
            with open(WEIGHTS_PATH, "r", encoding="utf-8") as f:
                _weights = json.load(f)
            logger.info(f"No-show weights loaded from {WEIGHTS_PATH}")
            return
        except Exception as e:
            logger.warning(f"Could not load JSON weights: {e}")

    logger.info("No-show model will use standard behavioral risk heuristics.")


def _heuristic_predict(data: dict) -> float:
    """
    Behavioral prediction based on clinical practice factors:
      - Client's past no-show rate (heaviest weighting)
      - Lead time between booking and scheduled session
      - First-time appointment vs established client
      - Medium (video vs in-person)
    """
    base = 0.22
    past_rate = float(data.get("client_historical_no_show_rate", 0.0))
    base += past_rate * 0.48

    lead = float(data.get("booking_lead_days", 0.0))
    if lead > 14:
        base += 0.12
    elif lead > 7:
        base += 0.06

    total_sessions = int(data.get("client_total_sessions", 0))
    if total_sessions == 0:
        base += 0.08
    elif total_sessions > 10:
        base -= 0.05

    medium = data.get("medium", "video")
    if medium == "video":
        base -= 0.04

    return max(0.05, min(0.95, base))


def _predict_with_weights(data: dict, weights: dict) -> float:
    import math
    features = [
        float(data.get("day_of_week", 0)),
        float(data.get("hour_of_day", 12)),
        float(data.get("booking_lead_days", 3)),
        float(data.get("client_historical_no_show_rate", 0.0)),
        float(data.get("client_total_sessions", 0)),
        float(data.get("days_since_last_session") or -1.0),
        1.0 if data.get("medium", "video") == "video" else 0.0,
    ]
    w = weights.get("coefficients", [0.0] * len(features))
    b = weights.get("intercept", -1.5)
    mean = weights.get("mean", [0.0] * len(features))
    scale = weights.get("scale", [1.0] * len(features))

    # Standardize
    z = b
    for x, m, s, coef in zip(features, mean, scale, w):
        std_x = (x - m) / (s if s != 0 else 1.0)
        z += std_x * coef

    return 1.0 / (1.0 + math.exp(-max(-50, min(50, z))))


def _risk_level(probability: float) -> str:
    if probability >= THRESHOLD_HIGH:
        return "HIGH"
    if probability >= THRESHOLD_MEDIUM:
        return "MEDIUM"
    return "LOW"


def predict(data: dict) -> dict:
    """
    Returns no-show prediction for a single session.
    Always returns a result without crashing.
    """
    is_low_confidence = data.get("client_total_sessions", 0) < MIN_SESSIONS_FOR_CONFIDENCE

    if _model is not None and _scaler is not None:
        try:
            import numpy as np
            days_since = data.get("days_since_last_session")
            if days_since is None:
                days_since = -1.0
            is_video = 1.0 if data.get("medium", "video") == "video" else 0.0
            X = np.array([[
                data["day_of_week"],
                data["hour_of_day"],
                data["booking_lead_days"],
                data["client_historical_no_show_rate"],
                data["client_total_sessions"],
                days_since,
                is_video,
            ]], dtype=float)
            X_scaled = _scaler.transform(X)
            probability = float(_model.predict_proba(X_scaled)[0][1])
        except Exception:
            probability = _heuristic_predict(data)
    elif _weights is not None:
        try:
            probability = _predict_with_weights(data, _weights)
        except Exception:
            probability = _heuristic_predict(data)
    else:
        probability = _heuristic_predict(data)

    return {
        "probability": round(probability, 4),
        "risk_level": _risk_level(probability),
        "is_low_confidence": is_low_confidence,
        "model_version": MODEL_VERSION,
    }
