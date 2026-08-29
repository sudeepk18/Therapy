"""
tests/test_forecast.py
Tests for revenue forecasting endpoint.
"""
import os
os.environ["AI_SERVICE_API_KEY"] = "test-key-123"

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)
HEADERS = {"X-AI-Service-Key": "test-key-123"}

SAMPLE_HISTORY = [
    {"year": 2026, "month": 1, "revenue": 4500000},
    {"year": 2026, "month": 2, "revenue": 4800000},
    {"year": 2026, "month": 3, "revenue": 5200000},
    {"year": 2026, "month": 4, "revenue": 5500000},
    {"year": 2026, "month": 5, "revenue": 5100000},
    {"year": 2026, "month": 6, "revenue": 5700000},
]


def test_forecast_basic():
    res = client.post("/forecast/revenue", json={
        "therapist_id": "t001",
        "history": SAMPLE_HISTORY,
        "forecast_months": 3,
    }, headers=HEADERS)
    assert res.status_code == 200
    d = res.json()
    assert "forecast" in d
    assert len(d["forecast"]) == 3
    assert d["trend"] in ["GROWING", "STABLE", "DECLINING"]
    assert d["next_month_forecast"] >= 0
    assert "disclaimer" in d


def test_forecast_empty_history():
    """Empty history should return zero-forecast gracefully."""
    res = client.post("/forecast/revenue", json={
        "therapist_id": "t002",
        "history": [],
        "forecast_months": 2,
    }, headers=HEADERS)
    assert res.status_code == 200
    d = res.json()
    assert len(d["forecast"]) == 2
    assert d["next_month_forecast"] == 0.0


def test_forecast_growing_trend():
    """Steadily increasing revenue should predict GROWING trend."""
    history = [
        {"year": 2026, "month": m, "revenue": 1000000 * m}
        for m in range(1, 7)
    ]
    res = client.post("/forecast/revenue", json={
        "therapist_id": "t003",
        "history": history,
        "forecast_months": 1,
    }, headers=HEADERS)
    d = res.json()
    assert d["trend"] == "GROWING"


def test_forecast_no_auth():
    res = client.post("/forecast/revenue", json={"therapist_id": "x", "history": [], "forecast_months": 1})
    assert res.status_code == 403
