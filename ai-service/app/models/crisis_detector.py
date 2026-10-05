"""
app/models/crisis_detector.py
Passive Safety Triager — Crisis and Acute Distress Detection.

Scans client text (journal entries, mood check-ins, pre-session reflections)
for acute distress signals including self-harm ideation, severe hopelessness,
and crisis language.

IMPORTANT DISCLAIMER:
  This is a SUPPLEMENTARY safety-net tool. It is NOT a substitute for
  professional clinical assessment. False negatives ARE possible.
  Therapists MUST exercise independent clinical judgment at all times.
  
  All flagged alerts must be reviewed by a licensed mental health professional.
  This tool does not diagnose, treat, or replace human crisis intervention.
"""

import re
import logging
from typing import List

logger = logging.getLogger(__name__)

MODEL_VERSION = "1.0.0-crisis-rules"

# ── Risk-Level Definitions ────────────────────────────────────────────────────

# CRITICAL: Immediate danger signals (self-harm, suicidal ideation)
CRITICAL_PATTERNS = [
    r"\b(want to die|wanting to die|wish i (was|were) dead|better off dead)\b",
    r"\b(kill myself|killing myself|end my life|end it all|take my (own )?life)\b",
    r"\b(suicid|suicidal|self[- ]?harm|cut myself|cutting myself|hurt myself|hurting myself)\b",
    r"\b(no reason to live|nothing to live for|can'?t go on|can'?t take it anymore)\b",
    r"\b(don'?t want to (be here|exist|wake up|be alive))\b",
    r"\b(overdose|pills|jump off|hang myself|slit)\b",
    r"\b(goodbye (letter|note|everyone|world)|final (note|letter|goodbye))\b",
    r"\b(plan(ning)? to (die|end|kill|hurt))\b",
]

# HIGH: Severe distress and hopelessness
HIGH_PATTERNS = [
    r"\b(hopeless|helpless|worthless|empty inside|numb|can'?t feel anything)\b",
    r"\b(no (hope|point|purpose|future|way out))\b",
    r"\b(i'?m (a )?burden|everyone.*(better|happier) without me)\b",
    r"\b(trapped|suffocating|drowning|can'?t breathe|can'?t escape)\b",
    r"\b(hate myself|despise myself|disgusted with myself)\b",
    r"\b(give up|giving up|given up|surrend)\b",
    r"\b(darkness|dark place|black hole|abyss|void)\b",
    r"\b(panic attack|severe anxiety|can'?t stop (crying|shaking|screaming))\b",
    r"\b(abuse|abused|violent|hitting me|beats me|assault)\b",
]

# MODERATE: Elevated concern indicators
MODERATE_PATTERNS = [
    r"\b(depressed|depression|deeply sad|overwhelm|can'?t cope|falling apart)\b",
    r"\b(insomnia|can'?t sleep|not sleeping|not eating|lost appetite)\b",
    r"\b(isolation|isolating|withdraw|alone|lonely|no one (understands|cares))\b",
    r"\b(substance|drinking|alcohol|drugs|relapse|using again)\b",
    r"\b(anger|rage|furious|explosive|lose control|violent thoughts)\b",
    r"\b(flashback|nightmare|ptsd|trauma|triggered)\b",
]

# ── Emergency Resources ──────────────────────────────────────────────────────

EMERGENCY_RESOURCES = [
    {
        "name": "Tele-MANAS (India)",
        "number": "14416",
        "description": "National 24/7 mental health helpline by Government of India",
    },
    {
        "name": "Vandrevala Foundation",
        "number": "9999 666 555",
        "description": "24/7 multilingual mental health support",
    },
    {
        "name": "iCall (TISS)",
        "number": "9152987821",
        "description": "Psychosocial helpline by Tata Institute of Social Sciences",
    },
    {
        "name": "AASRA",
        "number": "9820466726",
        "description": "24/7 crisis intervention and suicide prevention",
    },
]


def _count_matches(text: str, patterns: List[str]) -> int:
    """Count total pattern matches in text."""
    count = 0
    for pattern in patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        count += len(matches)
    return count


def _extract_matched_keywords(text: str, patterns: List[str]) -> List[str]:
    """Extract the actual matched phrases from text."""
    keywords = []
    for pattern in patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        for match in matches:
            if isinstance(match, tuple):
                keywords.append(match[0])
            else:
                keywords.append(match)
    return list(set(keywords))[:5]  # Limit to 5 unique keywords


def scan(text: str) -> dict:
    """
    Scan client text for acute distress and crisis signals.
    
    Returns a risk assessment with:
    - risk_level: 'critical', 'high', 'moderate', 'low'
    - risk_score: 0.0 to 1.0
    - flags: list of detected risk indicators
    - resources: emergency contacts (if risk is elevated)
    - alert_therapist: boolean indicating if therapist should be notified
    - show_crisis_ui: boolean indicating if client should see crisis support
    """
    text_lower = text.lower()

    critical_count = _count_matches(text_lower, CRITICAL_PATTERNS)
    high_count = _count_matches(text_lower, HIGH_PATTERNS)
    moderate_count = _count_matches(text_lower, MODERATE_PATTERNS)

    # Calculate weighted risk score
    weighted = (critical_count * 1.0) + (high_count * 0.6) + (moderate_count * 0.3)
    risk_score = min(1.0, round(weighted / 3.0, 2))

    # Determine risk level
    if critical_count > 0:
        risk_level = "critical"
        risk_score = max(risk_score, 0.85)
    elif high_count >= 2 or (high_count >= 1 and moderate_count >= 2):
        risk_level = "high"
        risk_score = max(risk_score, 0.60)
    elif high_count >= 1 or moderate_count >= 2:
        risk_level = "moderate"
        risk_score = max(risk_score, 0.35)
    else:
        risk_level = "low"

    # Collect matched flags
    flags = []
    if critical_count > 0:
        flags.append({
            "severity": "critical",
            "count": critical_count,
            "keywords": _extract_matched_keywords(text_lower, CRITICAL_PATTERNS),
        })
    if high_count > 0:
        flags.append({
            "severity": "high",
            "count": high_count,
            "keywords": _extract_matched_keywords(text_lower, HIGH_PATTERNS),
        })
    if moderate_count > 0:
        flags.append({
            "severity": "moderate",
            "count": moderate_count,
            "keywords": _extract_matched_keywords(text_lower, MODERATE_PATTERNS),
        })

    # Determine actions
    alert_therapist = risk_level in ("critical", "high")
    show_crisis_ui = risk_level == "critical"

    return {
        "risk_level": risk_level,
        "risk_score": risk_score,
        "flags": flags,
        "alert_therapist": alert_therapist,
        "show_crisis_ui": show_crisis_ui,
        "resources": EMERGENCY_RESOURCES if risk_level in ("critical", "high") else [],
        "model_version": MODEL_VERSION,
    }
