"""
routes/saferoute_routes.py
===========================
Blueprint: SafeRoute AI — now returns all route options (safest/shortest/alternative).

Endpoints:
    POST /api/safest-route          ← returns ALL ranked routes
    POST /api/score-route
    POST /api/submit-route-feedback
    GET  /api/route-stats/<route_id>
"""

from flask import Blueprint, request, jsonify
from services.saferoute_service import get_safest_route, score_custom_route, get_route_danger_segments
from models.feedback_model import submit_feedback, get_route_stats, get_all_feedback_for_route
from utils.helpers import error_response, require_fields

saferoute_bp = Blueprint("saferoute", __name__)


@saferoute_bp.route("/safest-route", methods=["POST"])
def api_safest_route():
    """
    Compute and return all route options ranked by safety.

    Request body:
        {
            "origin_lat": 28.6315,
            "origin_lon": 77.2167,
            "dest_lat":   28.5677,
            "dest_lon":   77.2433,
            "origin_name": "Connaught Place",  (optional)
            "dest_name":   "Lajpat Nagar"      (optional)
        }

    Response:
        {
            "safest_route":         { ...route with safety_score, explanation },
            "shortest_route":       { ...route with distance_km },
            "alternative_routes":   [ ...other ranked routes ],
            "all_routes_ranked":    [ ...all routes sorted by safety ],
            "explanation":          "AI explanation string",
            "route_count":          int
        }
    """
    data    = request.get_json(silent=True) or {}
    missing = require_fields(data, ["origin_lat", "origin_lon", "dest_lat", "dest_lon"])
    if missing:
        return jsonify(error_response(f"Missing field: '{missing}'")[0]), 400

    origin_lat = float(data["origin_lat"])
    origin_lon = float(data["origin_lon"])
    dest_lat   = float(data["dest_lat"])
    dest_lon   = float(data["dest_lon"])

    try:
        result = get_safest_route(origin_lat, origin_lon, dest_lat, dest_lon)
    except (ValueError, TypeError) as e:
        return jsonify(error_response(f"Invalid coordinates: {e}")[0]), 400

    all_routes = result.get("all_routes_ranked", [])

    # ── Identify shortest route ───────────────────────────────────────────────
    shortest_route = None
    if all_routes:
        by_distance   = sorted(all_routes, key=lambda r: r.get("distance_km", 9999))
        shortest_route = by_distance[0] if by_distance else None

    # Alternative routes = everything except the safest (top)
    alternative_routes = all_routes[1:] if len(all_routes) > 1 else []

    # Annotate each route with danger_segments for MapView
    for r in all_routes:
        r['danger_segments'] = get_route_danger_segments(r)

    # ── Corridor-based safety anchors (fetched ONCE, stored in response) ─────
    # Sample 4 equidistant points along src→dest corridor, collect unique anchors
    from services.anchor_service import get_safety_anchors as _get_anchors

    best_route = result.get("safest_route", {})
    corridor_pts = [
        (origin_lat, origin_lon),
        (origin_lat + (dest_lat - origin_lat) * 0.33,
         origin_lon + (dest_lon - origin_lon) * 0.33),
        (origin_lat + (dest_lat - origin_lat) * 0.66,
         origin_lon + (dest_lon - origin_lon) * 0.66),
        (dest_lat, dest_lon),
    ]
    # Also include any route waypoints
    for wp in (best_route.get("waypoints") or [])[:3]:
        if isinstance(wp, dict) and "lat" in wp:
            corridor_pts.append((wp["lat"], wp["lon"]))

    seen_ids   = set()   # deduplicate by "name|type"
    flat_list  = []
    for clat, clon in corridor_pts:
        try:
            res = _get_anchors(clat, clon, radius_m=3000, max_per_type=3)
            for cat, items in (res.get("anchors") or {}).items():
                for item in items:
                    uid = f"{item.get('name','?')}|{cat}"
                    if uid not in seen_ids:
                        seen_ids.add(uid)
                        flat_list.append({**item, "category": cat})
        except Exception:
            pass

    # Sort by distance for display
    flat_list.sort(key=lambda x: x.get("distance_km", 99))

    return jsonify({
        "success":            True,
        "safest_route":       result.get("safest_route"),
        "shortest_route":     shortest_route,
        "alternative_routes": alternative_routes,
        "all_routes_ranked":  all_routes,
        "explanation":        result.get("explanation", ""),
        "route_count":        len(all_routes),
        "route_anchors":      flat_list,   # ← pre-computed, no second API call needed
    }), 200



@saferoute_bp.route("/score-route", methods=["POST"])
def api_score_route():
    """Score a custom route segment by midpoint coordinates."""
    data    = request.get_json(silent=True) or {}
    missing = require_fields(data, ["mid_lat", "mid_lon"])
    if missing:
        return jsonify(error_response(f"Missing field: '{missing}'")[0]), 400

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


@saferoute_bp.route("/submit-route-feedback", methods=["POST"])
def api_submit_feedback():
    """Submit a community safety rating or unsafe report."""
    data    = request.get_json(silent=True) or {}
    missing = require_fields(data, ["route_id", "rating"])
    if missing:
        return jsonify(error_response(f"Missing field: '{missing}'")[0]), 400

    try:
        rating = float(data["rating"])
    except (ValueError, TypeError):
        return jsonify(error_response("'rating' must be a number 0–5.")[0]), 400

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
    stats = get_route_stats(str(data["route_id"]))

    return jsonify({
        "success":     True,
        "message":     "Feedback submitted. Thank you for keeping the community safe!",
        "feedback":    feedback,
        "route_stats": stats,
    }), 201


@saferoute_bp.route("/route-stats/<route_id>", methods=["GET"])
def api_route_stats(route_id: str):
    """Get aggregated community stats for a route."""
    stats    = get_route_stats(route_id)
    feedback = get_all_feedback_for_route(route_id)
    return jsonify({
        "success":       True,
        "route_stats":   stats,
        "feedback_list": feedback,
    }), 200
