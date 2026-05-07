"""
services/threat_service.py
===========================
AI-grade threat detection engine for FeelSafe.
Multi-keyword + phrase matching with contextual amplifiers,
confidence scoring, and human-readable reason generation.

Risk levels: LOW | MEDIUM | HIGH
"""

import re
from utils.helpers import normalise_text
from utils.risk_scoring import threat_score_to_risk, compute_threat_confidence
from utils.constants import (
    RISK_LOW, RISK_MEDIUM, RISK_HIGH,
    DEFAULT_SAFE_MESSAGE, DEFAULT_MEDIUM_MESSAGE, DEFAULT_HIGH_MESSAGE,
)


# ── Threat Keyword Lexicon ────────────────────────────────────────────────────
THREAT_KEYWORDS: dict[str, int] = {
    # Immediate physical danger – weight 5
    "rape": 5, "molest": 5, "kidnap": 5, "abduct": 5, "traffick": 5,
    # Violence / weapons – weight 4
    "attack": 4, "attacked": 4, "assault": 4, "weapon": 4, "knife": 4,
    "gun": 4, "stabbing": 4, "bleeding": 4, "hit me": 4, "beating me": 4,
    # Stalking / following – weight 4
    "someone following": 4, "following me": 4, "being followed": 4,
    "stalking me": 4, "chasing me": 4, "man following": 4, "guy following": 4,
    # Emergency signals – weight 4
    "help me": 4, "call police": 4, "call 100": 4, "call 112": 4, "sos": 4,
    "send help": 4, "need help": 4, "in danger": 4,
    # Cab / vehicle threats – weight 3-4
    "cab changed route": 4, "locked in": 4, "door locked": 4,
    "wont let me out": 4, "taking somewhere": 4,
    "driver changed": 3, "wrong route": 3, "different route": 3,
    "route changed": 3, "car stopped": 3, "strange area": 3,
    # General threat indicators – weight 3
    "help": 3, "threat": 3, "threatened": 3, "emergency": 3, "danger": 3,
    "eve teasing": 3, "harassing": 3, "harassment": 3,
    "groping": 4, "grabbing me": 4, "touched me": 3,
    "feel unsafe": 3, "feeling unsafe": 3, "not safe": 3,
    "stalking": 3, "chased": 3, "suspicious person": 3, "suspicious man": 3,
    "following slowly": 3, "very scared": 3, "panicking": 3, "terrified": 3,
    # Emotional distress – weight 2
    "unsafe": 2, "scared": 2, "afraid": 2, "frightened": 2,
    "uncomfortable": 1, "suspicious": 2, "staring at me": 2,
    "drunk man": 2, "drunk person": 2, "intoxicated man": 2,
    "detour": 2, "unfamiliar area": 2, "dont know area": 2,
    "stranded": 2, "no one around": 2, "deserted": 2, "no lights": 2,
    "empty road": 2,
    # Low concern – weight 1
    "alone": 1, "dark": 1, "late night": 1, "lost": 1,
}

# Contextual urgency amplifiers — add bonus score when present
AMPLIFIERS: dict[str, float] = {
    "right now": 1.5, "please": 1.0, "hurry": 1.5, "immediately": 1.5,
    "help me please": 2.0, "please help": 2.0, "so scared": 1.5,
    "cant escape": 2.0, "no way out": 2.0, "getting worse": 1.5,
}

# Negation phrases — user indicates they are safe
NEGATION_PHRASES: list[str] = [
    "not scared", "im fine", "i am fine", "safe now", "reached home",
    "all good", "everything okay", "just testing", "false alarm",
    "never mind", "i was joking",
]

_HIGH_KEYWORDS = {k for k, v in THREAT_KEYWORDS.items() if v >= 4}
_MED_KEYWORDS  = {k for k, v in THREAT_KEYWORDS.items() if 2 <= v < 4}


# ── Public API ────────────────────────────────────────────────────────────────

