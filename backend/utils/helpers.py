"""
utils/helpers.py
================
General-purpose helper utilities used across the FeelSafe backend.
"""

import re
import math
from datetime import datetime, timezone


# ── Text Normalisation ────────────────────────────────────────────────────────

def normalise_text(text: str) -> str:
    """
    Lowercase and strip punctuation from text for keyword matching.
    Example: "Someone's following ME!" → "someones following me"
    """
    text = text.lower()
    text = re.sub(r"[^\w\s]", " ", text)   # replace punctuation with space
    text = re.sub(r"\s+", " ", text).strip()
    return text


# ── Timestamp Helpers ─────────────────────────────────────────────────────────

def utc_now_str() -> str:
    """Return current UTC time as an ISO-8601 string."""
    return datetime.now(timezone.utc).isoformat()


def current_hour_utc() -> int:
    """Return current UTC hour (0-23)."""
    return datetime.now(timezone.utc).hour


def current_hour_local() -> int:
    """Return current local hour (0-23) using system timezone."""
    return datetime.now().hour


# ── Response Builders ─────────────────────────────────────────────────────────

def success_response(data: dict, status_code: int = 200):
    """
    Wrap a data dict in a standard FeelSafe success envelope.
    Usage:
        return success_response({"key": "value"})
    """
    return {"success": True, **data}, status_code


def error_response(message: str, status_code: int = 400):
    """
    Wrap an error message in a standard FeelSafe error envelope.
    Usage:
        return error_response("Missing field: text", 400)
    """
    return {"success": False, "error": message}, status_code


# ── Input Validation ──────────────────────────────────────────────────────────

def require_fields(data: dict, fields: list) -> str | None:
    """
    Check that all required fields are present in the incoming JSON dict.
    Returns the name of the first missing field, or None if all present.
    """
    for field in fields:
        if field not in data or data[field] is None:
            return field
    return None


def clamp(value: float, min_val: float, max_val: float) -> float:
    """Clamp a numeric value between min_val and max_val."""
    return max(min_val, min(max_val, value))
