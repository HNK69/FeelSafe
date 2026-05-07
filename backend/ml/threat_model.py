"""
ml/threat_model.py
===================
ML-powered threat inference layer for FeelSafe.

Architecture:
  - Primary: TF-IDF + Logistic Regression sklearn pipeline (.pkl)
  - Hybrid:  0.6 * ML confidence + 0.4 * rule-based score → final confidence
  - Fallback: pure rule-based if model not loaded

Why Logistic Regression?
  - Produces calibrated probabilities (confidence scores)
  - Instant inference (microseconds on CPU)
  - Explainable coefficients
  - < 50 KB model file

Anomaly & Context Simulation:
  - Urgency amplifier:  detects "please", "help", "now" → boosts score
  - Repetition signal:  repeated urgent words → anomaly flag
  - Night + isolation context: auto-boosts score under risky conditions
"""

import math
import re
from ml.model_loader import load_threat_model
from utils.helpers import normalise_text, current_hour_local
from utils.constants import (
    RISK_LOW, RISK_MEDIUM, RISK_HIGH,
    NIGHT_START_HOUR, NIGHT_END_HOUR,
)

# ── Label map (matches training labels) ──────────────────────────────────────
_LABEL_MAP = {0: RISK_LOW, 1: RISK_MEDIUM, 2: RISK_HIGH}
_LABEL_IDX = {RISK_LOW: 0, RISK_MEDIUM: 1, RISK_HIGH: 2}

# ── Urgency & Anomaly Signals ─────────────────────────────────────────────────
_URGENCY_WORDS  = {"please", "help", "now", "immediately", "fast", "quick", "hurry", "asap"}
_DISTRESS_MARKS = {"!", "?", "???", "!!!"}


def predict_threat(
    text: str,
    rule_risk_level: str = RISK_LOW,
    rule_score: int = 0,
    current_hour: int | None = None,
    is_isolated_area: bool = False,
) -> dict:
    """
    Hybrid ML + rule-based threat prediction.

    Args:
        text:             Raw user input.
        rule_risk_level:  Result from the existing rule-based threat_service.
        rule_score:       Raw keyword score from rule-based service.
        current_hour:     Hour of day (0-23); uses system clock if None.
        is_isolated_area: True if user is in a known isolated location.

    Returns:
        {
            "risk":            "LOW" | "MEDIUM" | "HIGH",
            "confidence":      float (0.0–1.0),
            "signal_strength": int (0–10),
            "ml_active":       bool,
            "anomaly_flags":   list[str],
            "explanation":     str,
        }
    """
    if current_hour is None:
        current_hour = current_hour_local()

    norm_text = normalise_text(text)

    # ── Anomaly & Context Detection ───────────────────────────────────────────
    anomaly_flags  = _detect_anomalies(text, norm_text, current_hour, is_isolated_area)
    urgency_boost  = _urgency_score(norm_text)       # 0–3 extra risk points
    context_boost  = _context_boost(current_hour, is_isolated_area)  # 0–2

    # ── ML Inference ─────────────────────────────────────────────────────────
    ml_model = load_threat_model()
    ml_active = ml_model is not None

    if ml_active:
        ml_result = _run_ml(ml_model, text, norm_text)
    else:
        # Simulate ML output from rule score when model not loaded
        ml_result = _simulate_ml_from_rules(rule_score)

    # ── Hybrid Fusion ─────────────────────────────────────────────────────────
    # Map rule risk level to numeric index
    rule_idx    = _LABEL_IDX.get(rule_risk_level, 0)
    ml_idx      = ml_result["label_idx"]

    # Weighted average of risk indices
    # ML gets more weight when it's the real model (60%), less when simulated (40%)
    ml_weight   = 0.60 if ml_active else 0.40
    rule_weight = 1.0 - ml_weight
    fused_idx   = (ml_weight * ml_idx + rule_weight * rule_idx
                   + urgency_boost * 0.3 + context_boost * 0.2)

    # Map back to label
    final_idx   = min(2, int(round(fused_idx)))
    final_risk  = _LABEL_MAP[final_idx]

    # Confidence: blend ML probability with rule confidence
    rule_confidence = min(1.0, rule_score / 10.0)
    raw_confidence  = (ml_weight * ml_result["confidence"]
                       + rule_weight * rule_confidence)
    # Anomalies and urgency boost confidence
    anomaly_boost   = min(0.15, len(anomaly_flags) * 0.05)
    final_confidence = round(min(1.0, raw_confidence + anomaly_boost), 2)

    # Signal strength 0-10 (combines risk level + confidence)
    signal_strength = _compute_signal_strength(final_idx, final_confidence, anomaly_flags)

    explanation = _build_explanation(
        final_risk, final_confidence, ml_active,
        anomaly_flags, urgency_boost, context_boost,
    )

    return {
        "risk":            final_risk,
        "confidence":      final_confidence,
        "signal_strength": signal_strength,
        "ml_active":       ml_active,
        "anomaly_flags":   anomaly_flags,
        "explanation":     explanation,
    }


# ── ML Inference ──────────────────────────────────────────────────────────────

