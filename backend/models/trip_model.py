"""
models/trip_model.py
====================
SQLite schema and DB initialisation for FeelSafe.
Covers: trips, users, and route feedback.
"""

import sqlite3
import os

# ── Database Path ─────────────────────────────────────────────────────────────
# Stored in backend/database/feelsafe.db
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "..", "database", "feelsafe.db")


def get_connection() -> sqlite3.Connection:
    """Return a SQLite connection with row_factory for dict-like access."""
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row   # columns accessible by name
    conn.execute("PRAGMA journal_mode=WAL;")  # better concurrent read support
    return conn


def init_db():
    """Create all tables if they don't already exist."""
    conn = get_connection()
    cursor = conn.cursor()

    # ── Users ─────────────────────────────────────────────────────────────────
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            name            TEXT NOT NULL,
            phone           TEXT NOT NULL UNIQUE,
            emergency_contact_name  TEXT,
            emergency_contact_phone TEXT,
            created_at      TEXT DEFAULT (datetime('now'))
        )
    """)

    # ── Trips ─────────────────────────────────────────────────────────────────
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS trips (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id         INTEGER,
            origin_lat      REAL NOT NULL,
            origin_lon      REAL NOT NULL,
            dest_lat        REAL NOT NULL,
            dest_lon        REAL NOT NULL,
            origin_name     TEXT,
            dest_name       TEXT,
            status          TEXT DEFAULT 'ACTIVE',   -- ACTIVE | ENDED | SOS
            eta_minutes     REAL,
            started_at      TEXT DEFAULT (datetime('now')),
            ended_at        TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)

    # ── Route Feedback (Community Safety Intelligence) ────────────────────────
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS route_feedback (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            route_id        TEXT NOT NULL,   -- arbitrary route identifier
            user_id         INTEGER,
            rating          REAL NOT NULL CHECK(rating >= 0 AND rating <= 5),
            is_unsafe_report INTEGER DEFAULT 0,   -- 1 if user flagged as unsafe
            comment         TEXT,
            lat             REAL,
            lon             REAL,
            submitted_at    TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)

    # ── Emergency Alerts ──────────────────────────────────────────────────────
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS emergency_alerts (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            trip_id         INTEGER,
            user_id         INTEGER,
            lat             REAL,
            lon             REAL,
            escalation_level INTEGER DEFAULT 1,
            whatsapp_link   TEXT,
            triggered_at    TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (trip_id) REFERENCES trips(id),
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)

    conn.commit()
    conn.close()
    print("[OK] FeelSafe database initialised.")
