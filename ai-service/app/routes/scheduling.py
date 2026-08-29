"""
app/routes/scheduling.py
Smart scheduling recommendation endpoint.

Analyzes historical booking patterns to recommend optimal time slots.
Output is a RECOMMENDATION ONLY — it does not create or modify any appointment.
"""

import logging
from fastapi import APIRouter
from app.schemas.scheduling_schema import (
    SchedulingRecommendRequest,
    SchedulingRecommendResponse,
    RecommendedSlot,
)

router = APIRouter()
logger = logging.getLogger(__name__)

MODEL_VERSION = "1.0.0-pattern-analysis"

DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


def _time_label(hour: int) -> str:
    """Convert 24h hour to 12h label."""
    if hour == 0:
        return "12:00 AM"
    if hour < 12:
        return f"{hour}:00 AM"
    if hour == 12:
        return "12:00 PM"
    return f"{hour - 12}:00 PM"


def _score_slot(pattern) -> float:
    """
    Score a slot based on booking frequency and no-show rate.
    Higher score = more recommended.
    """
    total = pattern.booking_count
    if total == 0:
        return 0.1  # Slight preference to fill empty slots
    
    no_show_rate = pattern.no_show_count / total
    
    # Reward high-booking low-no-show slots
    score = (total / max(total, 10)) * (1 - no_show_rate)
    return round(score, 4)


def _reason(pattern, score: float) -> str:
    """Generate a human-readable reason for the recommendation."""
    total = pattern.booking_count
    if total == 0:
        return "Available slot — no prior booking data."
    
    no_show_pct = round((pattern.no_show_count / total) * 100)
    if no_show_pct < 10:
        return f"High attendance rate ({total} sessions, {100 - no_show_pct}% attendance)"
    if no_show_pct < 25:
        return f"Good booking history ({total} sessions)"
    return f"Available slot ({total} sessions, {100 - no_show_pct}% attendance)"


@router.post("/scheduling", response_model=SchedulingRecommendResponse)
async def recommend_slots(payload: SchedulingRecommendRequest):
    """
    Recommend optimal scheduling slots based on historical booking patterns.
    
    Returns ranked slot recommendations with scores and reasons.
    This is a RECOMMENDATION ONLY — not a confirmed appointment.
    """
    patterns = payload.slot_patterns
    
    if not patterns:
        return SchedulingRecommendResponse(
            therapist_id=payload.therapist_id,
            recommendations=[],
            model_version=MODEL_VERSION,
        )
    
    # Score and rank all slots
    scored = []
    for p in patterns:
        score = _score_slot(p)
        scored.append((p, score))
    
    # Sort by score descending
    scored.sort(key=lambda x: x[1], reverse=True)
    
    # Take top N unique (day, hour) combinations
    seen = set()
    recommendations = []
    for p, score in scored:
        key = (p.day_of_week, p.hour_of_day)
        if key in seen:
            continue
        seen.add(key)
        recommendations.append(RecommendedSlot(
            day_of_week=p.day_of_week,
            day_name=DAY_NAMES[p.day_of_week],
            hour_of_day=p.hour_of_day,
            time_label=_time_label(p.hour_of_day),
            score=score,
            reason=_reason(p, score),
        ))
        if len(recommendations) >= payload.num_recommendations:
            break
    
    return SchedulingRecommendResponse(
        therapist_id=payload.therapist_id,
        recommendations=recommendations,
        model_version=MODEL_VERSION,
    )