def _run_ml(pipeline, text: str, norm_text: str) -> dict:
    """Run inference using the loaded sklearn pipeline."""
    try:
        probs = pipeline.predict_proba([text])[0]   # [p_low, p_medium, p_high]
        label_idx  = int(probs.argmax())
        confidence = float(probs[label_idx])
        return {"label_idx": label_idx, "confidence": confidence, "probs": probs.tolist()}
    except Exception as e:
        # Model failed at inference — degrade gracefully
        return {"label_idx": 0, "confidence": 0.5, "probs": [0.5, 0.3, 0.2]}


def _simulate_ml_from_rules(rule_score: int) -> dict:
    """
    When the ML model isn't loaded, simulate its output from the rule score.
    This ensures the hybrid layer still adds value even without a .pkl file.
    """
    # Normalise rule_score to a 0–2 risk index
    if rule_score >= 8:
        label_idx, confidence = 2, 0.85
    elif rule_score >= 3:
        label_idx, confidence = 2, 0.70
    elif rule_score >= 1:
        label_idx, confidence = 1, 0.65
    else:
        label_idx, confidence = 0, 0.80
    return {"label_idx": label_idx, "confidence": confidence, "probs": None}


# ── Anomaly Detection ─────────────────────────────────────────────────────────

def _detect_anomalies(
    raw_text: str,
    norm_text: str,
    hour: int,
    is_isolated: bool,
) -> list:
    """
    Detect contextual anomalies that indicate elevated risk beyond keywords.
    Returns a list of human-readable anomaly flag strings.
    """
    flags = []

    # Repeated urgent words (e.g. "help help help")
    words = norm_text.split()
    word_counts = {}
    for w in words:
        word_counts[w] = word_counts.get(w, 0) + 1
    for word, count in word_counts.items():
        if count >= 3 and word in _URGENCY_WORDS:
            flags.append(f"Repeated urgency word '{word}' ({count}x) — panic signal")

    # Excessive punctuation (!!!, ???)
    exclamation_count = raw_text.count("!")
    if exclamation_count >= 3:
        flags.append(f"High emotional intensity ({exclamation_count} exclamation marks)")

    # ALL CAPS text (distress signal)
    upper_words = [w for w in raw_text.split() if w.isupper() and len(w) > 2]
    if len(upper_words) >= 2:
        flags.append(f"ALL CAPS words detected — high distress indicator")

    # Night + isolation combo (highest risk context)
    is_night = _is_night(hour)
    if is_night and is_isolated:
        flags.append("Night + isolated area — high contextual risk")
    elif is_night:
        flags.append("Nighttime context — elevated baseline risk")

    # Short message with a high-severity keyword (e.g. "HELP" alone)
    if len(words) <= 4 and any(w in {"help", "sos", "danger", "attack"} for w in words):
        flags.append("Short high-severity message — urgent distress pattern")

    return flags


def _urgency_score(norm_text: str) -> float:
    """Score urgency signals in the text. Returns 0.0–3.0."""
    score = 0.0
    for word in _URGENCY_WORDS:
        if word in norm_text:
            score += 0.75
    return min(score, 3.0)


def _context_boost(hour: int, is_isolated: bool) -> float:
    """Environmental context boost. Returns 0.0–2.0."""
    boost = 0.0
    if _is_night(hour):
        boost += 1.0
    if is_isolated:
        boost += 1.0
    return boost


def _is_night(hour: int) -> bool:
    return hour >= NIGHT_START_HOUR or hour < NIGHT_END_HOUR


# ── Signal Strength & Explanation ─────────────────────────────────────────────

def _compute_signal_strength(risk_idx: int, confidence: float, anomalies: list) -> int:
    """Compute a 0–10 signal strength score for the UI."""
    base = {0: 2, 1: 5, 2: 8}.get(risk_idx, 2)
    conf_bonus = int(confidence * 2)
    anomaly_bonus = min(len(anomalies), 2)
    return min(10, base + conf_bonus + anomaly_bonus)


def _build_explanation(
    risk: str,
    confidence: float,
    ml_active: bool,
    anomalies: list,
    urgency: float,
    context: float,
) -> str:
    """Build a concise, human-readable explanation of the prediction."""
    mode = "ML + rule-based hybrid" if ml_active else "rule-based simulation"
    conf_pct = int(confidence * 100)

    if risk == RISK_HIGH:
        base = f"HIGH risk detected ({conf_pct}% confidence, {mode})."
    elif risk == RISK_MEDIUM:
        base = f"MEDIUM risk detected ({conf_pct}% confidence, {mode})."
    else:
        base = f"LOW risk — situation appears safe ({conf_pct}% confidence, {mode})."

    extras = []
    if urgency > 0:
        extras.append(f"urgency signals present (score: {urgency:.1f}/3)")
    if context > 0:
        extras.append(f"environmental risk factors active (score: {context:.1f}/2)")
    if anomalies:
        extras.append(f"{len(anomalies)} anomaly flag(s) detected")

    if extras:
        base += " Contributing factors: " + "; ".join(extras) + "."

    return base
