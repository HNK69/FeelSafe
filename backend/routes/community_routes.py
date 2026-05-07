"""
routes/community_routes.py
===========================
Blueprint: Live community intelligence feed and safety stats.

Endpoints:
    GET /api/community/feed
    GET /api/community/stats
"""

from flask import Blueprint, request, jsonify
from services.community_service import get_live_feed, get_safety_stats

community_bp = Blueprint("community", __name__)


@community_bp.route("/community/feed", methods=["GET"])
def api_community_feed():
    """
    Return the live community safety event feed.

    Query params:
        limit (int, default 10): Max events to return.
    """
    limit = request.args.get("limit", 10, type=int)
    feed  = get_live_feed(limit=limit)
    return jsonify({"success": True, "feed": feed, "count": len(feed)}), 200


@community_bp.route("/community/stats", methods=["GET"])
def api_community_stats():
    """
    Return real-time safety stats from the database.

    Query params:
        user_id (int, default 1)
    """
    user_id = request.args.get("user_id", 1, type=int)
    stats   = get_safety_stats(user_id)
    return jsonify({"success": True, "stats": stats}), 200
