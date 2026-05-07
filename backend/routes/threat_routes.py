"""
routes/threat_routes.py
========================
Blueprint: POST /api/analyze-threat
Now also triggers automatic escalation for MEDIUM/HIGH risk.
"""

from flask import Blueprint, request, jsonify
from services.threat_service    import analyse_threat
from services.emergency_service import trigger_auto_escalation
from utils.helpers import error_response, require_fields

threat_bp = Blueprint("threat", __name__)


@threat_bp.route("/analyze-threat", methods=["POST"])
def analyze_threat():
    """
    Analyse a user message for safety threats.
    Automatically escalates to emergency contacts for MEDIUM/HIGH risk.

    Request body:
        {
            "text":       "Someone is following me",
            "lat":        28.6315,          (optional, for auto-escalation)
            "lon":        77.2167,          (optional)
            "user_id":    1,                (optional)
            "user_name":  "Priya",          (optional)
            "trip_id":    1                 (optional)
        }

    Response:
        {
            "risk_level":         "HIGH",
            "message":            "Danger detected!",
            "score":              7,
            "matched_keywords":   [...],
            "action_tips":        [...],
            "auto_escalated":     true,
            "escalation_result":  { ... }   (if auto-escalated)
        }
    """
    data    = request.get_json(silent=True) or {}
    missing = require_fields(data, ["text"])
    if missing:
        return jsonify(error_response(f"Missing required field: '{missing}'")[0]), 400

    text = str(data["text"]).strip()
    if not text:
        return jsonify(error_response("Field 'text' must not be empty.")[0]), 400

    # ── Threat analysis ───────────────────────────────────────────────────────
    result      = analyse_threat(text)
    risk_level  = result["risk_level"]

    # ── Automatic escalation for MEDIUM / HIGH ────────────────────────────────
    escalation_result = None
    auto_escalated    = False

    lat = data.get("lat")
    lon = data.get("lon")

    if risk_level in ("MEDIUM", "HIGH") and lat is not None and lon is not None:
        try:
            escalation_result = trigger_auto_escalation(
                lat=float(lat),
                lon=float(lon),
                risk_level=risk_level,
                threat_text=text,
                user_id=int(data.get("user_id", 1)),
                user_name=str(data.get("user_name", "FeelSafe User")),
                trip_id=data.get("trip_id"),
            )
            auto_escalated = escalation_result is not None
        except Exception as e:
            print(f"[ThreatRoute] Auto-escalation failed: {e}")

    return jsonify({
        "success":           True,
        **result,
        "auto_escalated":    auto_escalated,
        "escalation_result": escalation_result,
    }), 200
