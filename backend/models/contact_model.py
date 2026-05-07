"""
models/contact_model.py
========================
CRUD helpers for the `emergency_contacts` table.
Supports per-contact escalation level configuration.
"""

from models.trip_model import get_connection


def init_contacts_table():
    """Create the emergency_contacts table if it doesn't exist."""
    conn = get_connection()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS emergency_contacts (
            id                   INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id              INTEGER NOT NULL DEFAULT 1,
            name                 TEXT NOT NULL,
            phone                TEXT NOT NULL,
            relation             TEXT DEFAULT 'Contact',
            medium_alert_enabled INTEGER DEFAULT 1,
            high_alert_enabled   INTEGER DEFAULT 1,
            created_at           TEXT DEFAULT (datetime('now'))
        )
    """)
    conn.commit()
    conn.close()


def add_contact(user_id: int, name: str, phone: str,
                relation: str = "Contact",
                medium_alert: bool = True,
                high_alert: bool = True) -> dict:
    """Insert a new emergency contact and return it."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """INSERT INTO emergency_contacts
           (user_id, name, phone, relation, medium_alert_enabled, high_alert_enabled)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (user_id, name, phone, relation, int(medium_alert), int(high_alert)),
    )
    conn.commit()
    contact_id = cursor.lastrowid
    conn.close()
    return get_contact_by_id(contact_id)


def get_contact_by_id(contact_id: int) -> dict | None:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM emergency_contacts WHERE id = ?", (contact_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def get_contacts_for_user(user_id: int) -> list:
    """Return all contacts for a user."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM emergency_contacts WHERE user_id = ? ORDER BY id",
        (user_id,),
    )
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_contacts_for_alert(user_id: int, risk_level: str) -> list:
    """
    Return contacts that should receive an alert for the given risk level.
    MEDIUM → contacts with medium_alert_enabled = 1
    HIGH   → contacts with high_alert_enabled = 1
    """
    conn = get_connection()
    cursor = conn.cursor()
    if risk_level == "HIGH":
        cursor.execute(
            "SELECT * FROM emergency_contacts WHERE user_id = ? AND high_alert_enabled = 1",
            (user_id,),
        )
    elif risk_level == "MEDIUM":
        cursor.execute(
            "SELECT * FROM emergency_contacts WHERE user_id = ? AND medium_alert_enabled = 1",
            (user_id,),
        )
    else:
        rows = []
        conn.close()
        return rows
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]


def update_contact(contact_id: int, **kwargs) -> dict | None:
    """Update a contact's fields. Accepts name, phone, relation, medium_alert_enabled, high_alert_enabled."""
    allowed = {"name", "phone", "relation", "medium_alert_enabled", "high_alert_enabled"}
    updates = {k: v for k, v in kwargs.items() if k in allowed}
    if not updates:
        return get_contact_by_id(contact_id)

    sets = ", ".join(f"{k} = ?" for k in updates)
    vals = list(updates.values()) + [contact_id]
    conn = get_connection()
    conn.execute(f"UPDATE emergency_contacts SET {sets} WHERE id = ?", vals)
    conn.commit()
    conn.close()
    return get_contact_by_id(contact_id)


def delete_contact(contact_id: int) -> bool:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM emergency_contacts WHERE id = ?", (contact_id,))
    conn.commit()
    deleted = cursor.rowcount > 0
    conn.close()
    return deleted


def seed_demo_contacts(user_id: int = 1):
    """Seed demo contacts if none exist for user_id=1."""
    existing = get_contacts_for_user(user_id)
    if existing:
        return
    demo = [
        ("Mom",     "+919876543210", "Mother",  True,  True),
        ("Rahul",   "+919812345678", "Friend",  False, True),
        ("Priya",   "+919887654321", "Friend",  True,  True),
    ]
    for name, phone, relation, medium, high in demo:
        add_contact(user_id, name, phone, relation, medium, high)
