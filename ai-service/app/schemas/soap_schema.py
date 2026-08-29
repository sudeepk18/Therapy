"""
app/schemas/soap_schema.py
Pydantic models for the SOAP note draft generation endpoint.
"""

from pydantic import BaseModel, Field


class SoapDraftRequest(BaseModel):
    """Free-text description entered by the therapist."""
    note_id: Optional[str] = None
    free_text: str = Field(..., min_length=10, max_length=5000,
                           description="Free-text session description from the therapist")


from typing import Optional


class SoapDraftResponse(BaseModel):
    """Structured SOAP draft — clearly labeled for therapist review."""
    subjective: str
    objective: str
    assessment: str
    plan: str
    disclaimer: str = (
        "AI Draft — Generated as a starting point only. "
        "Review, edit, and verify all content before saving. "
        "This is NOT a clinical diagnosis."
    )
    model_version: str
