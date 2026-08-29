"""
app/routes/forecasting.py
Revenue forecasting endpoint.

Uses historical payment data (aggregated by Node.js from MongoDB) to
forecast future monthly revenue using linear regression.

Output is an ESTIMATE — clearly labeled as such. Not a financial guarantee.
"""

from fastapi import APIRouter
from app.schemas.forecast_schema import RevenueForecastRequest, RevenueForecastResponse, MonthlyRevenue, ForecastedMonth
from app.models import revenue_model

router = APIRouter()


@router.post("/revenue", response_model=RevenueForecastResponse)
async def forecast_revenue(payload: RevenueForecastRequest):
    """
    Forecast future monthly revenue based on historical payment data.
    
    Returns historical trend, next-month forecast, and multi-month projection.
    Output is an ESTIMATE based on historical patterns — not a guarantee.
    """
    history_dicts = [h.model_dump() for h in payload.history]
    result = revenue_model.forecast(history_dicts, payload.forecast_months)
    
    return RevenueForecastResponse(
        therapist_id=payload.therapist_id,
        history=payload.history,
        forecast=[ForecastedMonth(**f) for f in result["forecast"]],
        current_month_revenue=result["current_month_revenue"],
        next_month_forecast=result["next_month_forecast"],
        trend=result["trend"],
        model_version=result["model_version"],
        mae=result.get("mae"),
    )
