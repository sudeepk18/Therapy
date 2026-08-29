"""
app/models/soap_generator.py
Rule-based SOAP note draft generator.

Approach:
  1. Tokenize and classify sentences from the therapist's free-text input
     using keyword matching and simple NLP heuristics.
  2. Map classified sentences to SOAP sections.
  3. Supplement each section with a clinically neutral template sentence
     where no matching content is found.

This is deliberately a rule-based approach — not an LLM — so it is:
  - Deterministic (reproducible, auditable)
  - Fast (no network calls, runs in <100ms)
  - Safe (no hallucination risk)
  - Easily swappable for an LLM call when needed

IMPORTANT:
  - Output is a DRAFT for therapist review.
  - The therapist MUST edit, verify, and save the final note.
  - This is NOT a clinical record until signed by the therapist.
"""

import re
import logging
from typing import List, Tuple

logger = logging.getLogger(__name__)

MODEL_VERSION = "1.0.0-rule-based"

# ── Keyword sets for sentence classification ─────────────────────────────────

SUBJECTIVE_KEYWORDS = [
    r"\b(report(s|ed)?|said|stated|mentioned|expressed|described|felt|feel|feeling|complain|told|shared|noted|verbalized)\b",
    r"\b(stress|anxious|anxiety|worried|worry|sad|sadness|depressed|hopeless|helpless|anger|angry|fear|fearful|numb|overwhelm)\b",
    r"\b(sleep|appetite|energy|mood|motivation|concentration|focus|relationship|work|study|exam|school|family)\b",
    r"\b(difficulty|struggle|hard time|trouble|issue|problem|challenge|concern)\b",
]

OBJECTIVE_KEYWORDS = [
    r"\b(appear(ed|s)?|seem(ed|s)?|present(ed)?|observed|noted|demeanor|affect|behavior|eye contact|posture|speech|rate of speech)\b",
    r"\b(calm|agitated|tearful|distressed|engaged|withdrawn|cooperative|alert|oriented)\b",
    r"\b(affect (was|appeared)|mood (was|appeared)|presentation)\b",
]

ASSESSMENT_KEYWORDS = [
    r"\b(associat(ed|ing)?|related to|consistent with|appear(s)? to be|suggest(s)?|indicat(es|ing)?|pattern)\b",
    r"\b(progress|improvement|worsening|stable|ongoing|chronic|acute|barrier|strength|insight)\b",
    r"\b(coping|adaptive|maladaptive|functioning|response|adjustment)\b",
]

PLAN_KEYWORDS = [
    r"\b(discuss(ed|ing)?|continue|review|follow.up|homework|practice|technique|intervention|strategy|skill|exercise|next session)\b",
    r"\b(plan|goal|target|monitor|track|referral|refer|medication|psychoeducation|CBT|mindfulness|DBT|EMDR|relaxation)\b",
    r"\b(schedule|book|appointment|next week|next month|biweekly)\b",
]


def _match_score(sentence: str, patterns: List[str]) -> int:
    """Count how many patterns match the sentence."""
    sentence_lower = sentence.lower()
    return sum(1 for p in patterns if re.search(p, sentence_lower))


def _classify_sentence(sentence: str) -> str:
    """Return the SOAP section this sentence most likely belongs to."""
    scores = {
        "S": _match_score(sentence, SUBJECTIVE_KEYWORDS),
        "O": _match_score(sentence, OBJECTIVE_KEYWORDS),
        "A": _match_score(sentence, ASSESSMENT_KEYWORDS),
        "P": _match_score(sentence, PLAN_KEYWORDS),
    }
    best = max(scores, key=scores.get)
    # If no keyword matched, default to Subjective (safest)
    if scores[best] == 0:
        return "S"
    return best


def _split_sentences(text: str) -> List[str]:
    """Simple sentence splitter."""
    sentences = re.split(r'(?<=[.!?])\s+', text.strip())
    return [s.strip() for s in sentences if len(s.strip()) > 5]


def _capitalize_first(s: str) -> str:
    return s[0].upper() + s[1:] if s else s


def generate_soap_draft(free_text: str) -> dict:
    """
    Generate a structured SOAP draft from free-form therapist input.
    Returns a dict with S, O, A, P strings.
    """
    sentences = _split_sentences(free_text)

    buckets: dict[str, List[str]] = {"S": [], "O": [], "A": [], "P": []}
    for sent in sentences:
        section = _classify_sentence(sent)
        buckets[section].append(_capitalize_first(sent))

    # ── Default fallbacks for empty sections ─────────────────────────────────
    defaults = {
        "S": "Client reports experiences discussed in session.",
        "O": "Client appeared engaged during the session.",
        "A": "Current presentation is consistent with issues discussed.",
        "P": "Continue current treatment approach. Follow up at next session.",
    }

    result = {}
    for section, sentences in buckets.items():
        if sentences:
            result[section] = " ".join(sentences)
        else:
            result[section] = defaults[section]

    return {
        "subjective":  result["S"],
        "objective":   result["O"],
        "assessment":  result["A"],
        "plan":        result["P"],
        "model_version": MODEL_VERSION,
    }
