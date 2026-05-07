"""
services/emergency_service.py
==============================
SOS emergency escalation with AUTOMATIC contact notification.

Escalation levels:
    1 → Initial alert   (WhatsApp link + resources)
    2 → Retry alert     (elevated message)
    3 → Max escalation  (call police)

Auto-escalation:
    MEDIUM risk → notify medium-enabled contacts
    HIGH risk   → notify ALL high-enabled contacts
"""

from models.trip_model   import get_connection
from models.contact_model import get_contacts_for_alert
from services.whatsapp_service import generate_emergency_link
from utils.constants import EMERGENCY_NUMBERS, MAX_RETRY_ATTEMPTS
from utils.helpers import utc_now_str
from utils.location_utils import find_nearby

# ── Static POIs ───────────────────────────────────────────────────────────────
POLICE_STATIONS = [
    {"name": "Connaught Place PS",  "lat": 28.6330, "lon": 77.2195, "phone": "011-23341111"},
    {"name": "Lajpat Nagar PS",     "lat": 28.5680, "lon": 77.2440, "phone": "011-29815555"},
    {"name": "Hauz Khas PS",        "lat": 28.5490, "lon": 77.2050, "phone": "011-26867777"},
    {"name": "Karol Bagh PS",       "lat": 28.6519, "lon": 77.1909, "phone": "011-28750000"},
    {"name": "Dwarka Sector 10",    "lat": 28.5820, "lon": 77.0490, "phone": "011-25086666"},
    {"name": "Noida Sector 18 PS",  "lat": 28.5355, "lon": 77.3910, "phone": "0120-2520222"},
]

HOSPITALS = [
    {"name": "AIIMS New Delhi",            "lat": 28.5672, "lon": 77.2100, "phone": "011-26588500"},
    {"name": "Safdarjung Hospital",        "lat": 28.5687, "lon": 77.2051, "phone": "011-26707444"},
    {"name": "Apollo Sarita Vihar",        "lat": 28.5351, "lon": 77.2874, "phone": "011-71791090"},
    {"name": "Max Super Speciality Saket", "lat": 28.5244, "lon": 77.2090, "phone": "011-26515050"},
    {"name": "Fortis Noida",               "lat": 28.5497, "lon": 77.3390, "phone": "0120-2400444"},
    {"name": "RML Hospital",               "lat": 28.6378, "lon": 77.2072, "phone": "011-23404325"},
]


def trigger_emergency(
    lat: float,
    lon: float,
    trip_id: int = None,
    user_id: int = None,
    contact_phone: str = None,
    user_name: str = "FeelSafe User",
    retry_attempt: int = 1,
    risk_level: str = "HIGH",
    threat_text: str = "",
) -> dict:
    """
    Trigger a full SOS emergency response with automatic contact escalation.

    Args:
        lat, lon:       User's GPS coordinates.
        trip_id:        Associated trip (optional).
        user_id:        User ID for contact lookup.
        contact_phone:  Manual override contact phone.
        user_name:      User's name for the message.
        retry_attempt:  Escalation level (1–3).
        risk_level:     "LOW" | "MEDIUM" | "HIGH"
        threat_text:    The text that triggered the threat (for the WA message).
    """
    retry_attempt    = max(1, min(retry_attempt, MAX_RETRY_ATTEMPTS))
    escalation_level = retry_attempt

    # ── Auto-contact lookup ───────────────────────────────────────────────────
    auto_contacts = []
    if user_id:
        auto_contacts = get_contacts_for_alert(user_id, risk_level)

    # Build WhatsApp links for each auto-contact
    auto_wa_links = []
    for contact in auto_contacts:
        wa = generate_emergency_link(
            lat=lat, lon=lon,
            contact_phone=contact["phone"],
            user_name=user_name,
            threat_text=threat_text,
            risk_level=risk_level,
        )
        auto_wa_links.append({
            "contact_name":  contact["name"],
            "contact_phone": contact["phone"],
            "whatsapp_link": wa["whatsapp_link"],
            "maps_link":     wa["maps_link"],
        })

    # Primary link (manual override or first auto-contact or generic)
    primary_phone = contact_phone or (auto_contacts[0]["phone"] if auto_contacts else None)
    wa_data = generate_emergency_link(
        lat=lat, lon=lon,
        contact_phone=primary_phone,
        user_name=user_name,
        threat_text=threat_text,
        risk_level=risk_level,
    )

    # ── Nearby resources ──────────────────────────────────────────────────────
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
        "auto_contacts_notified": auto_wa_links,
        "contacts_count":     len(auto_wa_links),
        "triggered_at":       utc_now_str(),
        "should_retry":       escalation_level < MAX_RETRY_ATTEMPTS,
        "retry_in_seconds":   30 if escalation_level < MAX_RETRY_ATTEMPTS else None,
    }


def trigger_auto_escalation(
    lat: float,
    lon: float,
    risk_level: str,
    threat_text: str = "",
    user_id: int = 1,
    user_name: str = "FeelSafe User",
    trip_id: int = None,
) -> dict | None:
    """
    Automatic escalation triggered by threat analysis result.
    Called automatically when MEDIUM or HIGH risk is detected.

    Returns None for LOW risk (no auto-action).
    """
    if risk_level == "LOW":
        return None

    return trigger_emergency(
        lat=lat, lon=lon,
        trip_id=trip_id,
        user_id=user_id,
        user_name=user_name,
        retry_attempt=1,
        risk_level=risk_level,
        threat_text=threat_text,
    )


def get_retry_escalation(
    lat: float, lon: float,
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


# ── Helpers ───────────────────────────────────────────────────────────────────

def _escalation_message(level: int, user_name: str) -> str:
    messages = {
        1: f"Emergency alert sent for {user_name}. Stay calm and move to safety.",
        2: f"RETRY: {user_name} has not confirmed safety. Contact emergency services.",
        3: f"MAX ESCALATION: {user_name} is unresponsive. Call 112 immediately.",
    }
    return messages.get(level, messages[3])


def _save_alert(trip_id, user_id, lat, lon, escalation_level, whatsapp_link) -> int | None:
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
