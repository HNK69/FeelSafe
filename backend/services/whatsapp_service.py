"""
services/whatsapp_service.py
=============================
Generates WhatsApp deep-links. No API key required (wa.me format).
Now supports threat context in emergency messages.
"""

import urllib.parse
from datetime import datetime
from utils.constants import DEFAULT_EMERGENCY_MESSAGE, EMERGENCY_NUMBERS


def generate_emergency_link(
    lat: float,
    lon: float,
    contact_phone: str = None,
    custom_message: str = None,
    user_name: str = "FeelSafe User",
    threat_text: str = "",
    risk_level: str = "HIGH",
) -> dict:
    """
    Generate a WhatsApp emergency sharing link.

    Args:
        lat, lon:       Current GPS coordinates.
        contact_phone:  Optional phone number (with country code).
        custom_message: Override the default message.
        user_name:      Name to include in the message.
        threat_text:    The situation text that triggered the alert.
        risk_level:     "LOW" | "MEDIUM" | "HIGH"

    Returns:
        { whatsapp_link, message_text, maps_link }
    """
    maps_link = f"https://www.google.com/maps?q={lat},{lon}"
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    risk_emoji = {"LOW": "⚠️", "MEDIUM": "⚠️ ⚠️", "HIGH": "🚨 EMERGENCY"}.get(risk_level, "🚨")

    if custom_message:
        message_text = custom_message
    else:
        threat_line = f"\nDetected Threat: \"{threat_text}\"" if threat_text else ""
        message_text = (
            f"{risk_emoji} FEELSAFE ALERT\n\n"
            f"*{user_name}* may be in danger!\n"
            f"*Risk Level: {risk_level}*{threat_line}\n\n"
            f"📍 Live Location:\n{maps_link}\n\n"
            f"🕐 Time: {timestamp}\n\n"
            f"Emergency Numbers:\n"
            f"• Police: {EMERGENCY_NUMBERS['police']}\n"
            f"• Ambulance: {EMERGENCY_NUMBERS['ambulance']}\n"
            f"• Women Helpline: {EMERGENCY_NUMBERS['women_helpline']}\n"
            f"• National Emergency: {EMERGENCY_NUMBERS['national_emergency']}\n\n"
            f"_Sent via FeelSafe AI — Safe Return Assistant_"
        )

    encoded      = urllib.parse.quote(message_text)
    clean_phone  = "".join(c for c in (contact_phone or "") if c.isdigit())
    whatsapp_link = (
        f"https://wa.me/{clean_phone}?text={encoded}"
        if clean_phone else
        f"https://wa.me/?text={encoded}"
    )

    return {
        "whatsapp_link": whatsapp_link,
        "message_text":  message_text,
        "maps_link":     maps_link,
    }


def generate_check_in_link(
    lat: float, lon: float,
    contact_phone: str,
    user_name: str = "FeelSafe User",
    eta_minutes: float = None,
) -> dict:
    """Non-emergency trip-start check-in link."""
    maps_link  = f"https://www.google.com/maps?q={lat},{lon}"
    eta_str    = f"{eta_minutes:.0f} min" if eta_minutes else "unknown"

    message_text = (
        f"Hi! *{user_name}* has started a trip via FeelSafe.\n\n"
        f"📍 Starting location: {maps_link}\n"
        f"ETA: ~{eta_str}\n\n"
        f"They will share updates. If you don't hear from them, "
        f"please check in or call {EMERGENCY_NUMBERS['police']}.\n\n"
        f"_FeelSafe — Safe Return Assistant_"
    )

    encoded     = urllib.parse.quote(message_text)
    clean_phone = "".join(c for c in contact_phone if c.isdigit())
    return {
        "whatsapp_link": f"https://wa.me/{clean_phone}?text={encoded}",
        "message_text":  message_text,
        "maps_link":     maps_link,
    }
