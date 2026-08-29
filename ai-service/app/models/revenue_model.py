"""
app/models/revenue_model.py
Simple revenue forecasting using Linear Regression on monthly revenue history.

Approach:
  - Input: list of (year, month, revenue) data points from MongoDB Payment records
  - Feature: integer time index (monotonically increasing per month)
  - Target: revenue amount
  - Output: forecast for the next N months

When fewer than 3 months of data are available, falls back to a 3-month
rolling average to avoid overfitting a single data point.

This is a proof-of-concept model. Accuracy will improve significantly with
more historical data (6–12+ months recommended).
"""

import logging
import numpy as np
from typing import List, Dict
from datetime import date
import calendar

logger = logging.getLogger(__name__)

MODEL_VERSION = "1.0.0-linear-regression"

MIN_HISTORY_MONTHS = 3  # Minimum months needed before using regression


def _month_label(year: int, month: int) -> str:
    return f"{calendar.month_abbr[month]} {year}"


def _next_month(year: int, month: int) -> tuple:
    if month == 12:
        return year + 1, 1
    return year, month + 1


def forecast(history: List[Dict], forecast_months: int = 3) -> dict:
    """
    Forecast future monthly revenue.

    Args:
        history: list of {"year": int, "month": int, "revenue": float}
        forecast_months: how many months ahead to forecast

    Returns:
        dict with history, forecast list, trend, and summary values
    """
    # Sort history by (year, month)
    history_sorted = sorted(history, key=lambda x: (x["year"], x["month"]))
    n = len(history_sorted)

    if n == 0:
        return _empty_forecast(forecast_months)

    revenues = np.array([h["revenue"] for h in history_sorted], dtype=float)

    # ── Time indices ─────────────────────────────────────────────────────────
    X = np.arange(n, dtype=float).reshape(-1, 1)
    y = revenues

    # ── Model selection ───────────────────────────────────────────────────────
    if n >= MIN_HISTORY_MONTHS:
        # Linear regression via least-squares
        from numpy.linalg import lstsq
        X_aug = np.hstack([X, np.ones((n, 1))])   # [t, 1]
        coeffs, _, _, _ = lstsq(X_aug, y, rcond=None)
        slope, intercept = coeffs

        # Compute MAE via leave-one-out on last 20% of data
        split = max(1, int(n * 0.8))
        if split < n:
            X_train = X_aug[:split]
            y_train = y[:split]
            c, _, _, _ = lstsq(X_train, y_train, rcond=None)
            y_pred_val = X_aug[split:] @ c
            mae = float(np.mean(np.abs(y[split:] - y_pred_val)))
        else:
            mae = None

        def _predict(t_index):
            return max(0.0, slope * t_index + intercept)

    else:
        # Rolling average fallback
        avg = float(np.mean(revenues))
        slope = 0.0
        mae = None

        def _predict(t_index):
            return avg

    # ── Forecast future months ────────────────────────────────────────────────
    last = history_sorted[-1]
    last_year, last_month = last["year"], last["month"]

    forecast_list = []
    for i in range(1, forecast_months + 1):
        t = n - 1 + i
        yr, mo = _next_month(*_next_month(last_year, last_month)) if i > 1 else _next_month(last_year, last_month)
        # Recalculate correctly:
        yr2, mo2 = last_year, last_month
        for _ in range(i):
            yr2, mo2 = _next_month(yr2, mo2)
        forecast_list.append({
            "year": yr2,
            "month": mo2,
            "month_label": _month_label(yr2, mo2),
            "forecast": round(_predict(n - 1 + i), 2),
            "is_forecast": True,
        })

    # ── Trend label ───────────────────────────────────────────────────────────
    if n >= 2:
        recent_avg  = float(np.mean(revenues[-3:])) if n >= 3 else revenues[-1]
        earlier_avg = float(np.mean(revenues[:3]))  if n >= 3 else revenues[0]
        if recent_avg > earlier_avg * 1.05:
            trend = "GROWING"
        elif recent_avg < earlier_avg * 0.95:
            trend = "DECLINING"
        else:
            trend = "STABLE"
    else:
        trend = "STABLE"

    current_month_revenue = float(revenues[-1]) if n > 0 else 0.0
    next_month_forecast   = forecast_list[0]["forecast"] if forecast_list else 0.0

    return {
        "history": history_sorted,
        "forecast": forecast_list,
        "current_month_revenue": current_month_revenue,
        "next_month_forecast": next_month_forecast,
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
            "year": yr, "month": mo,
            "month_label": _month_label(yr, mo),
            "forecast": 0.0, "is_forecast": True,
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
