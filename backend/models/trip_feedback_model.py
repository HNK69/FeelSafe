"""
models/trip_feedback_model.py
==============================
Extended post-trip feedback table.
Captures multi-dimensional ratings beyond a single star.
Used to train route safety scoring over time.
"""

from models.trip_model import get_connection


def init_trip_feedback_table():
    """Create trip_feedback table if it doesn't exist."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS trip_feedback (
            id                   INTEGER PRIMARY KEY AUTOINCREMENT,
            trip_id              INTEGER,
            user_id              INTEGER,
            safety_rating        INTEGER CHECK(safety_rating BETWEEN 1 AND 5),
            lighting_rating      INTEGER CHECK(lighting_rating BETWEEN 1 AND 5),
            crowd_rating         INTEGER CHECK(crowd_rating BETWEEN 1 AND 5),
            incident_reported    INTEGER DEFAULT 0,   -- 0=no, 1=yes
            incident_description TEXT,
            submitted_at         TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (trip_id) REFERENCES trips(id)
        )
    """)
    conn.commit()
    conn.close()
    print("[OK] trip_feedback table ready.")


def submit_trip_feedback(trip_id: int, user_id: int = None,
                         safety_rating: int = 3, lighting_rating: int = 3,
                         crowd_rating: int = 3, incident_reported: bool = False,
                         incident_description: str = None) -> dict:
    """Insert a detailed post-trip feedback record."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO trip_feedback
            (trip_id, user_id, safety_rating, lighting_rating, crowd_rating,
             incident_reported, incident_description)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (trip_id, user_id,
         max(1, min(5, safety_rating)),
         max(1, min(5, lighting_rating)),
         max(1, min(5, crowd_rating)),
         int(incident_reported),
         incident_description),
    )
    conn.commit()
    fb_id = cursor.lastrowid
    conn.close()
    return get_trip_feedback_by_id(fb_id)


def get_trip_feedback_by_id(fb_id: int) -> dict | None:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM trip_feedback WHERE id = ?", (fb_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def get_feedback_for_trip(trip_id: int) -> list:
    """Return all detailed feedback entries for a trip."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM trip_feedback WHERE trip_id = ? ORDER BY submitted_at DESC",
        (trip_id,),
    )
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_area_safety_aggregates(limit: int = 20) -> list:
    """
    Aggregate multi-dimensional ratings across all recent trips.
    Used by route scoring to update safety weights.
    """
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT
            tf.trip_id,
            t.origin_name,
            t.dest_name,
            AVG(tf.safety_rating)   AS avg_safety,
            AVG(tf.lighting_rating) AS avg_lighting,
            AVG(tf.crowd_rating)    AS avg_crowd,
            SUM(tf.incident_reported) AS total_incidents,
            COUNT(*)                AS feedback_count
        FROM trip_feedback tf
        JOIN trips t ON t.id = tf.trip_id
        GROUP BY tf.trip_id
        ORDER BY tf.submitted_at DESC
        LIMIT ?
        """,
        (limit,),
    )
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]
