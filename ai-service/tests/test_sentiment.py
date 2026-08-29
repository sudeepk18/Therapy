"""
tests/test_sentiment.py
Tests for sentiment analysis endpoint.
"""
import os
os.environ["AI_SERVICE_API_KEY"] = "test-key-123"

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)
HEADERS = {"X-AI-Service-Key": "test-key-123"}


def test_positive_sentiment():
    res = client.post("/predict/sentiment", json={
        "note_id": "note_001",
        "text": "Client reported feeling much better this week. Expressed optimism about their progress and showed great engagement during CBT exercises."
    }, headers=HEADERS)
    assert res.status_code == 200
    data = res.json()
    assert data["label"] == "POSITIVE"
    assert data["score"] > 0.05


def test_negative_sentiment():
    res = client.post("/predict/sentiment", json={
        "note_id": "note_002",
        "text": "Client reported feeling hopeless, struggling with severe anxiety, difficulty sleeping, and persistent low mood throughout the week."
    }, headers=HEADERS)
    assert res.status_code == 200
    data = res.json()
    assert data["label"] == "NEGATIVE"
    assert data["score"] < -0.05


def test_neutral_sentiment():
    res = client.post("/predict/sentiment", json={
        "note_id": "note_003",
        "text": "Client attended session as scheduled. Discussed current treatment goals and reviewed homework from last week."
    }, headers=HEADERS)
    assert res.status_code == 200
    data = res.json()
    assert data["label"] in ["NEUTRAL", "POSITIVE"]  # Brief neutral text may score slightly positive
    assert -1.0 <= data["score"] <= 1.0


def test_sentiment_score_range():
    """Score must always be in [-1, 1]."""
    res = client.post("/predict/sentiment", json={
        "note_id": "note_004",
        "text": "Regular session conducted."
    }, headers=HEADERS)
    assert res.status_code == 200
    d = res.json()
    assert -1.0 <= d["score"] <= 1.0
    assert d["positive"] + d["negative"] + d["neutral"] <= 1.01  # Allow floating point rounding


def test_sentiment_no_auth():
    res = client.post("/predict/sentiment", json={"note_id": "x", "text": "test"})
    assert res.status_code == 403
