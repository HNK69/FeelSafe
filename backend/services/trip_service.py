"""
services/trip_service.py
=========================
Handles trip lifecycle: creation, tracking, ETA, and completion.
Trips are persisted in SQLite via the trip_model.
"""

from datetime import datetime, timezone
from models.trip_model import get_connection
from utils.location_utils import estimate_eta_minutes, is_off_route
from utils.constants import AVERAGE_SPEED_KMPH
from utils.helpers import utc_now_str


# ── Create Trip ───────────────────────────────────────────────────────────────

def start_trip(
    origin_lat: float,
    origin_lon: float,
    dest_lat: float,
    dest_lon: float,
    origin_name: str = "Origin",
    dest_name: str = "Destination",
    user_id: int = None,
) -> dict:
    """
    Create a new ACTIVE trip and persist it to the database.

    Args:
        origin_lat, origin_lon: Starting coordinates.
        dest_lat,   dest_lon:   Destination coordinates.
        origin_name, dest_name: Human-readable place names (optional).
        user_id:                Linked user ID (optional).

    Returns:
        Created trip record as a dict.
    """
    eta_minutes = estimate_eta_minutes(
        origin_lat, origin_lon, dest_lat, dest_lon, AVERAGE_SPEED_KMPH
    )

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO trips
            (user_id, origin_lat, origin_lon, dest_lat, dest_lon,
             origin_name, dest_name, status, eta_minutes)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?)
        """,
        (user_id, origin_lat, origin_lon, dest_lat, dest_lon,
         origin_name, dest_name, eta_minutes),
    )
    conn.commit()
    trip_id = cursor.lastrowid
    conn.close()

    return get_trip_by_id(trip_id)


# ── End Trip ──────────────────────────────────────────────────────────────────

def end_trip(trip_id: int) -> dict:
    """
    Mark a trip as ENDED and record the completion timestamp.

    Args:
        trip_id: ID of the trip to end.

    Returns:
        Updated trip record, or error dict if not found.
    """
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        UPDATE trips
        SET status = 'ENDED', ended_at = ?
        WHERE id = ? AND status = 'ACTIVE'
        """,
        (utc_now_str(), trip_id),
    )
    conn.commit()
    updated = cursor.rowcount > 0
    conn.close()

    if not updated:
        return {"error": f"Trip {trip_id} not found or already ended."}

    return get_trip_by_id(trip_id)


# ── Get Trip ──────────────────────────────────────────────────────────────────

def get_trip_by_id(trip_id: int) -> dict | None:
    """Fetch a single trip record by ID."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM trips WHERE id = ?", (trip_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def get_active_trips(user_id: int = None) -> list:
    """
    Return all ACTIVE trips, optionally filtered by user_id.
    """
    conn = get_connection()
    cursor = conn.cursor()
    if user_id:
        cursor.execute(
            "SELECT * FROM trips WHERE status = 'ACTIVE' AND user_id = ? ORDER BY started_at DESC",
            (user_id,),
        )
    else:
        cursor.execute(
            "SELECT * FROM trips WHERE status = 'ACTIVE' ORDER BY started_at DESC"
        )
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_trip_history(user_id: int = 1, limit: int = 10) -> list:
    """
    Return the most recent ENDED trips for a user, including safety rating if available.
    """
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT t.*,
               rf.rating    AS safety_rating,
               rf.comment   AS feedback_text
        FROM trips t
        LEFT JOIN route_feedback rf ON rf.route_id = 'trip_' || t.id
        WHERE t.status = 'ENDED'
          AND (t.user_id = ? OR t.user_id IS NULL)
        ORDER BY t.ended_at DESC
        LIMIT ?
        """,
        (user_id, limit),
    )
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]


# ── Route Deviation Check ─────────────────────────────────────────────────────

def check_deviation(trip_id: int, current_lat: float, current_lon: float) -> dict:
    """
    Check whether the user has deviated from their planned route.
    For now uses straight-line tolerance; integrate OSRM waypoints in production.

    Args:
        trip_id:                ID of the active trip.
        current_lat, current_lon: User's current GPS position.

    Returns:
        {
            "trip_id": int,
            "off_route": bool,
            "message": str,
            "distance_from_destination_km": float,
            "remaining_eta_minutes": float,
        }
    """
    trip = get_trip_by_id(trip_id)
    if not trip:
        return {"error": f"Trip {trip_id} not found."}

    # Build a simple 3-point route: origin → midpoint → destination
    mid_lat = (trip["origin_lat"] + trip["dest_lat"]) / 2
    mid_lon = (trip["origin_lon"] + trip["dest_lon"]) / 2
    waypoints = [
        {"lat": trip["origin_lat"], "lon": trip["origin_lon"]},
        {"lat": mid_lat,           "lon": mid_lon},
        {"lat": trip["dest_lat"],  "lon": trip["dest_lon"]},
    ]

    off_route = is_off_route(current_lat, current_lon, waypoints, tolerance_km=0.5)

    # Remaining distance to destination
    remaining_eta = estimate_eta_minutes(
        current_lat, current_lon,
        trip["dest_lat"], trip["dest_lon"],
        AVERAGE_SPEED_KMPH,
    )

    from utils.location_utils import haversine_km
    dist_to_dest = haversine_km(current_lat, current_lon, trip["dest_lat"], trip["dest_lon"])

    return {
        "trip_id":                      trip_id,
        "off_route":                    off_route,
        "message": (
            "⚠️ Route deviation detected! You appear to be off your planned path."
            if off_route else
            "✅ You are on your planned route."
        ),
        "distance_from_destination_km": round(dist_to_dest, 2),
        "remaining_eta_minutes":        remaining_eta,
    }


# ── Mark Trip as SOS ──────────────────────────────────────────────────────────

def escalate_trip_to_sos(trip_id: int) -> dict:
    """Flag an active trip as SOS status."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE trips SET status = 'SOS' WHERE id = ?",
        (trip_id,),
    )
    conn.commit()
    conn.close()
    return get_trip_by_id(trip_id)
