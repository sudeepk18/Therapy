"""
app/routes/trajectory.py
Longitudinal Recovery Trajectory endpoint.

Computes a multi-session sentiment trend analysis showing the client's
therapeutic progress over time.

IMPORTANT DISCLAIMER:
  Recovery trajectory indicators are statistical trend summaries only.
  They are NOT clinical outcome measures or treatment efficacy ratings.
  All outputs must be interpreted by a licensed mental health professional.
"""

from fastapi import APIRouter
from app.schemas.trajectory_schema import TrajectoryRequest, TrajectoryResponse
from app.models import trajectory_analyzer

router = APIRouter()


@router.post("/trajectory", response_model=TrajectoryResponse)
async def compute_trajectory(payload: TrajectoryRequest):
    """
    Compute the longitudinal recovery trajectory for a client.

    Accepts a list of session-level sentiment scores and returns:
    - Trend points with moving averages and hopefulness indices
    - Overall direction (improving, stable, declining)
    - Improvement percentage across therapy sessions
    
    This is a statistical trend summary — NOT a clinical outcome measure.
    """
    # Convert Pydantic models to dicts for the analyzer
    sentiment_data = [entry.model_dump() for entry in payload.sentiment_data]
    
    result = trajectory_analyzer.analyze(payload.client_id, sentiment_data)
    return TrajectoryResponse(
        client_id=result["client_id"],
        trend_points=result["trend_points"],
        overall_direction=result["overall_direction"],
        improvement_pct=result["improvement_pct"],
        avg_valence=result["avg_valence"],
        sessions_analyzed=result["sessions_analyzed"],
        model_version=result["model_version"],
    )
