"""
app/schemas/sentiment_schema.py
Pydantic models for the session-note sentiment analysis endpoint.
"""

from pydantic import BaseModel, Field
from typing import Literal, List, Optional


class SentimentAnalyzeRequest(BaseModel):
    """Text content to analyze (therapist note content only)."""
    note_id: str
    text: str = Field(..., min_length=1, max_length=20000)


class SentimentAnalyzeResponse(BaseModel):
    note_id: str
    score: float = Field(..., ge=-1.0, le=1.0, description="VADER compound score")
    label: Literal["POSITIVE", "NEUTRAL", "NEGATIVE"]
    positive: float
    negative: float
    neutral: float
    model_version: str
