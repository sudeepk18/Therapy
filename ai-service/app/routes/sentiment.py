"""
app/routes/sentiment.py
Session-note sentiment analysis endpoint.

IMPORTANT DISCLAIMER:
  Sentiment analysis outputs are linguistic pattern indicators only.
  They are NOT psychiatric diagnoses, mood disorder assessments,
  or clinical mental-health determinations of any kind.
  Outputs are for therapist-only internal use.
"""

from fastapi import APIRouter
from app.schemas.sentiment_schema import SentimentAnalyzeRequest, SentimentAnalyzeResponse
from app.models import sentiment_model

router = APIRouter()


@router.post("/sentiment", response_model=SentimentAnalyzeResponse)
async def analyze_sentiment(payload: SentimentAnalyzeRequest):
    """
    Analyze the linguistic sentiment of a session note's text content.

    Returns a compound score (-1.0 to 1.0) and a POSITIVE/NEUTRAL/NEGATIVE label.
    This is a session engagement indicator — NOT a clinical diagnosis.
    Results must NEVER be shown to clients.
    """
    result = sentiment_model.analyze(payload.text)
    return SentimentAnalyzeResponse(
        note_id=payload.note_id,
        score=result["score"],
        label=result["label"],
        positive=result["positive"],
        negative=result["negative"],
        neutral=result["neutral"],
        model_version=result["model_version"],
    )
