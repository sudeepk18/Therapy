"""
app/schemas/forecast_schema.py
Pydantic models for the revenue forecasting endpoint.
"""

from pydantic import BaseModel, Field
from typing import List, Optional


class MonthlyRevenue(BaseModel):
    """Historical monthly revenue data point sent by Node."""
    year: int
    month: int      # 1-12
    revenue: float  # in smallest currency unit (paise)


class RevenueForecastRequest(BaseModel):
    """Historical revenue data for forecasting."""
    therapist_id: str
    history: List[MonthlyRevenue]
    forecast_months: int = Field(default=3, ge=1, le=12)


class ForecastedMonth(BaseModel):
    year: int
    month: int
    month_label: str        # e.g. "Sep 2026"
    forecast: float
    is_forecast: bool = True


class RevenueForecastResponse(BaseModel):
    therapist_id: str
    currency: str = "INR"
    history: List[MonthlyRevenue]
    forecast: List[ForecastedMonth]
    current_month_revenue: float
    next_month_forecast: float
    trend: str              # 'GROWING' | 'STABLE' | 'DECLINING'
    model_version: str
    disclaimer: str = (
        "Estimate — Revenue forecast based on historical trends. "
        "Actual results may vary."
    )
    mae: Optional[float] = None   # Mean Absolute Error from cross-validation
