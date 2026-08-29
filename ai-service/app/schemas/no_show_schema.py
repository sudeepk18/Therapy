"""
app/schemas/no_show_schema.py
Pydantic request/response models for the no-show prediction endpoint.
"""

from pydantic import BaseModel, Field
from typing import Literal, Optional


class NoShowPredictRequest(BaseModel):
    """Features sent by Node.js for a single appointment."""
    session_id: str = Field(..., description="MongoDB ObjectId of the session")
    day_of_week: int = Field(..., ge=0, le=6, description="0=Monday, 6=Sunday")
    hour_of_day: int = Field(..., ge=0, le=23, description="Hour of scheduled time (24h)")
    booking_lead_days: float = Field(..., ge=0, description="Days between booking and appointment")
    client_historical_no_show_rate: float = Field(..., ge=0.0, le=1.0, description="Client's past no-show rate")
    client_total_sessions: int = Field(..., ge=0, description="Total prior sessions for this client")
    days_since_last_session: Optional[float] = Field(None, ge=0, description="Days since client's last session (None if first)")
    session_type: str = Field(default="individual")
    medium: str = Field(default="video")


class NoShowPredictResponse(BaseModel):
    """Prediction result returned to Node.js."""
    session_id: str
    probability: float = Field(..., ge=0.0, le=1.0)
    risk_level: Literal["LOW", "MEDIUM", "HIGH"]
    is_low_confidence: bool = Field(False, description="True when client has fewer than 3 prior sessions")
    model_version: str
