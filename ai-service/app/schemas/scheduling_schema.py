"""
app/schemas/scheduling_schema.py
Pydantic models for the smart scheduling recommendation endpoint.
"""

from pydantic import BaseModel, Field
from typing import List, Optional


class SlotPattern(BaseModel):
    """Historical slot usage pattern provided by Node."""
    day_of_week: int = Field(..., ge=0, le=6)
    hour_of_day: int = Field(..., ge=0, le=23)
    booking_count: int = Field(default=0)
    no_show_count: int = Field(default=0)


class SchedulingRecommendRequest(BaseModel):
    """Historical booking patterns from the therapist's availability."""
    therapist_id: str
    slot_patterns: List[SlotPattern]
    num_recommendations: int = Field(default=3, ge=1, le=10)


class RecommendedSlot(BaseModel):
    day_of_week: int
    day_name: str
    hour_of_day: int
    time_label: str             # e.g. "6:00 PM"
    score: float                # 0-1, higher is better
    reason: str


class SchedulingRecommendResponse(BaseModel):
    therapist_id: str
    recommendations: List[RecommendedSlot]
    model_version: str
    disclaimer: str = "Recommendation — Based on historical booking patterns."
