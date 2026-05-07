"""
routes/recording_routes.py
===========================
Blueprint: Audio recording playback system.

Endpoints:
    GET /api/recordings/<trip_id>   — list all recordings for a trip
    GET /api/recordings/user/<uid>  — recent recordings for a user
"""

import os
from flask import Blueprint, jsonify, request

from models.recording_model import get_recordings_for_trip, get_recordings_for_user

recording_bp = Blueprint("recording", __name__)

# Build public URL prefix for serving audio files
# Flask serves uploads/ as a static folder (configured in app.py)
AUDIO_URL_PREFIX = "http://localhost:5000/uploads/audio"


def _enrich_recording(rec: dict) -> dict:
    """Add audio_url to a recording dict."""
    rec["audio_url"] = f"{AUDIO_URL_PREFIX}/{rec['filename']}"
    return rec


@recording_bp.route("/recordings/<int:trip_id>", methods=["GET"])
def api_recordings_for_trip(trip_id: int):
    """
    Return all audio recordings linked to a trip.

    Response:
        {
            "success": true,
            "recordings": [
                {
                    "id": 1,
                    "filename": "1715000000_user1.webm",
                    "audio_url": "http://localhost:5000/uploads/audio/...",
                    "transcript": "Someone is following me...",
                    "threat_level": "HIGH",
                    "recorded_at": "2025-05-07T..."
                }
            ],
            "count": 1
        }
    """
    recordings = get_recordings_for_trip(trip_id)
    enriched   = [_enrich_recording(r) for r in recordings]
    return jsonify({
        "success":    True,
        "recordings": enriched,
        "count":      len(enriched),
        "trip_id":    trip_id,
    }), 200


@recording_bp.route("/recordings/user/<int:user_id>", methods=["GET"])
def api_recordings_for_user(user_id: int):
    """Return the most recent recordings for a user across all trips."""
    limit      = request.args.get("limit", 10, type=int)
    recordings = get_recordings_for_user(user_id, limit=limit)
    enriched   = [_enrich_recording(r) for r in recordings]
    return jsonify({
        "success":    True,
        "recordings": enriched,
        "count":      len(enriched),
        "user_id":    user_id,
    }), 200
