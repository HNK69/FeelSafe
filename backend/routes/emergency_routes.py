"""
routes/emergency_routes.py
===========================
Blueprint: SOS emergency alert and escalation.

Endpoints:
    POST /api/emergency-alert
    POST /api/emergency-retry
"""

from flask import Blueprint, request, jsonify
from services.emergency_service import trigger_emergency, get_retry_escalation
from utils.helpers import error_response, require_fields

emergency_bp = Blueprint("emergency", __name__)


# ── Trigger Emergency Alert ───────────────────────────────────────────────────
@emergency_bp.route("/emergency-alert", methods=["POST"])
def api_emergency_alert():
    """
    Trigger a SOS emergency alert.

    Request body (JSON):
        {
            "lat":           28.6315,
            "lon":           77.2167,
            "trip_id":       1,           (optional)
            "user_id":       1,           (optional)
            "contact_phone": "+919876543210", (optional)
            "user_name":     "Priya"      (optional)
        }

    Response (JSON):
        {
            "alert_id":         1,
            "escalation_level": 1,
            "whatsapp_link":    "https://wa.me/?text=...",
            "emergency_numbers": { "police": "100", ... },
            "nearby_police":    [...],
            "nearby_hospitals": [...],
            "should_retry":     true,
            "retry_in_seconds": 30,
            ...
        }
    """
    data    = request.get_json(silent=True) or {}
    missing = require_fields(data, ["lat", "lon"])
    if missing:
        return jsonify(error_response(f"Missing required field: '{missing}'")[0]), 400

    try:
        result = trigger_emergency(
            lat           = float(data["lat"]),
            lon           = float(data["lon"]),
            trip_id       = data.get("trip_id"),
            user_id       = data.get("user_id"),
            contact_phone = data.get("contact_phone"),
            user_name     = data.get("user_name", "FeelSafe User"),
            retry_attempt = 1,
        )
    except (ValueError, TypeError) as e:
        return jsonify(error_response(f"Invalid coordinate values: {e}")[0]), 400

    return jsonify({"success": True, **result}), 200


# ── Retry Emergency (Escalation) ──────────────────────────────────────────────
@emergency_bp.route("/emergency-retry", methods=["POST"])
def api_emergency_retry():
    """
    Retry / escalate an unanswered emergency alert.

    Request body (JSON):
        {
            "lat":              28.6315,
            "lon":              77.2167,
            "previous_attempt": 1,
            "trip_id":          1,           (optional)
            "user_id":          1,           (optional)
            "contact_phone":    "+919876543210" (optional)
        }

    Response:
        Same structure as /emergency-alert but with incremented escalation_level.
    """
    data    = request.get_json(silent=True) or {}
    missing = require_fields(data, ["lat", "lon", "previous_attempt"])
    if missing:
        return jsonify(error_response(f"Missing required field: '{missing}'")[0]), 400

    try:
        result = get_retry_escalation(
            lat              = float(data["lat"]),
            lon              = float(data["lon"]),
            previous_attempt = int(data["previous_attempt"]),
            trip_id          = data.get("trip_id"),
            user_id          = data.get("user_id"),
            contact_phone    = data.get("contact_phone"),
            user_name        = data.get("user_name", "FeelSafe User"),
        )
    except (ValueError, TypeError) as e:
        return jsonify(error_response(f"Invalid values: {e}")[0]), 400

    return jsonify({"success": True, **result}), 200
