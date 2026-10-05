"""
app/schemas/crisis_schema.py
Pydantic models for the Crisis Detection / Safety Triaging endpoint.
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Literal


class CrisisScanRequest(BaseModel):
    """Client text to scan for crisis signals."""
    client_id: str
    text: str = Field(..., min_length=1, max_length=10000)
    source: str = Field(default="journal", description="Source of text: journal, checkin, mood_log")


class RiskFlag(BaseModel):
    """A risk indicator detected in the text."""
    severity: Literal["critical", "high", "moderate"]
    count: int
    keywords: List[str]


class EmergencyResource(BaseModel):
    """An emergency helpline / crisis resource."""
    name: str
    number: str
    description: str


class CrisisScanResponse(BaseModel):
    """Response from the crisis safety scan."""
    risk_level: Literal["critical", "high", "moderate", "low"]
    risk_score: float = Field(..., ge=0.0, le=1.0)
    flags: List[RiskFlag]
    alert_therapist: bool
    show_crisis_ui: bool
    resources: List[EmergencyResource]
    model_version: str
