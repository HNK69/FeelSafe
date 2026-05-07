"""
models/recording_model.py
==========================
Manages the audio_recordings table.
Audio files are stored on disk (backend/uploads/audio/).
Only metadata is stored in SQLite — no BLOBs.
"""

from models.trip_model import get_connection


def init_recordings_table():
    """Create audio_recordings table if it doesn't exist."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS audio_recordings (
            id               INTEGER PRIMARY KEY AUTOINCREMENT,
            trip_id          INTEGER,
            user_id          INTEGER,
            filename         TEXT NOT NULL,        -- e.g. 1715000000_user1.webm
            transcript       TEXT,                 -- Whisper output
            threat_level     TEXT DEFAULT 'LOW',   -- LOW / MEDIUM / HIGH
            duration_seconds REAL,
            recorded_at      TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (trip_id) REFERENCES trips(id)
        )
    """)
    conn.commit()
    conn.close()
    print("[OK] audio_recordings table ready.")


def save_recording(filename: str, transcript: str, threat_level: str,
                   trip_id: int = None, user_id: int = None,
                   duration_seconds: float = None) -> dict:
    """Insert a recording metadata record and return it."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO audio_recordings
            (trip_id, user_id, filename, transcript, threat_level, duration_seconds)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (trip_id, user_id, filename, transcript, threat_level, duration_seconds),
    )
    conn.commit()
    rec_id = cursor.lastrowid
    conn.close()
    return get_recording_by_id(rec_id)


def get_recording_by_id(rec_id: int) -> dict | None:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM audio_recordings WHERE id = ?", (rec_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def get_recordings_for_trip(trip_id: int) -> list:
    """Return all recordings linked to a trip, newest first."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM audio_recordings WHERE trip_id = ? ORDER BY recorded_at DESC",
        (trip_id,),
    )
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_recordings_for_user(user_id: int, limit: int = 20) -> list:
    """Return recent recordings for a user across all trips."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM audio_recordings WHERE user_id = ? ORDER BY recorded_at DESC LIMIT ?",
        (user_id, limit),
    )
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]
