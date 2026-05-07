"""
routes/emergency_routes.py
===========================
Blueprint: SOS emergency alert and retry escalation.
Now supports automatic contact lookup from DB and threat context.

Endpoints:
    POST /api/emergency-alert
    POST /api/emergency-retry
"""

from flask import Blueprint, request, jsonify
from services.emergency_service import trigger_emergency, get_retry_escalation
from utils.helpers import error_response, require_fields

emergency_bp = Blueprint("emergency", __name__)


@emergency_bp.route("/emergency-alert", methods=["POST"])
def api_emergency_alert():
    """
    Trigger a full SOS emergency alert.

    Body:
        {
            "lat":          28.6315,
            "lon":          77.2167,
            "user_id":      1,           (optional, enables auto-contact lookup)
            "user_name":    "Priya",     (optional)
            "trip_id":      1,           (optional)
            "contact_phone":"...",       (optional override)
            "risk_level":   "HIGH",      (optional, default HIGH)
            "threat_text":  "..."        (optional, for WA message context)
        }
    """
    data    = request.get_json(silent=True) or {}
    missing = require_fields(data, ["lat", "lon"])
    if missing:
        return jsonify(error_response(f"Missing field: '{missing}'")[0]), 400

    try:
        lat = float(data["lat"])
        lon = float(data["lon"])
    except (ValueError, TypeError):
        return jsonify(error_response("'lat' and 'lon' must be valid numbers.")[0]), 400

    result = trigger_emergency(
        lat           = lat,
        lon           = lon,
        trip_id       = data.get("trip_id"),
        user_id       = data.get("user_id"),
        contact_phone = data.get("contact_phone"),
        user_name     = data.get("user_name", "FeelSafe User"),
        retry_attempt = 1,
        risk_level    = data.get("risk_level", "HIGH"),
        threat_text   = data.get("threat_text", ""),
    )

    return jsonify({"success": True, **result}), 200


@emergency_bp.route("/emergency-retry", methods=["POST"])
def api_emergency_retry():
    """
    Retry/escalate an unanswered emergency.

    Body:
        {
            "lat":              28.6315,
            "lon":              77.2167,
            "previous_attempt": 1,
            "user_id":          1,
            "contact_phone":    "..."
        }
    """
    data    = request.get_json(silent=True) or {}
    missing = require_fields(data, ["lat", "lon", "previous_attempt"])
    if missing:
        return jsonify(error_response(f"Missing field: '{missing}'")[0]), 400

    try:
        lat      = float(data["lat"])
        lon      = float(data["lon"])
        attempt  = int(data["previous_attempt"])
    except (ValueError, TypeError):
        return jsonify(error_response("Invalid numeric field.")[0]), 400

    result = get_retry_escalation(
        lat              = lat,
        lon              = lon,
        previous_attempt = attempt,
        trip_id          = data.get("trip_id"),
        user_id          = data.get("user_id"),
        contact_phone    = data.get("contact_phone"),
        user_name        = data.get("user_name", "FeelSafe User"),
    )

    return jsonify({"success": True, **result}), 200
