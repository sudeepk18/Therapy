"""
app/routes/cbt.py
CBT Cognitive Distortion Analysis endpoint.

Analyzes automatic negative thoughts and identifies cognitive distortions,
providing guided Socratic reframing questions for between-session CBT homework.

IMPORTANT DISCLAIMER:
  CBT distortion analysis outputs are educational decision-support tools.
  They are NOT clinical assessments or therapeutic interventions.
  A licensed therapist must review all outputs.
"""

from fastapi import APIRouter
from app.schemas.cbt_schema import CBTAnalyzeRequest, CBTAnalyzeResponse
from app.models import cbt_analyzer

router = APIRouter()


@router.post("/distortions", response_model=CBTAnalyzeResponse)
async def analyze_thought(payload: CBTAnalyzeRequest):
    """
    Analyze a client's automatic negative thought for cognitive distortions.

    Identifies distortion types (Catastrophizing, All-or-Nothing, Mind Reading, etc.)
    and returns guided Socratic reframing questions for each detected distortion.
    
    This output is a decision-support indicator — NOT a clinical diagnosis.
    """
    result = cbt_analyzer.analyze(payload.thought_text)
    return CBTAnalyzeResponse(
        distortions=result["distortions"],
        primary_distortion=result["primary_distortion"],
        distortion_count=result["distortion_count"],
        model_version=result["model_version"],
    )
