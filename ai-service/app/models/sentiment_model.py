"""
app/models/sentiment_model.py
Session-note sentiment analysis using VADER with built-in lexicon fallback.
"""

import logging
import re
import math

logger = logging.getLogger(__name__)

MODEL_VERSION = "1.0.0-vader"

_analyzer = None


def load_model():
    global _analyzer
    try:
        from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
        _analyzer = SentimentIntensityAnalyzer()
        logger.info("VADER sentiment analyzer loaded.")
    except ImportError:
        logger.info("Using built-in clinical sentiment analyzer fallback.")


def _label(compound: float) -> str:
    if compound >= 0.05:
        return "POSITIVE"
    if compound <= -0.05:
        return "NEGATIVE"
    return "NEUTRAL"


def _fallback_sentiment(text: str) -> dict:
    """Built-in rule-based sentiment calculation when vaderSentiment is compiling/installing."""
    pos_words = {
        "good", "better", "improved", "improving", "progress", "positive", "calm",
        "engaged", "happy", "relaxed", "hopeful", "optimistic", "stable", "success",
        "helpful", "great", "coping", "active", "motivated", "strength", "insight"
    }
    neg_words = {
        "bad", "worse", "worsening", "depressed", "depression", "anxious", "anxiety",
        "hopeless", "sad", "sadness", "stress", "stressed", "struggle", "struggling",
        "difficulty", "difficult", "angry", "anger", "fear", "fearful", "overwhelmed",
        "panic", "trouble", "fatigue", "tired", "distress", "distressed", "tearful"
    }

    words = re.findall(r"\b\w+\b", text.lower())
    pos_count = sum(1 for w in words if w in pos_words)
    neg_count = sum(1 for w in words if w in neg_words)
    total = max(1, len(words))

    diff = pos_count - neg_count
    compound = diff / math.sqrt(diff ** 2 + 15) if diff != 0 else 0.0
    compound = max(-1.0, min(1.0, compound))

    return {
        "score": round(compound, 4),
        "label": _label(compound),
        "positive": round(pos_count / total, 4),
        "negative": round(neg_count / total, 4),
        "neutral": round(max(0, 1 - (pos_count + neg_count) / total), 4),
        "model_version": MODEL_VERSION,
    }


def analyze(text: str) -> dict:
    """
    Analyze sentiment of a given text string.
    Returns compound score (-1.0 to 1.0) and label.
    """
    global _analyzer
    if _analyzer is not None:
        try:
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
        except Exception:
            return _fallback_sentiment(text)

    return _fallback_sentiment(text)
