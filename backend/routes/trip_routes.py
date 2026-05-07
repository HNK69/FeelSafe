"""
routes/trip_routes.py
======================
Blueprint: Trip lifecycle management.

Endpoints:
    POST /api/start-trip
    POST /api/end-trip
    POST /api/check-deviation
    GET  /api/trip/<trip_id>
"""

from flask import Blueprint, request, jsonify
from services.trip_service import (
    start_trip,
    end_trip,
    get_trip_by_id,
    check_deviation,
    get_active_trips,
)
from utils.helpers import error_response, require_fields

trip_bp = Blueprint("trip", __name__)


# ── Start Trip ────────────────────────────────────────────────────────────────
@trip_bp.route("/start-trip", methods=["POST"])
def api_start_trip():
    """
    Start a new monitored trip.

    Request body (JSON):
        {
            "origin_lat":   28.6315,
            "origin_lon":   77.2167,
            "dest_lat":     28.5677,
            "dest_lon":     77.2433,
            "origin_name":  "Connaught Place",   (optional)
            "dest_name":    "Lajpat Nagar",       (optional)
            "user_id":      1                     (optional)
        }

    Response (JSON):
        Trip record with ETA in minutes.
    """
    data    = request.get_json(silent=True) or {}
    missing = require_fields(data, ["origin_lat", "origin_lon", "dest_lat", "dest_lon"])
    if missing:
        return jsonify(error_response(f"Missing required field: '{missing}'")[0]), 400

    try:
        trip = start_trip(
            origin_lat  = float(data["origin_lat"]),
            origin_lon  = float(data["origin_lon"]),
            dest_lat    = float(data["dest_lat"]),
            dest_lon    = float(data["dest_lon"]),
            origin_name = data.get("origin_name", "Origin"),
            dest_name   = data.get("dest_name",   "Destination"),
            user_id     = data.get("user_id"),
        )
    except (ValueError, TypeError) as e:
        return jsonify(error_response(f"Invalid coordinate values: {e}")[0]), 400

    return jsonify({"success": True, "trip": trip}), 201


# ── End Trip ──────────────────────────────────────────────────────────────────
@trip_bp.route("/end-trip", methods=["POST"])
def api_end_trip():
    """
    End an active trip.

    Request body (JSON):
        { "trip_id": 1 }

    Response (JSON):
        Updated trip record with ended_at timestamp.
    """
    data    = request.get_json(silent=True) or {}
    missing = require_fields(data, ["trip_id"])
    if missing:
        return jsonify(error_response(f"Missing required field: '{missing}'")[0]), 400

    try:
        trip_id = int(data["trip_id"])
    except (ValueError, TypeError):
        return jsonify(error_response("'trip_id' must be an integer.")[0]), 400

    result = end_trip(trip_id)
    if "error" in result:
        return jsonify({"success": False, **result}), 404

    return jsonify({"success": True, "trip": result}), 200


# ── Check Route Deviation ─────────────────────────────────────────────────────
@trip_bp.route("/check-deviation", methods=["POST"])
def api_check_deviation():
    """
    Check whether the user is still on their planned route.

    Request body (JSON):
        {
            "trip_id":     1,
            "current_lat": 28.6200,
            "current_lon": 77.2300
        }

    Response (JSON):
        {
            "off_route":                    true,
            "message":                      "⚠️ Route deviation detected!",
            "distance_from_destination_km": 4.2,
            "remaining_eta_minutes":        8.5
        }
    """
    data    = request.get_json(silent=True) or {}
    missing = require_fields(data, ["trip_id", "current_lat", "current_lon"])
    if missing:
        return jsonify(error_response(f"Missing required field: '{missing}'")[0]), 400

    try:
        result = check_deviation(
            trip_id     = int(data["trip_id"]),
            current_lat = float(data["current_lat"]),
            current_lon = float(data["current_lon"]),
        )
    except (ValueError, TypeError) as e:
        return jsonify(error_response(f"Invalid values: {e}")[0]), 400

    if "error" in result:
        return jsonify({"success": False, **result}), 404

    return jsonify({"success": True, **result}), 200


# ── Get Trip ──────────────────────────────────────────────────────────────────
@trip_bp.route("/trip/<int:trip_id>", methods=["GET"])
def api_get_trip(trip_id: int):
    """Fetch a trip record by ID."""
    trip = get_trip_by_id(trip_id)
    if not trip:
        return jsonify(error_response(f"Trip {trip_id} not found.")[0]), 404
    return jsonify({"success": True, "trip": trip}), 200


# ── Get Active Trips ──────────────────────────────────────────────────────────
@trip_bp.route("/active-trips", methods=["GET"])
def api_active_trips():
    """Return all currently active trips (optionally filter by user_id query param)."""
    user_id = request.args.get("user_id", type=int)
    trips   = get_active_trips(user_id)
    return jsonify({"success": True, "trips": trips, "count": len(trips)}), 200


# ── Trip History ──────────────────────────────────────────────────────────────
@trip_bp.route("/trip-history", methods=["GET"])
def api_trip_history():
    """
    Return completed (ENDED) trips for a user, most recent first.

    Query params:
        user_id (int, default 1)
        limit   (int, default 10)
    """
    user_id = request.args.get("user_id", 1, type=int)
    limit   = request.args.get("limit", 10, type=int)
    from services.trip_service import get_trip_history
    trips = get_trip_history(user_id, limit)
    return jsonify({"success": True, "trips": trips, "count": len(trips)}), 200
