"""
app/routes/no_show.py
No-show risk prediction endpoint.
Called by Node.js backend only — never exposed publicly.
"""

from fastapi import APIRouter
from app.schemas.no_show_schema import NoShowPredictRequest, NoShowPredictResponse
from app.models import no_show_model

router = APIRouter()


@router.post("/no-show", response_model=NoShowPredictResponse)
async def predict_no_show(payload: NoShowPredictRequest):
    """
    Predict the probability that a client will not show up for a scheduled session.

    Output is a DECISION-SUPPORT INDICATOR ONLY.
    It is NOT a clinical judgment and must NEVER be shown to clients.
    """
    result = no_show_model.predict(payload.model_dump())
    return NoShowPredictResponse(
        session_id=payload.session_id,
        probability=result["probability"],
        risk_level=result["risk_level"],
        is_low_confidence=result["is_low_confidence"],
        model_version=result["model_version"],
    )