def analyse_threat(text: str) -> dict:
    """
    Analyse free-text for threat signals and return a full risk assessment.

    Returns:
        {
            "risk_level":        "HIGH" | "MEDIUM" | "LOW",
            "confidence":        float (0.0-1.0),
            "message":           str,
            "reason":            str,
            "score":             int,
            "matched_keywords":  list[str],
            "matched_amplifiers": list[str],
            "action_tips":       list[str],
        }
    """
    normalised = normalise_text(text)

    # Negation check — if user says they're safe, return LOW immediately
    for neg in NEGATION_PHRASES:
        if neg in normalised:
            return {
                "risk_level": RISK_LOW,
                "confidence": 0.05,
                "message": "Safety confirmed by user. Staying alert.",
                "reason": "User indicated they are safe or alert was a false alarm.",
                "score": 0,
                "matched_keywords": [],
                "matched_amplifiers": [],
                "action_tips": ["Stay aware and check in regularly.", "Keep your phone charged."],
            }

    # Score longest phrases first to avoid double-counting substrings
    score   = 0
    matched = []
    working_text = normalised
    for keyword, weight in sorted(THREAT_KEYWORDS.items(), key=lambda x: -len(x[0])):
        if keyword in working_text:
            score += weight
            matched.append(keyword)
            working_text = working_text.replace(keyword, " ", 1)

    # Amplifier bonus
    matched_amplifiers = []
    amp_bonus = 0.0
    for phrase, bonus in AMPLIFIERS.items():
        if phrase in normalised:
            amp_bonus += bonus
            matched_amplifiers.append(phrase)
    score += int(amp_bonus)

    matched = list(dict.fromkeys(matched))  # preserve order, deduplicate

    risk_level = threat_score_to_risk(score)
    confidence = compute_threat_confidence(score, len(matched))
    reason     = _build_reason(risk_level, matched, matched_amplifiers)
    message    = _risk_message(risk_level)
    tips       = _action_tips(risk_level, matched)

    return {
        "risk_level":        risk_level,
        "confidence":        confidence,
        "message":           message,
        "reason":            reason,
        "score":             score,
        "matched_keywords":  matched,
        "matched_amplifiers": matched_amplifiers,
        "action_tips":       tips,
    }


# ── Internal Helpers ──────────────────────────────────────────────────────────

def _build_reason(risk_level: str, matched: list, amplifiers: list) -> str:
    """Human-readable AI-style reason for the detected risk level."""
    if not matched:
        return "No specific threat indicators found in your message."

    high_hits = [k for k in matched if k in _HIGH_KEYWORDS]
    med_hits  = [k for k in matched if k in _MED_KEYWORDS]

    if risk_level == RISK_HIGH:
        lead = "Multiple high-risk indicators detected"
        if high_hits:
            lead += f" — including: {', '.join(high_hits[:3])}"
        suffix = ". Immediate action is strongly recommended."
        if amplifiers:
            suffix = f". Urgency signals detected ({', '.join(amplifiers[:2])}){suffix}"
        return lead + suffix

    if risk_level == RISK_MEDIUM:
        parts = []
        if med_hits:
            parts.append(f"distress signals: {', '.join(med_hits[:3])}")
        if high_hits:
            parts.append(f"elevated-risk phrase: '{high_hits[0]}'")
        base = "; ".join(parts) if parts else "Potential risk detected"
        return f"Potential threat — {base}. Stay alert and take precautionary steps."

    if matched:
        return f"Minor concern detected ({', '.join(matched[:2])}), but no immediate danger identified."
    return "No significant threat indicators detected. Stay cautious."


def _risk_message(risk_level: str) -> str:
    return {
        RISK_LOW:    DEFAULT_SAFE_MESSAGE,
        RISK_MEDIUM: DEFAULT_MEDIUM_MESSAGE,
        RISK_HIGH:   DEFAULT_HIGH_MESSAGE,
    }.get(risk_level, DEFAULT_SAFE_MESSAGE)


def _action_tips(risk_level: str, matched: list) -> list:
    """Context-aware action tips based on risk level and matched signals."""
    if risk_level == RISK_HIGH:
        tips = [
            "Call 112 (National Emergency) immediately.",
            "Share your live location with a trusted contact right now.",
            "Move toward a crowded, well-lit public area.",
            "Trigger the FeelSafe SOS alert.",
            "Stay on call with someone until you reach safety.",
        ]
        cab_signals = {"cab changed route", "driver changed", "wrong route", "locked in", "door locked", "wont let me out"}
        if any(kw in cab_signals for kw in matched):
            tips.insert(2, "If in a cab — note the vehicle number and demand to stop at a public place.")
        return tips

    if risk_level == RISK_MEDIUM:
        return [
            "Stay alert and aware of your surroundings.",
            "Share your live location with a trusted contact.",
            "Move toward public, crowded, or well-lit areas.",
            "Note route details, vehicle number, or any identifying information.",
            "Keep FeelSafe open and ready to escalate if needed.",
        ]

    return [
        "Stay aware and check in with someone regularly.",
        "Keep your phone charged.",
        "Let a trusted contact know your whereabouts.",
    ]
