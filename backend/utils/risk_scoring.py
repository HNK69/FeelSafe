"""
utils/risk_scoring.py
=====================
Reusable, rule-based safety scoring functions shared across services.
All scores are 0-100 (higher = safer).
"""

from utils.constants import (
    ROUTE_SAFE_THRESHOLD,
    ROUTE_MODERATE_THRESHOLD,
    NIGHT_START_HOUR,
    NIGHT_END_HOUR,
    RISK_LOW,
    RISK_MEDIUM,
    RISK_HIGH,
    THREAT_THRESHOLD_HIGH,
    THREAT_THRESHOLD_MEDIUM,
)
from utils.helpers import current_hour_local, clamp


# ── Route Safety Score ────────────────────────────────────────────────────────

def compute_route_safety_score(
    has_hospital_nearby: bool,
    has_police_nearby: bool,
    is_isolated: bool,
    unsafe_report_count: int,
    community_rating: float,       # 0.0 – 5.0
    current_hour: int | None = None,
) -> dict:
    """
    Compute a composite safety score (0-100) for a route segment.

    Scoring breakdown (additive):
        + 20  : hospital within radius
        + 25  : police station within radius
        - 20  : road is isolated / poorly lit
        - 5   : per unsafe community report (max -25)
        + community_rating * 8  (max +40)
        - 15  : nighttime travel (20:00 – 06:00)

    Args:
        has_hospital_nearby:  True if a hospital is within the safe radius.
        has_police_nearby:    True if a police station is within the safe radius.
        is_isolated:          True if the road is isolated / no bystanders.
        unsafe_report_count:  Number of community-submitted unsafe reports.
        community_rating:     Average community safety rating (0-5 scale).
        current_hour:         Hour of day (0-23); defaults to system local hour.

    Returns:
        dict with keys: score (int), label (str), factors (list[str])
    """
    if current_hour is None:
        current_hour = current_hour_local()

    score = 50.0   # Neutral baseline
    factors = []

    # Positive factors
    if has_hospital_nearby:
        score += 20
        factors.append("Hospital nearby (+20)")

    if has_police_nearby:
        score += 25
        factors.append("Police station nearby (+25)")

    # Community rating contribution (0-5 → 0-40 points)
    rating_bonus = community_rating * 8
    score += rating_bonus
    if community_rating > 0:
        factors.append(f"Community rating {community_rating:.1f}/5 (+{rating_bonus:.0f})")

    # Negative factors
    if is_isolated:
        score -= 20
        factors.append("Isolated/poorly lit road (-20)")

    report_penalty = min(unsafe_report_count * 5, 25)
    if report_penalty > 0:
        score -= report_penalty
        factors.append(f"{unsafe_report_count} unsafe reports (-{report_penalty})")

    # Nighttime penalty
    is_night = _is_nighttime(current_hour)
    if is_night:
        score -= 15
        factors.append("Nighttime travel (-15)")

    score = int(clamp(score, 0, 100))

    label = _score_to_label(score)
    return {"score": score, "label": label, "factors": factors, "is_nighttime": is_night}


def _score_to_label(score: int) -> str:
    """Convert numeric score to human-readable safety label."""
    if score >= ROUTE_SAFE_THRESHOLD:
        return "Safe"
    if score >= ROUTE_MODERATE_THRESHOLD:
        return "Moderate"
    return "Unsafe"


def _is_nighttime(hour: int) -> bool:
    """Return True if the given hour falls in the configured nighttime window."""
    if NIGHT_START_HOUR < NIGHT_END_HOUR:
        return NIGHT_START_HOUR <= hour < NIGHT_END_HOUR
    # Wraps around midnight (e.g., 20:00 – 06:00)
    return hour >= NIGHT_START_HOUR or hour < NIGHT_END_HOUR


# ── Threat Score → Risk Level ─────────────────────────────────────────────────

def threat_score_to_risk(score: int) -> str:
    """
    Map a raw threat score (accumulated keyword points) to a risk level label.

    Args:
        score: Accumulated keyword-match score.

    Returns:
        One of RISK_LOW, RISK_MEDIUM, RISK_HIGH.
    """
    if score >= THREAT_THRESHOLD_HIGH:
        return RISK_HIGH
    if score >= THREAT_THRESHOLD_MEDIUM:
        return RISK_MEDIUM
    return RISK_LOW
