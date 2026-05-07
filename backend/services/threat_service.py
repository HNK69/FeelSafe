"""
services/threat_service.py
===========================
Lightweight rule-based AI threat detection.
No heavy ML — uses weighted keyword matching with context awareness.

Risk levels returned: LOW | MEDIUM | HIGH
"""

from utils.helpers import normalise_text
from utils.risk_scoring import threat_score_to_risk
from utils.constants import (
    RISK_LOW, RISK_MEDIUM, RISK_HIGH,
    DEFAULT_SAFE_MESSAGE, DEFAULT_MEDIUM_MESSAGE, DEFAULT_HIGH_MESSAGE,
)


# ── Threat Keyword Lexicon ────────────────────────────────────────────────────
# Format:  keyword_phrase → weight
# Weights are cumulative; total determines risk level.

THREAT_KEYWORDS = {
    # Immediate danger – HIGH weight
    "help":              3,
    "help me":           4,
    "someone following": 4,
    "following me":      4,
    "being followed":    4,
    "attack":            4,
    "attacked":          4,
    "assault":           4,
    "rape":              5,
    "molest":            5,
    "kidnap":            5,
    "threat":            3,
    "threatened":        3,
    "weapon":            4,
    "knife":             4,
    "gun":               4,
    "call police":       4,
    "call 100":          4,
    "emergency":         3,
    "danger":            3,
    "sos":               4,

    # Route/situation anomaly – MEDIUM weight
    "cab changed route": 3,
    "driver changed":    3,
    "wrong route":       3,
    "different route":   3,
    "route changed":     3,
    "detour":            2,
    "unfamiliar area":   2,
    "dont know area":    2,
    "lost":              1,
    "stranded":          2,
    "car stopped":       2,
    "locked in":         3,
    "door locked":       3,

    # Emotional distress – MEDIUM weight
    "unsafe":            2,
    "feel unsafe":       3,
    "scared":            2,
    "afraid":            2,
    "uncomfortable":     1,
    "harassing":         3,
    "harassment":        3,
    "suspicious":        2,
    "stalking":          3,
    "staring":           1,
    "drunk man":         2,
    "drunk person":      2,
    "eve teasing":       3,

    # Low-concern – LOW weight
    "alone":             1,
    "dark":              1,
    "late night":        1,
    "no one around":     1,
    "deserted":          1,
}

# Phrases that reduce the threat score (negations)
NEGATION_PHRASES = ["not scared", "im fine", "i am fine", "safe now", "reached home", "all good"]


def analyse_threat(text: str) -> dict:
    """
    Analyse free-text input for threat signals and return a risk assessment.

    Args:
        text: Raw user message (e.g. "Someone is following me and I feel unsafe").

    Returns:
        {
            "risk_level": "HIGH" | "MEDIUM" | "LOW",
            "message": str,
            "score": int,
            "matched_keywords": list[str],
            "action_tips": list[str],
        }
    """
    normalised = normalise_text(text)

    score = 0
    matched = []

    # ── Negation Check ────────────────────────────────────────────────────────
    for neg in NEGATION_PHRASES:
        if neg in normalised:
            # User is indicating they are safe — return LOW immediately
            return {
                "risk_level":       RISK_LOW,
                "message":          "Negation phrase detected. You appear safe.",
                "score":            0,
                "matched_keywords": [],
                "action_tips":      [DEFAULT_SAFE_MESSAGE],
            }

    # ── Keyword Scoring ───────────────────────────────────────────────────────
    for keyword, weight in THREAT_KEYWORDS.items():
        if keyword in normalised:
            score += weight
            matched.append(keyword)

    # Deduplicate matched keywords (multi-word phrases may overlap)
    matched = list(set(matched))

    risk_level = threat_score_to_risk(score)
    message    = _risk_message(risk_level)
    tips       = _action_tips(risk_level)

    return {
        "risk_level":       risk_level,
        "message":          message,
        "score":            score,
        "matched_keywords": matched,
        "action_tips":      tips,
    }


# ── Internal Helpers ──────────────────────────────────────────────────────────

def _risk_message(risk_level: str) -> str:
    """Map risk level to a user-facing message."""
    return {
        RISK_LOW:    DEFAULT_SAFE_MESSAGE,
        RISK_MEDIUM: DEFAULT_MEDIUM_MESSAGE,
        RISK_HIGH:   DEFAULT_HIGH_MESSAGE,
    }.get(risk_level, DEFAULT_SAFE_MESSAGE)


def _action_tips(risk_level: str) -> list:
    """Return situational action tips based on the detected risk level."""
    if risk_level == RISK_HIGH:
        return [
            "Call 112 (National Emergency) immediately.",
            "Send your location to a trusted contact.",
            "Move to a crowded, well-lit area.",
            "Trigger the FeelSafe SOS alert.",
            "Stay on call with someone until safe.",
        ]
    if risk_level == RISK_MEDIUM:
        return [
            "Stay alert and aware of your surroundings.",
            "Share your live location with a trusted contact.",
            "Move toward public/crowded areas.",
            "Note the route and cab details.",
        ]
    return [
        "Stay aware and check in regularly.",
        "Keep your phone charged.",
    ]
