"""
utils/constants.py
==================
Central place for all FeelSafe constants.
Import from here; never hard-code values in route/service files.
"""

# ── Emergency Contact Numbers ─────────────────────────────────────────────────
EMERGENCY_NUMBERS = {
    "police":       "100",
    "ambulance":    "108",
    "women_helpline": "1091",
    "child_helpline": "1098",
    "fire":         "101",
    "national_emergency": "112",
}

# ── Risk Level Labels ─────────────────────────────────────────────────────────
RISK_LOW    = "LOW"
RISK_MEDIUM = "MEDIUM"
RISK_HIGH   = "HIGH"

# ── Threat Score Thresholds ───────────────────────────────────────────────────
# Points are accumulated per keyword match; final score mapped to risk level.
THREAT_THRESHOLD_HIGH   = 3   # >= 3 points → HIGH
THREAT_THRESHOLD_MEDIUM = 1   # >= 1 point  → MEDIUM
                              # < 1 point   → LOW

# ── Route Safety Score Thresholds ────────────────────────────────────────────
# Scores are 0-100 (higher = safer).
ROUTE_SAFE_THRESHOLD    = 65  # >= 65 → "Safe"
ROUTE_MODERATE_THRESHOLD = 40  # 40-64 → "Moderate"
                               # < 40  → "Unsafe"

# ── ETA Constants ─────────────────────────────────────────────────────────────
AVERAGE_SPEED_KMPH = 30   # Assumed average urban travel speed (km/h)

# ── Unsafe Zone Radius ────────────────────────────────────────────────────────
UNSAFE_ZONE_RADIUS_KM = 0.5   # Distance within which a zone is "nearby"

# ── Emergency Escalation ──────────────────────────────────────────────────────
MAX_RETRY_ATTEMPTS  = 3
RETRY_INTERVAL_SECS = 30   # Seconds between retry attempts

# ── Default Messages ──────────────────────────────────────────────────────────
DEFAULT_SAFE_MESSAGE      = "You appear to be safe. Stay alert."
DEFAULT_MEDIUM_MESSAGE    = "Potential risk detected. Please stay cautious."
DEFAULT_HIGH_MESSAGE      = "Danger detected! Take immediate action."
DEFAULT_EMERGENCY_MESSAGE = (
    "🚨 EMERGENCY ALERT from FeelSafe!\n"
    "I need help. Please contact me or call emergency services immediately.\n"
    "My current location: {location}\n"
    "Time: {time}"
)

# ── Nighttime Range (24-hour) ─────────────────────────────────────────────────
NIGHT_START_HOUR = 20   # 8 PM
NIGHT_END_HOUR   = 6    # 6 AM
