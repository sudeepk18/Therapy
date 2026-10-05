"""
app/models/trajectory_analyzer.py
Longitudinal Recovery Trajectory — Multi-session sentiment trend analysis.

Computes moving averages, hopefulness indices, and overall recovery direction
from a series of session-level sentiment scores over time.

IMPORTANT DISCLAIMER:
  Recovery trajectory indicators are statistical trend summaries only.
  They are NOT clinical outcome measures, treatment efficacy ratings,
  or diagnostic instruments. All outputs must be interpreted by a
  licensed mental health professional within clinical context.
"""

import logging

logger = logging.getLogger(__name__)

MODEL_VERSION = "1.0.0-trajectory"


def _moving_average(values: list, window: int = 3) -> list:
    """Compute a simple moving average with the given window size."""
    result = []
    for i in range(len(values)):
        start = max(0, i - window + 1)
        window_values = values[start:i + 1]
        result.append(round(sum(window_values) / len(window_values), 4))
    return result


def _hopefulness_index(score: float) -> float:
    """
    Convert VADER compound score (-1 to 1) to a 0-100 hopefulness index.
    This is a simple linear rescaling for visualization purposes.
    """
    return round((score + 1) / 2 * 100, 1)


def analyze(client_id: str, sentiment_data: list) -> dict:
    """
    Analyze longitudinal sentiment trend across multiple sessions.
    
    Parameters:
        client_id: The client's identifier
        sentiment_data: List of dicts with session_id, session_date, score, label, positive, negative, neutral
    
    Returns:
        Trend points with moving averages, overall direction, and improvement metrics.
    """
    if not sentiment_data:
        return {
            "client_id": client_id,
            "trend_points": [],
            "overall_direction": "insufficient_data",
            "improvement_pct": 0.0,
            "avg_valence": 0.0,
            "sessions_analyzed": 0,
            "model_version": MODEL_VERSION,
        }

    # Sort by session date
    sorted_data = sorted(sentiment_data, key=lambda d: d.get("session_date", ""))

    # Extract valence scores
    scores = [entry["score"] for entry in sorted_data]

    # Compute moving averages
    moving_avgs = _moving_average(scores, window=3)

    # Build trend points
    trend_points = []
    for i, entry in enumerate(sorted_data):
        trend_points.append({
            "session_id": entry["session_id"],
            "session_date": entry["session_date"],
            "valence_score": round(entry["score"], 4),
            "moving_average": moving_avgs[i],
            "hopefulness_index": _hopefulness_index(moving_avgs[i]),
        })

    # Determine overall direction
    if len(scores) >= 2:
        first_half = scores[:len(scores) // 2]
        second_half = scores[len(scores) // 2:]
        first_avg = sum(first_half) / len(first_half)
        second_avg = sum(second_half) / len(second_half)
        diff = second_avg - first_avg

        if diff > 0.05:
            direction = "improving"
        elif diff < -0.05:
            direction = "declining"
        else:
            direction = "stable"

        # Improvement percentage
        if first_avg != 0:
            improvement_pct = round(((second_avg - first_avg) / abs(first_avg)) * 100, 1)
        else:
            improvement_pct = round(diff * 100, 1)
    else:
        direction = "insufficient_data"
        improvement_pct = 0.0

    avg_valence = round(sum(scores) / len(scores), 4) if scores else 0.0

    return {
        "client_id": client_id,
        "trend_points": trend_points,
        "overall_direction": direction,
        "improvement_pct": improvement_pct,
        "avg_valence": avg_valence,
        "sessions_analyzed": len(scores),
        "model_version": MODEL_VERSION,
    }
