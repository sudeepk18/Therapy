"""
app/models/sentiment_model.py
Session-note sentiment analysis using VADER (Valence Aware Dictionary and sEntiment Reasoner).

VADER is well-suited for short-to-medium clinical text — it handles negation,
punctuation emphasis, and capitalization without requiring GPU compute.

IMPORTANT:
  - This analyzes linguistic sentiment indicators in therapist notes.
  - It is NOT a mental-health diagnosis.
  - It is NOT depression detection.
  - It is NOT a suicide risk predictor.
  - Output is a therapist-only engagement indicator.
"""

import logging
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

logger = logging.getLogger(__name__)

MODEL_VERSION = "1.0.0-vader"

_analyzer: SentimentIntensityAnalyzer | None = None


def load_model():
    global _analyzer
    _analyzer = SentimentIntensityAnalyzer()
    logger.info("VADER sentiment analyzer loaded.")


def _label(compound: float) -> str:
    """
    Map VADER compound score to a 3-class label.
    Standard VADER thresholds: >= 0.05 positive, <= -0.05 negative.
    """
    if compound >= 0.05:
        return "POSITIVE"
    if compound <= -0.05:
        return "NEGATIVE"
    return "NEUTRAL"


def analyze(text: str) -> dict:
    """
    Analyze sentiment of a given text string.
    Returns compound score (-1.0 to 1.0) and label.
    """
    if _analyzer is None:
        load_model()

    scores = _analyzer.polarity_scores(text)
    compound = scores["compound"]

    return {
        "score": round(compound, 4),
        "label": _label(compound),
        "positive": round(scores["pos"], 4),
        "negative": round(scores["neg"], 4),
        "neutral": round(scores["neu"], 4),
        "model_version": MODEL_VERSION,
    }
