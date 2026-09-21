"""
app/models/revenue_model.py
Revenue forecasting using Linear Regression with standard library float math fallback.
"""

import logging
from typing import List, Dict
from datetime import date
import calendar

logger = logging.getLogger(__name__)

MODEL_VERSION = "1.0.0-linear-regression"
MIN_HISTORY_MONTHS = 3


def _month_label(year: int, month: int) -> str:
    return f"{calendar.month_abbr[month]} {year}"


def _next_month(year: int, month: int) -> tuple:
    if month == 12:
        return year + 1, 1
    return year, month + 1


def _fit_linear_regression(x_vals: List[float], y_vals: List[float]):
    """Fit a simple 1D linear regression line y = slope * x + intercept."""
    n = len(x_vals)
    mean_x = sum(x_vals) / n
    mean_y = sum(y_vals) / n
    var_x = sum((x - mean_x) ** 2 for x in x_vals)
    if var_x == 0:
        return 0.0, mean_y
    cov_xy = sum((x - mean_x) * (y - mean_y) for x, y in zip(x_vals, y_vals))
    slope = cov_xy / var_x
    intercept = mean_y - slope * mean_x
    return slope, intercept


def forecast(history: List[Dict], forecast_months: int = 3) -> dict:
    """
    Forecast future monthly revenue from historical data points.
    """
    history_sorted = sorted(history, key=lambda x: (x["year"], x["month"]))
    n = len(history_sorted)

    if n == 0:
        return _empty_forecast(forecast_months)

    revenues = [float(h["revenue"]) for h in history_sorted]
    x_indices = [float(i) for i in range(n)]

    if n >= MIN_HISTORY_MONTHS:
        slope, intercept = _fit_linear_regression(x_indices, revenues)
        def _predict(t):
            return max(0.0, slope * t + intercept)

        # Compute MAE on training residuals
        residuals = [abs(y - _predict(x)) for x, y in zip(x_indices, revenues)]
        mae = sum(residuals) / len(residuals) if residuals else None
    else:
        avg = sum(revenues) / n
        def _predict(t):
            return avg
        mae = None

    last = history_sorted[-1]
    last_year, last_month = last["year"], last["month"]

    forecast_list = []
    yr, mo = last_year, last_month
    for i in range(1, forecast_months + 1):
        yr, mo = _next_month(yr, mo)
        forecast_list.append({
            "year": yr,
            "month": mo,
            "month_label": _month_label(yr, mo),
            "forecast": round(_predict(n - 1 + i), 2),
            "is_forecast": True,
        })

    # Trend calculation
    if n >= 2:
        recent_avg = sum(revenues[-3:]) / len(revenues[-3:]) if n >= 3 else revenues[-1]
        earlier_avg = sum(revenues[:3]) / len(revenues[:3]) if n >= 3 else revenues[0]
        if recent_avg > earlier_avg * 1.05:
            trend = "GROWING"
        elif recent_avg < earlier_avg * 0.95:
            trend = "DECLINING"
        else:
            trend = "STABLE"
    else:
        trend = "STABLE"

    return {
        "history": history_sorted,
        "forecast": forecast_list,
        "current_month_revenue": revenues[-1] if n > 0 else 0.0,
        "next_month_forecast": forecast_list[0]["forecast"] if forecast_list else 0.0,
        "trend": trend,
        "mae": round(mae, 2) if mae is not None else None,
        "model_version": MODEL_VERSION,
    }


def _empty_forecast(forecast_months: int) -> dict:
    today = date.today()
    forecast_list = []
    yr, mo = today.year, today.month
    for i in range(forecast_months):
        yr, mo = _next_month(yr, mo)
        forecast_list.append({
            "year": yr,
            "month": mo,
            "month_label": _month_label(yr, mo),
            "forecast": 0.0,
            "is_forecast": True,
        })
    return {
        "history": [],
        "forecast": forecast_list,
        "current_month_revenue": 0.0,
        "next_month_forecast": 0.0,
        "trend": "STABLE",
        "mae": None,
        "model_version": MODEL_VERSION,
    }
