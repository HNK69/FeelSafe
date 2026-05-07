"""
models/user_model.py
====================
CRUD helpers for the `users` table.
"""

from models.trip_model import get_connection


def create_user(name: str, phone: str,
                emergency_contact_name: str = None,
                emergency_contact_phone: str = None) -> dict:
    """Insert a new user and return the created record."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO users (name, phone, emergency_contact_name, emergency_contact_phone)
        VALUES (?, ?, ?, ?)
        """,
        (name, phone, emergency_contact_name, emergency_contact_phone),
    )
    conn.commit()
    user_id = cursor.lastrowid
    conn.close()
    return get_user_by_id(user_id)


def get_user_by_id(user_id: int) -> dict | None:
    """Fetch a user record by primary key."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def get_user_by_phone(phone: str) -> dict | None:
    """Fetch a user record by phone number."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE phone = ?", (phone,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def update_emergency_contact(user_id: int,
                              contact_name: str,
                              contact_phone: str) -> bool:
    """Update emergency contact details for a user. Returns True on success."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        UPDATE users
        SET emergency_contact_name = ?, emergency_contact_phone = ?
        WHERE id = ?
        """,
        (contact_name, contact_phone, user_id),
    )
    conn.commit()
    updated = cursor.rowcount > 0
    conn.close()
    return updated
