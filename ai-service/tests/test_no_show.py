"""
tests/test_no_show.py
Tests for no-show prediction endpoint and model.
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch
import os

os.environ["AI_SERVICE_API_KEY"] = "test-key-123"

from app.main import app

client = TestClient(app)
HEADERS = {"X-AI-Service-Key": "test-key-123"}


def test_health_check_no_auth():
    """Health check should not require auth."""
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


def test_no_show_missing_key():
    """Request without API key should be rejected."""
    res = client.post("/predict/no-show", json={
        "session_id": "abc123",
        "day_of_week": 1,
        "hour_of_day": 18,
        "booking_lead_days": 3.0,
        "client_historical_no_show_rate": 0.2,
        "client_total_sessions": 5,
    })
    assert res.status_code == 403


def test_no_show_experienced_client():
    """Experienced client with good history should get LOW risk."""
    res = client.post("/predict/no-show", json={
        "session_id": "session_001",
        "day_of_week": 2,            # Wednesday
        "hour_of_day": 18,            # 6 PM
        "booking_lead_days": 2.0,
        "client_historical_no_show_rate": 0.0,
        "client_total_sessions": 20,
        "days_since_last_session": 7.0,
        "medium": "video",
    }, headers=HEADERS)
    assert res.status_code == 200
    data = res.json()
    assert "probability" in data
    assert "risk_level" in data
    assert data["risk_level"] in ["LOW", "MEDIUM", "HIGH"]
    assert 0.0 <= data["probability"] <= 1.0
    assert data["is_low_confidence"] is False


def test_no_show_new_client():
    """New client with no history should return is_low_confidence=True."""
    res = client.post("/predict/no-show", json={
        "session_id": "session_002",
        "day_of_week": 0,
        "hour_of_day": 10,
        "booking_lead_days": 14.0,
        "client_historical_no_show_rate": 0.0,
        "client_total_sessions": 0,
        "days_since_last_session": None,
    }, headers=HEADERS)
    assert res.status_code == 200
    data = res.json()
    assert data["is_low_confidence"] is True


def test_no_show_high_risk_client():
    """Client with poor history should not return LOW risk."""
    res = client.post("/predict/no-show", json={
        "session_id": "session_003",
        "day_of_week": 4,            # Friday
        "hour_of_day": 9,
        "booking_lead_days": 21.0,
        "client_historical_no_show_rate": 0.80,
        "client_total_sessions": 10,
        "days_since_last_session": 45.0,
    }, headers=HEADERS)
    assert res.status_code == 200
    data = res.json()
    # High no-show history should not predict LOW
    assert data["risk_level"] in ["MEDIUM", "HIGH"]


def test_no_show_model_version_present():
    """Response must always include model_version."""
    res = client.post("/predict/no-show", json={
        "session_id": "session_004",
        "day_of_week": 3,
        "hour_of_day": 14,
        "booking_lead_days": 1.0,
        "client_historical_no_show_rate": 0.1,
        "client_total_sessions": 8,
    }, headers=HEADERS)
    assert res.status_code == 200
    assert "model_version" in res.json()
