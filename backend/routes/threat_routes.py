"""
routes/threat_routes.py
========================
Blueprint: POST /api/analyze-threat
Analyses free-text input and returns a risk assessment.
"""

from flask import Blueprint, request, jsonify
from services.threat_service import analyse_threat
from utils.helpers import error_response, require_fields

threat_bp = Blueprint("threat", __name__)


@threat_bp.route("/analyze-threat", methods=["POST"])
def analyze_threat():
    """
    Analyse a user's message for safety threats.

    Request body (JSON):
        {
            "text": "Someone is following me"
        }

    Response (JSON):
        {
            "risk_level":       "HIGH",
            "message":          "Danger detected! Take immediate action.",
            "score":            4,
            "matched_keywords": ["following me", "someone following"],
            "action_tips":      ["Call 112...", ...]
        }
    """
    data = request.get_json(silent=True) or {}

    # Validate required fields
    missing = require_fields(data, ["text"])
    if missing:
        return jsonify(error_response(f"Missing required field: '{missing}'")[0]), 400

    text = str(data["text"]).strip()
    if not text:
        return jsonify(error_response("Field 'text' must not be empty.")[0]), 400

    result = analyse_threat(text)
    return jsonify({"success": True, **result}), 200
