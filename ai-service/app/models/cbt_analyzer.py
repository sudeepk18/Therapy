"""
app/models/cbt_analyzer.py
Cognitive Distortion Analyzer for CBT Thought Records.

Identifies common cognitive distortions from negative automatic thoughts
and provides guided Socratic reframing questions.

IMPORTANT DISCLAIMER:
  This is a rule-based NLP tool for therapist decision support.
  It is NOT a clinical diagnosis tool. All outputs must be reviewed
  by a licensed mental health professional.
"""

import re
import logging

logger = logging.getLogger(__name__)

MODEL_VERSION = "1.0.0-cbt-rules"

# ── Cognitive Distortion Patterns ────────────────────────────────────────────
# Each distortion has keywords/phrases and guided reframing prompts.

DISTORTIONS = {
    "catastrophizing": {
        "label": "Catastrophizing",
        "description": "Expecting the worst possible outcome without considering more likely scenarios.",
        "patterns": [
            r"\b(worst|disaster|catastroph|ruin|destroy|end of|never recover|terrible|horrible)\b",
            r"\b(going to (die|fail|lose|be fired|be alone|be homeless))\b",
            r"\b(everything is|it'?s all|my life is)\s+(over|ruined|destroyed|falling apart)\b",
            r"\bwhat if .*(worst|terrible|horrible|die|fail|never)\b",
        ],
        "reframe_prompts": [
            "What is the most realistic outcome, not the worst-case scenario?",
            "Have you faced similar situations before? What actually happened?",
            "On a scale of 1–10, how likely is this worst-case outcome really?",
        ],
    },
    "all_or_nothing": {
        "label": "All-or-Nothing Thinking",
        "description": "Seeing things in black-and-white terms with no middle ground.",
        "patterns": [
            r"\b(always|never|every\s*time|nothing|everything|completely|totally|absolute|perfect)\b",
            r"\b(no one|everyone|nobody)\s+(cares|likes|loves|understands|listens)\b",
            r"\b(i'?m a (total|complete|absolute|utter)\s+(failure|loser|disaster|mess))\b",
            r"\b(100%|0%|entirely|wholly)\b",
        ],
        "reframe_prompts": [
            "Is this really 'always' or 'never', or are there times when it's different?",
            "Can you think of any exceptions to this pattern?",
            "What would a middle-ground perspective look like?",
        ],
    },
    "mind_reading": {
        "label": "Mind Reading",
        "description": "Assuming you know what others are thinking without evidence.",
        "patterns": [
            r"\b(they think|he thinks|she thinks|everyone thinks|people think)\b",
            r"\b(they must|he must|she must)\s+(hate|dislike|think i'?m|believe)\b",
            r"\b(i know|i can tell|i'?m sure)\s+(they|he|she|everyone)\s+(thinks?|feels?|hates?|doesn'?t)\b",
            r"\b(judging me|laughing at me|looking down|talking about me)\b",
        ],
        "reframe_prompts": [
            "What concrete evidence do you have for what they're thinking?",
            "Is there an alternative explanation for their behavior?",
            "Have you asked them directly how they feel?",
        ],
    },
    "emotional_reasoning": {
        "label": "Emotional Reasoning",
        "description": "Believing something must be true because you feel it strongly.",
        "patterns": [
            r"\bi feel (like|that|as if)\s+(i'?m|i am|i)\s+(worthless|useless|stupid|a failure|unlovable|broken)\b",
            r"\bi feel\b.*\b(so|therefore|which means|that means|proves)\b",
            r"\bbecause i feel\b",
            r"\bi (just )?feel (so )?(bad|guilty|ashamed|ugly|fat|stupid|dumb)\b",
        ],
        "reframe_prompts": [
            "Just because you feel this way, does it make it factually true?",
            "What would you say to a friend who expressed this same feeling?",
            "What facts support or contradict this feeling?",
        ],
    },
    "overgeneralization": {
        "label": "Overgeneralization",
        "description": "Drawing broad conclusions from a single event.",
        "patterns": [
            r"\b(this always happens|every time|typical|same thing|never works|story of my life)\b",
            r"\b(i always|i never|i can'?t ever|nothing ever)\b",
            r"\b(once again|here we go again|as usual|as always)\b",
        ],
        "reframe_prompts": [
            "Is this truly a pattern, or are you focusing on one event?",
            "Can you recall times when a different outcome occurred?",
            "What specific evidence supports this being 'always' the case?",
        ],
    },
    "personalization": {
        "label": "Personalization",
        "description": "Taking excessive responsibility for events outside your control.",
        "patterns": [
            r"\b(my fault|i caused|because of me|i'?m to blame|i ruined|i messed up)\b",
            r"\b(if (only )?i had|i should have|i could have prevented)\b",
            r"\b(they'?re (upset|angry|sad|disappointed) because of me)\b",
        ],
        "reframe_prompts": [
            "What other factors contributed to this situation?",
            "Were you truly the only cause, or were there other circumstances?",
            "What percentage of responsibility realistically belongs to you?",
        ],
    },
    "labeling": {
        "label": "Labeling",
        "description": "Attaching a fixed, global label to yourself or others instead of describing behavior.",
        "patterns": [
            r"\bi'?m (a|an|such a|just a)\s+(loser|failure|idiot|fraud|burden|waste|mess|joke|disappointment)\b",
            r"\b(he|she|they) (is|are) (a|an|such a)\s+(jerk|idiot|narcissist|loser)\b",
            r"\bi'?m (worthless|useless|pathetic|incompetent|unlovable|broken|damaged)\b",
        ],
        "reframe_prompts": [
            "Are you describing a behavior or defining your entire identity?",
            "Would someone who knows you well agree with this label?",
            "What evidence contradicts this label?",
        ],
    },
    "should_statements": {
        "label": "Should Statements",
        "description": "Rigid rules about how you or others must behave.",
        "patterns": [
            r"\bi (should|must|ought to|have to|need to)\s+(be|have|do|know|feel|always|never)\b",
            r"\b(they|he|she) (should|must|ought to)\b",
            r"\b(i shouldn'?t (feel|be|have|need))\b",
        ],
        "reframe_prompts": [
            "Where does this rule come from? Is it realistic?",
            "What would happen if you replaced 'should' with 'I would prefer'?",
            "Are you holding yourself to an impossible standard?",
        ],
    },
}


def analyze(text: str) -> dict:
    """
    Analyze a negative automatic thought for cognitive distortions.
    
    Returns detected distortions with reframing prompts.
    Multiple distortions can be present in a single thought.
    """
    text_lower = text.lower()
    detected = []

    for distortion_key, distortion_data in DISTORTIONS.items():
        match_count = 0
        for pattern in distortion_data["patterns"]:
            matches = re.findall(pattern, text_lower, re.IGNORECASE)
            match_count += len(matches)

        if match_count > 0:
            detected.append({
                "type": distortion_key,
                "label": distortion_data["label"],
                "description": distortion_data["description"],
                "confidence": min(1.0, round(match_count * 0.35, 2)),
                "reframe_prompts": distortion_data["reframe_prompts"],
            })

    # Sort by confidence descending
    detected.sort(key=lambda d: d["confidence"], reverse=True)

    # Primary distortion is the highest confidence one
    primary = detected[0]["type"] if detected else "none"

    return {
        "distortions": detected,
        "primary_distortion": primary,
        "distortion_count": len(detected),
        "model_version": MODEL_VERSION,
    }
