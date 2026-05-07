"""
routes/saferoute_routes.py
===========================
Blueprint: SafeRoute AI and Community Safety Intelligence.

Endpoints:
    POST /api/safest-route
    POST /api/submit-route-feedback
    GET  /api/route-stats/<route_id>
"""

from flask import Blueprint, request, jsonify
from services.saferoute_service import get_safest_route, score_custom_route
from models.feedback_model import submit_feedback, get_route_stats, get_all_feedback_for_route
from utils.helpers import error_response, require_fields

saferoute_bp = Blueprint("saferoute", __name__)


# ── Get Safest Route ──────────────────────────────────────────────────────────
@saferoute_bp.route("/safest-route", methods=["POST"])
def api_safest_route():
    """
    Calculate and return the safest route from origin to destination.

    Request body (JSON):
        {
            "origin_lat": 28.6315,
            "origin_lon": 77.2167,
            "dest_lat":   28.5677,
            "dest_lon":   77.2433
        }

    Response (JSON):
        {
            "safest_route": {
                "id":             "route_004",
                "name":           "Saket to Hauz Khas Safe Route",
                "safety_score":   85,
                "safety_label":   "Safe",
                "safety_factors": ["Police station nearby (+25)", ...],
                "is_nighttime":   false,
                ...
            },
            "all_routes_ranked": [...],
            "explanation": "The safest route is ..."
        }
    """
    data    = request.get_json(silent=True) or {}
    missing = require_fields(data, ["origin_lat", "origin_lon", "dest_lat", "dest_lon"])
    if missing:
        return jsonify(error_response(f"Missing required field: '{missing}'")[0]), 400

    try:
        result = get_safest_route(
            origin_lat = float(data["origin_lat"]),
            origin_lon = float(data["origin_lon"]),
            dest_lat   = float(data["dest_lat"]),
            dest_lon   = float(data["dest_lon"]),
        )
    except (ValueError, TypeError) as e:
        return jsonify(error_response(f"Invalid coordinate values: {e}")[0]), 400

    return jsonify({"success": True, **result}), 200


# ── Score a Custom Route Segment ──────────────────────────────────────────────
@saferoute_bp.route("/score-route", methods=["POST"])
def api_score_route():
    """
    Score a custom route segment (e.g. from OSRM) using the safety engine.

    Request body (JSON):
        {
            "mid_lat":            28.5450,
            "mid_lon":            77.2070,
            "is_isolated":        false,
            "community_rating":   4.1,
            "unsafe_report_count": 0,
            "route_id":           "custom_001"   (optional, to fetch community DB stats)
        }
    """
    data    = request.get_json(silent=True) or {}
    missing = require_fields(data, ["mid_lat", "mid_lon"])
    if missing:
        return jsonify(error_response(f"Missing required field: '{missing}'")[0]), 400

    try:
        result = score_custom_route(
            mid_lat             = float(data["mid_lat"]),
            mid_lon             = float(data["mid_lon"]),
            is_isolated         = bool(data.get("is_isolated", False)),
            community_rating    = float(data.get("community_rating", 3.0)),
            unsafe_report_count = int(data.get("unsafe_report_count", 0)),
            route_id            = data.get("route_id"),
        )
    except (ValueError, TypeError) as e:
        return jsonify(error_response(f"Invalid values: {e}")[0]), 400

    return jsonify({"success": True, **result}), 200


# ── Submit Community Route Feedback ──────────────────────────────────────────
@saferoute_bp.route("/submit-route-feedback", methods=["POST"])
def api_submit_feedback():
    """
    Submit a community safety rating or unsafe report for a route.

    Request body (JSON):
        {
            "route_id":        "route_001",
            "rating":          4.0,
            "is_unsafe_report": false,
            "comment":         "Well lit and busy road",   (optional)
            "lat":             28.6315,                    (optional)
            "lon":             77.2167,                    (optional)
            "user_id":         1                           (optional)
        }

    Response (JSON):
        {
            "feedback":     { ... created record ... },
            "route_stats":  { "avg_rating": 4.0, "total_ratings": 12, ... }
        }
    """
    data    = request.get_json(silent=True) or {}
    missing = require_fields(data, ["route_id", "rating"])
    if missing:
        return jsonify(error_response(f"Missing required field: '{missing}'")[0]), 400

    try:
        rating = float(data["rating"])
    except (ValueError, TypeError):
        return jsonify(error_response("'rating' must be a number between 0 and 5.")[0]), 400

    if not (0.0 <= rating <= 5.0):
        return jsonify(error_response("'rating' must be between 0.0 and 5.0.")[0]), 400

    feedback = submit_feedback(
        route_id         = str(data["route_id"]),
        rating           = rating,
        is_unsafe_report = bool(data.get("is_unsafe_report", False)),
        comment          = data.get("comment"),
        lat              = data.get("lat"),
        lon              = data.get("lon"),
        user_id          = data.get("user_id"),
    )

    # Return updated aggregate stats alongside the created record
    stats = get_route_stats(str(data["route_id"]))

    return jsonify({
        "success":     True,
        "message":     "Feedback submitted. Thank you for keeping the community safe!",
        "feedback":    feedback,
        "route_stats": stats,
    }), 201


# ── Get Route Community Stats ─────────────────────────────────────────────────
@saferoute_bp.route("/route-stats/<route_id>", methods=["GET"])
def api_route_stats(route_id: str):
    """
    Retrieve aggregated community safety stats for a route.

    Path parameter:
        route_id: The route identifier string.

    Response (JSON):
        {
            "route_id":           "route_001",
            "avg_rating":         4.1,
            "total_ratings":      12,
            "unsafe_report_count": 1
        }
    """
    stats    = get_route_stats(route_id)
    feedback = get_all_feedback_for_route(route_id)
    return jsonify({
        "success":         True,
        "route_stats":     stats,
        "feedback_list":   feedback,
    }), 200
