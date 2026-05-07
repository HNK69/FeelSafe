"""
routes/anchor_routes.py
========================
Blueprint: AI Safety Companion Mode — nearby safety points of interest.

Endpoints:
    POST /api/safety-anchors    — find nearby police/hospital/pharmacy/supermarket
    GET  /api/safety-anchors    — same, with lat/lon as query params
"""

from flask import Blueprint, request, jsonify
from services.anchor_service import get_safety_anchors
from utils.helpers import error_response

anchor_bp = Blueprint("anchor", __name__)


@anchor_bp.route("/safety-anchors", methods=["POST", "GET"])
def api_safety_anchors():
    """
    Find nearby safety anchors using OpenStreetMap Overpass API.

    POST body OR GET query params:
        lat      (float) — required
        lon      (float) — required
        radius_m (int)   — optional, default 1000 (1 km)

    Response:
        {
            "success": true,
            "anchors": {
                "police":      [ { name, lat, lon, distance_km, icon, color, phone? } ],
                "hospital":    [ ... ],
                "pharmacy":    [ ... ],
                "supermarket": [ ... ]
            },
            "total_found":        int,
            "nearest_police_km":  float | null,
            "nearest_hospital_km": float | null,
            "search_radius_m":    int,
            "center":             { "lat": float, "lon": float }
        }
    """
    if request.method == "POST":
        data = request.get_json(silent=True) or {}
    else:
        data = request.args

    try:
        lat = float(data.get("lat", 0) or 0)
        lon = float(data.get("lon", 0) or 0)
    except (ValueError, TypeError):
        return jsonify(error_response("'lat' and 'lon' must be valid floats.")[0]), 400

    if lat == 0 and lon == 0:
        return jsonify(error_response("'lat' and 'lon' are required.")[0]), 400

    try:
        radius_m = int(data.get("radius_m", 1000))
        radius_m = max(200, min(radius_m, 5000))   # clamp 200m – 5 km
    except (ValueError, TypeError):
        radius_m = 1000

    try:
        result = get_safety_anchors(lat, lon, radius_m=radius_m)
    except Exception as e:
        return jsonify({
            "success":      False,
            "error":        str(e),
            "anchors":      {},
            "total_found":  0,
        }), 200    # Return 200 so frontend can gracefully degrade

    return jsonify({
        "success": True,
        **result,
    }), 200


@anchor_bp.route("/trip-detailed-feedback", methods=["POST"])
def api_trip_detailed_feedback():
    """
    Submit extended post-trip feedback with multi-dimensional ratings.

    Request body:
        {
            "trip_id":              int (required),
            "user_id":              int (optional),
            "safety_rating":        1-5,
            "lighting_rating":      1-5,
            "crowd_rating":         1-5,
            "incident_reported":    bool,
            "incident_description": str (optional)
        }
    """
    from models.trip_feedback_model import submit_trip_feedback
    from utils.helpers import require_fields

    data    = request.get_json(silent=True) or {}
    missing = require_fields(data, ["trip_id"])
    if missing:
        return jsonify(error_response(f"Missing field: '{missing}'")[0]), 400

    try:
        feedback = submit_trip_feedback(
            trip_id              = int(data["trip_id"]),
            user_id              = data.get("user_id"),
            safety_rating        = int(data.get("safety_rating",  3)),
            lighting_rating      = int(data.get("lighting_rating", 3)),
            crowd_rating         = int(data.get("crowd_rating",    3)),
            incident_reported    = bool(data.get("incident_reported", False)),
            incident_description = data.get("incident_description"),
        )
    except (ValueError, TypeError) as e:
        return jsonify(error_response(f"Invalid values: {e}")[0]), 400

    return jsonify({
        "success":  True,
        "message":  "Thank you! Your feedback improves route safety for everyone.",
        "feedback": feedback,
    }), 201
