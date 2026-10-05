"""
app/routes/crisis.py
Crisis Detection & Safety Triaging endpoint.

Passively scans client text for acute distress signals and provides
risk assessments with emergency resource recommendations.

IMPORTANT DISCLAIMER:
  This is a SUPPLEMENTARY safety-net tool. It is NOT a substitute for
  professional clinical assessment. False negatives ARE possible.
  Therapists MUST exercise independent clinical judgment at all times.
"""

from fastapi import APIRouter
from app.schemas.crisis_schema import CrisisScanRequest, CrisisScanResponse
from app.models import crisis_detector

router = APIRouter()


@router.post("/scan", response_model=CrisisScanResponse)
async def scan_for_crisis(payload: CrisisScanRequest):
    """
    Scan client text for acute distress and crisis signals.

    Returns a risk assessment (critical/high/moderate/low) with:
    - Matched risk flags and keywords
    - Whether to alert the therapist
    - Whether to show crisis UI to the client
    - Emergency helpline resources if risk is elevated

    This is a passive safety net — NOT a clinical risk assessment tool.
    """
    result = crisis_detector.scan(payload.text)
    return CrisisScanResponse(
        risk_level=result["risk_level"],
        risk_score=result["risk_score"],
        flags=result["flags"],
        alert_therapist=result["alert_therapist"],
        show_crisis_ui=result["show_crisis_ui"],
        resources=result["resources"],
        model_version=result["model_version"],
    )
