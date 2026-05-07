"""
models/feedback_model.py
========================
CRUD helpers for the `route_feedback` table.
Used by Community Safety Intelligence feature.
"""

from models.trip_model import get_connection


def submit_feedback(route_id: str,
                    rating: float,
                    is_unsafe_report: bool = False,
                    comment: str = None,
                    lat: float = None,
                    lon: float = None,
                    user_id: int = None) -> dict:
    """
    Insert a community route feedback entry.

    Args:
        route_id:         Arbitrary string identifying the route/segment.
        rating:           Safety rating 0-5.
        is_unsafe_report: True if the user is flagging this as unsafe.
        comment:          Optional free-text comment.
        lat, lon:         Approximate location of the report.
        user_id:          Optional linked user ID.

    Returns:
        The created feedback record as a dict.
    """
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO route_feedback
            (route_id, user_id, rating, is_unsafe_report, comment, lat, lon)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (route_id, user_id, rating, int(is_unsafe_report), comment, lat, lon),
    )
    conn.commit()
    feedback_id = cursor.lastrowid
    conn.close()
    return get_feedback_by_id(feedback_id)


def get_feedback_by_id(feedback_id: int) -> dict | None:
    """Fetch a feedback record by primary key."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM route_feedback WHERE id = ?", (feedback_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def get_route_stats(route_id: str) -> dict:
    """
    Aggregate community stats for a given route_id.

    Returns:
        {
            "route_id": str,
            "avg_rating": float,          # 0-5
            "total_ratings": int,
            "unsafe_report_count": int,
        }
    """
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT
            COUNT(*)          AS total_ratings,
            AVG(rating)       AS avg_rating,
            SUM(is_unsafe_report) AS unsafe_report_count
        FROM route_feedback
        WHERE route_id = ?
        """,
        (route_id,),
    )
    row = cursor.fetchone()
    conn.close()

    return {
        "route_id":           route_id,
        "total_ratings":      row["total_ratings"] or 0,
        "avg_rating":         round(row["avg_rating"] or 0.0, 2),
        "unsafe_report_count": row["unsafe_report_count"] or 0,
    }


def get_all_feedback_for_route(route_id: str) -> list:
    """Return all individual feedback entries for a route."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM route_feedback WHERE route_id = ? ORDER BY submitted_at DESC",
        (route_id,),
    )
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]
