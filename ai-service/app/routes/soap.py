"""
app/routes/soap.py
AI-assisted SOAP note draft generation endpoint.

The output is a DRAFT only. The therapist MUST:
  1. Review all generated content
  2. Edit as clinically appropriate
  3. Verify accuracy before saving
  4. Never treat generated text as a finalized clinical record

This endpoint NEVER auto-saves or overwrites existing notes.
"""

from fastapi import APIRouter
from app.schemas.soap_schema import SoapDraftRequest, SoapDraftResponse
from app.models.soap_generator import generate_soap_draft

router = APIRouter()


@router.post("/soap-draft", response_model=SoapDraftResponse)
async def generate_soap(payload: SoapDraftRequest):
    """
    Generate a structured SOAP note draft from a free-text session description.

    Returns S/O/A/P sections as a DRAFT labeled for therapist review.
    The therapist must edit, verify, and explicitly save the final version.
    This output is NOT a clinical record until signed by the therapist.
    """
    result = generate_soap_draft(payload.free_text)
    return SoapDraftResponse(
        subjective=result["subjective"],
        objective=result["objective"],
        assessment=result["assessment"],
        plan=result["plan"],
        model_version=result["model_version"],
    )
