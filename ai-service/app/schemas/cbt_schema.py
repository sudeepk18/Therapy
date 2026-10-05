"""
app/schemas/cbt_schema.py
Pydantic models for the CBT Cognitive Distortion Analysis endpoint.
"""

from pydantic import BaseModel, Field
from typing import List, Optional


class CBTAnalyzeRequest(BaseModel):
    """Client's automatic negative thought to analyze."""
    client_id: str
    thought_text: str = Field(..., min_length=1, max_length=5000)


class ReframePrompt(BaseModel):
    """A single Socratic reframing question."""
    prompt: str


class DetectedDistortion(BaseModel):
    """A single detected cognitive distortion."""
    type: str
    label: str
    description: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    reframe_prompts: List[str]


class CBTAnalyzeResponse(BaseModel):
    """Response from the CBT thought analysis."""
    distortions: List[DetectedDistortion]
    primary_distortion: str
    distortion_count: int
    model_version: str
