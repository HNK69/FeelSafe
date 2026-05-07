"""
routes/sos_routes.py
=====================
Blueprint: Quick SOS — instant emergency trigger.

Used for:
  - Device shake detection
  - Triple tap gesture
  - Any non-UI emergency trigger

Endpoints:
    POST /api/quick-sos
"""

from flask import Blueprint, request, jsonify
from services.emergency_service import trigger_emergency
from services.anchor_service import get_safety_anchors

sos_bp = Blueprint("sos", __name__)


@sos_bp.route("/quick-sos", methods=["POST"])
def api_quick_sos():
    """
    Instant SOS trigger — creates HIGH risk emergency and returns
    full escalation payload + nearby safety anchors.

    Request body (JSON):
        {
            "lat":       28.6315,       (optional, defaults to Delhi CP)
            "lon":       77.2167,
            "user_id":   1,             (optional)
            "user_name": "FeelSafe User",
            "trip_id":   5,             (optional)
            "trigger":   "shake"        (optional — "shake" | "triple_tap" | "button")
        }

    Response:
        {
            "success": true,
            "escalation_level": 3,
            "whatsapp_link": "https://wa.me/...",
            "auto_contacts_notified": [...],
            "anchors": { "police": [...], "hospital": [...], ... },
            "nearest_police_km": 0.8,
            "nearest_hospital_km": 1.2,
            "emergency_numbers": { ... },
            "trigger": "shake",
            "message": "Quick SOS activated. Stay calm and move to safety."
        }
    """
    data = request.get_json(silent=True) or {}

    lat       = float(data.get("lat",  28.6315))
    lon       = float(data.get("lon",  77.2167))
    user_id   = data.get("user_id",   1)
    user_name = data.get("user_name", "FeelSafe User")
    trip_id   = data.get("trip_id",   None)
    trigger   = data.get("trigger",   "button")

    # ── Trigger full emergency alert ──────────────────────────────────────────
    emergency = trigger_emergency(
        lat         = lat,
        lon         = lon,
        user_id     = user_id,
        user_name   = user_name,
        trip_id     = trip_id,
        risk_level  = "HIGH",
        threat_text = f"Quick SOS triggered via {trigger}",
    )

    # ── Fetch nearby safety anchors ───────────────────────────────────────────
    try:
        anchors_data = get_safety_anchors(lat, lon, radius_m=1500)
    except Exception:
        anchors_data = {"anchors": {}, "total_found": 0,
                        "nearest_police_km": None, "nearest_hospital_km": None}

    return jsonify({
        "success":                True,
        "trigger":                trigger,
        "message":                "Quick SOS activated. Stay calm and move to a public area.",
        "escalation_level":       emergency.get("escalation_level", 3),
        "whatsapp_link":          emergency.get("whatsapp_link"),
        "maps_link":              emergency.get("maps_link"),
        "auto_contacts_notified": emergency.get("auto_contacts_notified", []),
        "contacts_count":         emergency.get("contacts_count", 0),
        "emergency_numbers":      emergency.get("emergency_numbers", {
            "police": "100", "ambulance": "108",
            "women_helpline": "1091", "national_emergency": "112"
        }),
        "anchors":                anchors_data.get("anchors", {}),
        "nearest_police_km":      anchors_data.get("nearest_police_km"),
        "nearest_hospital_km":    anchors_data.get("nearest_hospital_km"),
    }), 200
