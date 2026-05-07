"""
services/voice_service.py
==========================
Handles audio file transcription via Groq Whisper API.

Flow:
  1. Receive audio file path (saved to disk by the route handler)
  2. POST to Groq Whisper endpoint
  3. Return transcript text

Model: whisper-large-v3-turbo (fast, accurate, free tier available)
API key: GROQ_API_KEY in backend/.env
"""

import os
import requests
from dotenv import load_dotenv

load_dotenv()  # reads backend/.env

GROQ_API_KEY     = os.getenv("GROQ_API_KEY", "")
GROQ_WHISPER_URL = "https://api.groq.com/openai/v1/audio/transcriptions"
WHISPER_MODEL    = "whisper-large-v3-turbo"

# Audio MIME types accepted by Groq
MIME_MAP = {
    ".webm": "audio/webm",
    ".mp4":  "audio/mp4",
    ".wav":  "audio/wav",
    ".m4a":  "audio/m4a",
    ".ogg":  "audio/ogg",
    ".mp3":  "audio/mpeg",
}


def transcribe_audio(audio_path: str) -> dict:
    """
    Transcribe an audio file using Groq Whisper.

    Args:
        audio_path: Absolute path to the saved audio file.

    Returns:
        {
            "success":    bool,
            "transcript": str,   # transcribed text (empty string on failure)
            "error":      str,   # error message if failed, else None
        }
    """
    if not GROQ_API_KEY:
        return {
            "success":    False,
            "transcript": "",
            "error":      "GROQ_API_KEY not configured in .env",
        }

    if not os.path.exists(audio_path):
        return {
            "success":    False,
            "transcript": "",
            "error":      f"Audio file not found: {audio_path}",
        }

    ext  = os.path.splitext(audio_path)[1].lower()
    mime = MIME_MAP.get(ext, "audio/webm")

    try:
        with open(audio_path, "rb") as f:
            response = requests.post(
                GROQ_WHISPER_URL,
                headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
                files={"file": (os.path.basename(audio_path), f, mime)},
                data={"model": WHISPER_MODEL, "language": "en"},
                timeout=30,
            )

        if response.status_code == 200:
            transcript = response.json().get("text", "").strip()
            return {"success": True, "transcript": transcript, "error": None}

        # Non-200 from Groq
        err_detail = response.json().get("error", {}).get("message", response.text[:200])
        return {
            "success":    False,
            "transcript": "",
            "error":      f"Groq API error {response.status_code}: {err_detail}",
        }

    except requests.exceptions.Timeout:
        return {"success": False, "transcript": "", "error": "Groq API timed out after 30s"}
    except requests.exceptions.ConnectionError:
        return {"success": False, "transcript": "", "error": "Cannot reach Groq API"}
    except Exception as e:
        return {"success": False, "transcript": "", "error": str(e)}


def detect_panic_keywords(text: str) -> dict:
    """
    Quick keyword scan for panic/fear language in transcribed text.
    Used as a fast pre-check before full threat analysis.

    Returns:
        { "panic_detected": bool, "keywords_found": list, "panic_score": float }
    """
    text_lower = text.lower()

    panic_words = [
        # Direct distress
        "help", "help me", "somebody help", "please help",
        # Following/tracking
        "following", "following me", "being followed", "stalking",
        # Threats
        "knife", "gun", "weapon", "attack", "hit me", "grab",
        # Fear language
        "scared", "terrified", "afraid", "frightened", "panic",
        # Danger phrases
        "not safe", "unsafe", "danger", "dangerous", "emergency",
        # Location distress
        "alone", "dark", "no one", "nobody", "isolated",
        # Body language
        "running", "run", "escape", "trapped", "cornered",
        # Repeated help phrases (covered by single match)
        "call police", "call 100", "call 112",
    ]

    found = [kw for kw in panic_words if kw in text_lower]

    # Score: 0.0 to 1.0 based on keyword density
    panic_score = min(1.0, len(found) * 0.18)

    return {
        "panic_detected":  len(found) > 0,
        "keywords_found":  found,
        "panic_score":     round(panic_score, 2),
    }
