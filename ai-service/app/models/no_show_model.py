"""
app/models/no_show_model.py
No-show risk prediction using Logistic Regression.

The model is trained on historical session data (synthetic during development).
Features used:
  - day_of_week          (0=Mon, 6=Sun)
  - hour_of_day          (24h)
  - booking_lead_days    (booking-to-appointment lag)
  - no_show_rate         (client's historical no-show rate)
  - total_sessions       (client's total prior sessions)
  - days_since_last      (gap since last session; -1 if first)
  - is_video             (binary: 1 if medium=video)

Output: { probability: float, risk_level: 'LOW'|'MEDIUM'|'HIGH' }
"""

import os
import logging
import numpy as np
import joblib
from pathlib import Path

logger = logging.getLogger(__name__)

MODEL_PATH = Path(__file__).parent.parent.parent / "saved_models" / "no_show_model.pkl"
SCALER_PATH = Path(__file__).parent.parent.parent / "saved_models" / "no_show_scaler.pkl"

MODEL_VERSION = "1.0.0-logistic"

# Risk thresholds
THRESHOLD_HIGH   = 0.65
THRESHOLD_MEDIUM = 0.40

# Minimum sessions before we trust the model's output
MIN_SESSIONS_FOR_CONFIDENCE = 3

_model = None
_scaler = None


def load_model():
    global _model, _scaler
    if MODEL_PATH.exists() and SCALER_PATH.exists():
        _model  = joblib.load(MODEL_PATH)
        _scaler = joblib.load(SCALER_PATH)
        logger.info(f"No-show model loaded from {MODEL_PATH}")
    else:
        logger.warning(
            "No-show model not found at %s. "
            "Run training/train_no_show.py first. "
            "Using fallback heuristic predictions.",
            MODEL_PATH,
        )


def _build_feature_vector(data: dict) -> np.ndarray:
    """Convert request dict to feature array expected by the model."""
    days_since_last = data.get("days_since_last_session")
    if days_since_last is None:
        days_since_last = -1  # Sentinel for first-time clients

    is_video = 1 if data.get("medium", "video") == "video" else 0

    return np.array([[
        data["day_of_week"],
        data["hour_of_day"],
        data["booking_lead_days"],
        data["client_historical_no_show_rate"],
        data["client_total_sessions"],
        days_since_last,
        is_video,
    ]], dtype=float)


def _heuristic_predict(data: dict) -> float:
    """
    Simple heuristic fallback when trained model is not available.
    Based on known risk factors:
      - High no-show history → higher risk
      - Very long lead time → slightly higher risk
      - First-time clients → moderate uncertainty
    """
    base = 0.25
    base += data["client_historical_no_show_rate"] * 0.45
    lead = data["booking_lead_days"]
    if lead > 14:
        base += 0.10
    elif lead > 7:
        base += 0.05
    if data["client_total_sessions"] == 0:
        base += 0.05
    return min(base, 0.95)


def _risk_level(probability: float) -> str:
    if probability >= THRESHOLD_HIGH:
        return "HIGH"
    if probability >= THRESHOLD_MEDIUM:
        return "MEDIUM"
    return "LOW"


def predict(data: dict) -> dict:
    """
    Returns no-show prediction for a single session.
    Always returns a result — never raises an exception.
    """
    is_low_confidence = data.get("client_total_sessions", 0) < MIN_SESSIONS_FOR_CONFIDENCE

    if _model is not None and _scaler is not None:
        try:
            X = _build_feature_vector(data)
            X_scaled = _scaler.transform(X)
            probability = float(_model.predict_proba(X_scaled)[0][1])
        except Exception as exc:
            logger.warning("Model prediction failed, using heuristic: %s", exc)
            probability = _heuristic_predict(data)
    else:
        probability = _heuristic_predict(data)

    return {
        "probability": round(probability, 4),
        "risk_level": _risk_level(probability),
        "is_low_confidence": is_low_confidence,
        "model_version": MODEL_VERSION,
    }
