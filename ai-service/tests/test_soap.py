"""
tests/test_soap.py
Tests for SOAP draft generation endpoint.
"""
import os
os.environ["AI_SERVICE_API_KEY"] = "test-key-123"

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)
HEADERS = {"X-AI-Service-Key": "test-key-123"}

SAMPLE_TEXT = (
    "Client reported difficulty sleeping and increased stress due to upcoming exams. "
    "Client appeared anxious but engaged throughout the session. "
    "Discussed cognitive reframing techniques and the relationship between academic pressure and sleep disruption. "
    "Plan to continue relaxation exercises and maintain a regular sleep schedule. Follow-up in one week."
)


def test_soap_draft_returns_all_sections():
    res = client.post("/generate/soap-draft", json={"free_text": SAMPLE_TEXT}, headers=HEADERS)
    assert res.status_code == 200
    d = res.json()
    assert "subjective" in d
    assert "objective" in d
    assert "assessment" in d
    assert "plan" in d
    assert "disclaimer" in d
    assert "model_version" in d


def test_soap_draft_disclaimer_present():
    """Disclaimer must always be in the response."""
    res = client.post("/generate/soap-draft", json={"free_text": SAMPLE_TEXT}, headers=HEADERS)
    d = res.json()
    assert "AI Draft" in d["disclaimer"] or "draft" in d["disclaimer"].lower()


def test_soap_sections_non_empty():
    res = client.post("/generate/soap-draft", json={"free_text": SAMPLE_TEXT}, headers=HEADERS)
    d = res.json()
    for section in ["subjective", "objective", "assessment", "plan"]:
        assert len(d[section].strip()) > 0


def test_soap_too_short_text():
    res = client.post("/generate/soap-draft", json={"free_text": "short"}, headers=HEADERS)
    # min_length=10, so 5 chars should fail validation
    assert res.status_code == 422


def test_soap_no_auth():
    res = client.post("/generate/soap-draft", json={"free_text": SAMPLE_TEXT})
    assert res.status_code == 403
