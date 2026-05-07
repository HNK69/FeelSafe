"""
services/whatsapp_service.py
=============================
Generates WhatsApp emergency sharing links.
Uses the wa.me deep-link format — no API key required.
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
) -> dict:
    """
    Generate a WhatsApp emergency sharing link.

    If `contact_phone` is provided, the link opens a chat with that specific
    contact. Otherwise it uses the generic wa.me share format.

    Args:
        lat:            Current latitude (used to build a Google Maps link).
        lon:            Current longitude.
        contact_phone:  Optional phone number with country code (e.g. "+919876543210").
        custom_message: Override the default emergency message.
        user_name:      Name to include in the message.

    Returns:
        {
            "whatsapp_link": str,   # URL to open WhatsApp
            "message_text":  str,   # The plain-text message
            "maps_link":     str,   # Google Maps link to location
        }
    """
    maps_link = f"https://www.google.com/maps?q={lat},{lon}"
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    if custom_message:
        message_text = custom_message
    else:
        # Build a clear, actionable emergency message
        message_text = (
            f"🚨 *EMERGENCY ALERT* 🚨\n"
            f"*{user_name}* needs immediate help!\n\n"
            f"📍 *Live Location:* {maps_link}\n"
            f"🕐 *Time:* {timestamp}\n\n"
            f"Please contact me or call emergency services:\n"
            f"• Police: {EMERGENCY_NUMBERS['police']}\n"
            f"• Ambulance: {EMERGENCY_NUMBERS['ambulance']}\n"
            f"• Women Helpline: {EMERGENCY_NUMBERS['women_helpline']}\n"
            f"• National Emergency: {EMERGENCY_NUMBERS['national_emergency']}\n\n"
            f"_Sent via FeelSafe — Safe Return Assistant_"
        )

    encoded_message = urllib.parse.quote(message_text)

    if contact_phone:
        # Direct chat to a specific number
        # Strip non-numeric characters except leading +
        clean_phone = "".join(c for c in contact_phone if c.isdigit())
        whatsapp_link = f"https://wa.me/{clean_phone}?text={encoded_message}"
    else:
        # Generic share link (user picks contact in WhatsApp)
        whatsapp_link = f"https://wa.me/?text={encoded_message}"

    return {
        "whatsapp_link": whatsapp_link,
        "message_text":  message_text,
        "maps_link":     maps_link,
    }


def generate_check_in_link(
    lat: float,
    lon: float,
    contact_phone: str,
    user_name: str = "FeelSafe User",
    eta_minutes: float = None,
) -> dict:
    """
    Generate a non-emergency WhatsApp check-in link (e.g. "I've started my trip").

    Args:
        lat, lon:       Current position.
        contact_phone:  Recipient phone number with country code.
        user_name:      Sender's name.
        eta_minutes:    Optional ETA to include in the message.

    Returns:
        Same dict structure as `generate_emergency_link`.
    """
    maps_link = f"https://www.google.com/maps?q={lat},{lon}"
    eta_str   = f"{eta_minutes:.0f} min" if eta_minutes else "unknown"

    message_text = (
        f"👋 Hi! *{user_name}* has started a trip via FeelSafe.\n\n"
        f"📍 Starting location: {maps_link}\n"
        f"🕐 ETA: ~{eta_str}\n\n"
        f"They will share updates. If you don't hear from them, "
        f"please check in or call {EMERGENCY_NUMBERS['police']}.\n\n"
        f"_FeelSafe — Safe Return Assistant_"
    )

    encoded_message = urllib.parse.quote(message_text)
    clean_phone     = "".join(c for c in contact_phone if c.isdigit())
    whatsapp_link   = f"https://wa.me/{clean_phone}?text={encoded_message}"

    return {
        "whatsapp_link": whatsapp_link,
        "message_text":  message_text,
        "maps_link":     maps_link,
    }
