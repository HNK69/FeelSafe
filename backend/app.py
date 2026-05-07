"""
FeelSafe Backend - Main Application Entry Point
================================================
Initializes Flask app, registers all blueprints, and starts the server.
"""

import os
from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

# ── Import blueprints ─────────────────────────────────────────────────────────
from routes.threat_routes    import threat_bp
from routes.trip_routes      import trip_bp
from routes.emergency_routes import emergency_bp
from routes.saferoute_routes import saferoute_bp
from routes.contact_routes   import contact_bp
from routes.community_routes import community_bp
from routes.voice_routes     import voice_bp       # NEW: mic → Whisper → threat
from routes.recording_routes import recording_bp   # NEW: audio playback
from routes.sos_routes       import sos_bp         # NEW: quick SOS
from routes.anchor_routes    import anchor_bp       # NEW: OSM safety anchors

# ── Import database initialisers ──────────────────────────────────────────────
from models.trip_model        import init_db
from models.contact_model     import init_contacts_table, seed_demo_contacts
from models.recording_model   import init_recordings_table     # NEW
from models.trip_feedback_model import init_trip_feedback_table  # NEW

# ── Upload directory ──────────────────────────────────────────────────────────
BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads", "audio")
os.makedirs(UPLOAD_DIR, exist_ok=True)


def create_app():
    """Application factory: creates and configures the Flask app."""
    app = Flask(__name__)

    # ── CORS ──────────────────────────────────────────────────────────────────
    CORS(app, resources={r"/*": {"origins": "*"}})

    # ── Database ──────────────────────────────────────────────────────────────
    init_db()
    init_contacts_table()
    seed_demo_contacts(user_id=1)
    init_recordings_table()       # NEW
    init_trip_feedback_table()    # NEW

    # ── Blueprint Registration ────────────────────────────────────────────────
    app.register_blueprint(threat_bp,    url_prefix="/api")
    app.register_blueprint(trip_bp,      url_prefix="/api")
    app.register_blueprint(emergency_bp, url_prefix="/api")
    app.register_blueprint(saferoute_bp, url_prefix="/api")
    app.register_blueprint(contact_bp,   url_prefix="/api")
    app.register_blueprint(community_bp, url_prefix="/api")
    app.register_blueprint(voice_bp,     url_prefix="/api")      # NEW
    app.register_blueprint(recording_bp, url_prefix="/api")      # NEW
    app.register_blueprint(sos_bp,       url_prefix="/api")      # NEW
    app.register_blueprint(anchor_bp,    url_prefix="/api")      # NEW

    # ── Static file serving for uploaded audio ────────────────────────────────
    @app.route("/uploads/audio/<path:filename>", methods=["GET"])
    def serve_audio(filename):
        """Serve saved audio recordings for frontend playback."""
        return send_from_directory(UPLOAD_DIR, filename)

    # ── Health Check ─────────────────────────────────────────────────────────
    @app.route("/health", methods=["GET"])
    def health_check():
        groq_configured = bool(os.getenv("GROQ_API_KEY", ""))
        return jsonify({
            "status":           "ok",
            "service":          "FeelSafe Backend",
            "groq_configured":  groq_configured,
            "upload_dir":       UPLOAD_DIR,
        }), 200

    # ── 404 / 500 ─────────────────────────────────────────────────────────────
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "Route not found"}), 404

    @app.errorhandler(500)
    def server_error(e):
        return jsonify({"error": "Internal server error", "detail": str(e)}), 500

    return app


if __name__ == "__main__":
    app = create_app()
    print("[FeelSafe] Backend running on http://localhost:5000")
    print(f"[FeelSafe] Audio uploads → {UPLOAD_DIR}")
    print(f"[FeelSafe] Groq Whisper  → {'CONFIGURED' if os.getenv('GROQ_API_KEY') else 'NOT SET (add to .env)'}")
    app.run(debug=True, host="0.0.0.0", port=5000)
