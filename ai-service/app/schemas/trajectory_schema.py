"""
app/schemas/trajectory_schema.py
Pydantic models for the Longitudinal Recovery Trajectory endpoint.
"""

from pydantic import BaseModel, Field
from typing import List, Optional


class SessionSentimentEntry(BaseModel):
    """Sentiment data from a single session note."""
    session_id: str
    session_date: str
    score: float = Field(..., ge=-1.0, le=1.0)
    label: str
    positive: float
    negative: float
    neutral: float


class TrajectoryRequest(BaseModel):
    """Request to compute a client's recovery trajectory."""
    client_id: str
    sentiment_data: List[SessionSentimentEntry]


class TrendPoint(BaseModel):
    """A single point on the recovery trajectory."""
    session_id: str
    session_date: str
    valence_score: float
    moving_average: float
    hopefulness_index: float


class TrajectoryResponse(BaseModel):
    """Recovery trajectory analysis result."""
    client_id: str
    trend_points: List[TrendPoint]
    overall_direction: str  # "improving", "stable", "declining"
    improvement_pct: float
    avg_valence: float
    sessions_analyzed: int
    model_version: str
