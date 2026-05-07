"""
routes/voice_routes.py
=======================
Blueprint: Voice threat analysis via microphone.

Endpoints:
    POST /api/analyze-voice    — upload audio, transcribe, analyze threat
"""

import os
import time
from flask import Blueprint, request, jsonify
from services.voice_service import transcribe_audio, detect_panic_keywords
from services.threat_service import analyse_threat
from models.recording_model import save_recording

voice_bp = Blueprint("voice", __name__)

# ── Upload directory setup ────────────────────────────────────────────────────
BASE_DIR   = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads", "audio")
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {".webm", ".mp4", ".wav", ".m4a", ".ogg", ".mp3"}
MAX_FILE_MB        = 25


@voice_bp.route("/analyze-voice", methods=["POST"])
def api_analyze_voice():
    """
    Receive an audio blob, transcribe it with Groq Whisper,
    run existing threat analysis on the transcript, and return result.

    Form data:
        audio   (file)          — audio blob from MediaRecorder
        trip_id (int, optional) — link recording to trip
        user_id (int, optional)
        lat     (float, optional)
        lon     (float, optional)

    Response:
        {
            "success":      bool,
            "transcript":   str,
            "risk_level":   "LOW" | "MEDIUM" | "HIGH",
            "score":        float,
            "message":      str,
            "action_tips":  list,
            "panic_keywords": list,
            "auto_escalated": bool,
            "recording_id": int | None,
            "filename":     str | None,
        }
    """
    # ── Validate file present ─────────────────────────────────────────────────
    if "audio" not in request.files:
        return jsonify({"success": False, "error": "No audio file in request."}), 400

    audio_file = request.files["audio"]
    if not audio_file.filename:
        return jsonify({"success": False, "error": "Empty filename."}), 400

    # ── Check extension ───────────────────────────────────────────────────────
    _, ext = os.path.splitext(audio_file.filename.lower())
    if ext not in ALLOWED_EXTENSIONS:
        ext = ".webm"   # browser MediaRecorder often sends unnamed blobs

    # ── Parse optional fields ─────────────────────────────────────────────────
    trip_id = request.form.get("trip_id", type=int)
    user_id = request.form.get("user_id", type=int) or 1
    lat     = request.form.get("lat",     type=float) or 28.6315
    lon     = request.form.get("lon",     type=float) or 77.2167

    # ── Save audio to disk ────────────────────────────────────────────────────
    timestamp = int(time.time())
    filename  = f"{timestamp}_user{user_id}{ext}"
    save_path = os.path.join(UPLOAD_DIR, filename)
    audio_file.save(save_path)

    # ── Check file size ───────────────────────────────────────────────────────
    size_mb = os.path.getsize(save_path) / (1024 * 1024)
    if size_mb > MAX_FILE_MB:
        os.remove(save_path)
        return jsonify({"success": False, "error": f"File too large ({size_mb:.1f} MB > {MAX_FILE_MB} MB)."}), 413

    # ── Transcribe ────────────────────────────────────────────────────────────
    transcription = transcribe_audio(save_path)
    transcript    = transcription.get("transcript", "")

    # ── Panic keyword pre-check ───────────────────────────────────────────────
    panic_info = detect_panic_keywords(transcript)

    # ── Full threat analysis ──────────────────────────────────────────────────
    if transcript:
        threat_result = analyse_threat(transcript)
    else:
        # Groq failed or silent recording — use panic score as fallback
        panic_score  = panic_info.get("panic_score", 0)
        threat_result = {
            "risk_level":     "HIGH" if panic_score > 0.6 else "LOW",
            "score":          int(panic_score * 100),
            "message":        transcription.get("error", "No speech detected."),
            "action_tips":    [],
            "auto_escalated": False,
            "escalation_result": None,
        }

    risk_level = threat_result.get("risk_level", "LOW")

    # ── Save recording metadata if HIGH risk or SOS ───────────────────────────
    recording_id = None
    if risk_level in ("HIGH", "MEDIUM") or trip_id:
        rec = save_recording(
            filename      = filename,
            transcript    = transcript,
            threat_level  = risk_level,
            trip_id       = trip_id,
            user_id       = user_id,
        )
        recording_id = rec.get("id") if rec else None

    return jsonify({
        "success":        True,
        "transcript":     transcript,
        "transcription_success": transcription.get("success", False),
        "risk_level":     risk_level,
        "score":          threat_result.get("score", 0),
        "message":        threat_result.get("message", ""),
        "action_tips":    threat_result.get("action_tips", []),
        "matched_keywords": threat_result.get("matched_keywords", []),
        "panic_keywords": panic_info.get("keywords_found", []),
        "auto_escalated": threat_result.get("auto_escalated", False),
        "escalation_result": threat_result.get("escalation_result"),
        "recording_id":   recording_id,
        "filename":       filename,
    }), 200
