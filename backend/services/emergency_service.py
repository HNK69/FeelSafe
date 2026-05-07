"""
services/emergency_service.py
==============================
SOS emergency escalation: retry logic, nearby resources, WhatsApp links.
"""

from models.trip_model import get_connection
from services.whatsapp_service import generate_emergency_link
from utils.constants import EMERGENCY_NUMBERS, MAX_RETRY_ATTEMPTS
from utils.helpers import utc_now_str
from utils.location_utils import find_nearby

# ── Static Nearby Resources (replace with Overpass API in production) ─────────
POLICE_STATIONS = [
    {"name": "Connaught Place PS",    "lat": 28.6330, "lon": 77.2195, "phone": "011-23341111"},
    {"name": "Lajpat Nagar PS",       "lat": 28.5680, "lon": 77.2440, "phone": "011-29815555"},
    {"name": "Hauz Khas PS",          "lat": 28.5490, "lon": 77.2050, "phone": "011-26867777"},
    {"name": "Karol Bagh PS",         "lat": 28.6519, "lon": 77.1909, "phone": "011-28750000"},
    {"name": "Dwarka Sector 10 PP",   "lat": 28.5820, "lon": 77.0490, "phone": "011-25086666"},
    {"name": "Noida Sector 18 PS",    "lat": 28.5355, "lon": 77.3910, "phone": "0120-2520222"},
]

HOSPITALS = [
    {"name": "AIIMS New Delhi",              "lat": 28.5672, "lon": 77.2100, "phone": "011-26588500"},
    {"name": "Safdarjung Hospital",          "lat": 28.5687, "lon": 77.2051, "phone": "011-26707444"},
    {"name": "Apollo Sarita Vihar",          "lat": 28.5351, "lon": 77.2874, "phone": "011-71791090"},
    {"name": "Max Super Speciality Saket",   "lat": 28.5244, "lon": 77.2090, "phone": "011-26515050"},
    {"name": "Fortis Noida",                 "lat": 28.5497, "lon": 77.3390, "phone": "0120-2400444"},
    {"name": "RML Hospital",                 "lat": 28.6378, "lon": 77.2072, "phone": "011-23404325"},
]


def trigger_emergency(
    lat: float,
    lon: float,
    trip_id: int = None,
    user_id: int = None,
    contact_phone: str = None,
    user_name: str = "FeelSafe User",
    retry_attempt: int = 1,
) -> dict:
    """
    Trigger a full emergency escalation response.

    Escalation levels:
        1 → Initial alert  (WhatsApp link + resources)
        2 → Retry alert    (elevated message)
        3 → Max escalation (call police directly)
    """
    retry_attempt    = max(1, min(retry_attempt, MAX_RETRY_ATTEMPTS))
    escalation_level = retry_attempt

    wa_data = generate_emergency_link(lat=lat, lon=lon,
                                      contact_phone=contact_phone,
                                      user_name=user_name)

    nearby_police    = find_nearby(lat, lon, POLICE_STATIONS, radius_km=3.0)
    nearby_hospitals = find_nearby(lat, lon, HOSPITALS,       radius_km=3.0)

    escalation_msg = _escalation_message(escalation_level, user_name)
    alert_id       = _save_alert(trip_id, user_id, lat, lon,
                                 escalation_level, wa_data["whatsapp_link"])

    return {
        "alert_id":           alert_id,
        "escalation_level":   escalation_level,
        "max_retries":        MAX_RETRY_ATTEMPTS,
        "escalation_message": escalation_msg,
        "whatsapp_link":      wa_data["whatsapp_link"],
        "message_text":       wa_data["message_text"],
        "maps_link":          wa_data["maps_link"],
        "emergency_numbers":  EMERGENCY_NUMBERS,
        "nearby_police":      nearby_police[:3],
        "nearby_hospitals":   nearby_hospitals[:3],
        "triggered_at":       utc_now_str(),
        "should_retry":       escalation_level < MAX_RETRY_ATTEMPTS,
        "retry_in_seconds":   30 if escalation_level < MAX_RETRY_ATTEMPTS else None,
    }


def get_retry_escalation(
    lat: float,
    lon: float,
    previous_attempt: int,
    trip_id: int = None,
    user_id: int = None,
    contact_phone: str = None,
    user_name: str = "FeelSafe User",
) -> dict:
    """Trigger the next retry for an unanswered emergency."""
    return trigger_emergency(
        lat=lat, lon=lon,
        trip_id=trip_id, user_id=user_id,
        contact_phone=contact_phone, user_name=user_name,
        retry_attempt=previous_attempt + 1,
    )


# ── Internal Helpers ──────────────────────────────────────────────────────────

def _escalation_message(level: int, user_name: str) -> str:
    messages = {
        1: (f"🚨 Emergency alert sent for {user_name}. Stay calm and move to safety."),
        2: (f"⚠️ RETRY: {user_name} has not confirmed safety. Contact emergency services."),
        3: (f"🔴 MAX ESCALATION: {user_name} is unresponsive. Call 112 immediately."),
    }
    return messages.get(level, messages[3])


def _save_alert(trip_id, user_id, lat, lon, escalation_level, whatsapp_link) -> int | None:
    """Persist emergency alert to DB."""
    try:
        conn   = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO emergency_alerts
               (trip_id, user_id, lat, lon, escalation_level, whatsapp_link)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (trip_id, user_id, lat, lon, escalation_level, whatsapp_link),
        )
        conn.commit()
        alert_id = cursor.lastrowid
        conn.close()
        return alert_id
    except Exception as e:
        print(f"[EmergencyService] DB save failed: {e}")
        return None
