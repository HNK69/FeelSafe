"""
FeelSafe Backend - Main Application Entry Point
================================================
Initializes Flask app, registers all blueprints, and starts the server.
"""

from flask import Flask, jsonify
from flask_cors import CORS

# Import blueprints
from routes.threat_routes    import threat_bp
from routes.trip_routes      import trip_bp
from routes.emergency_routes import emergency_bp
from routes.saferoute_routes import saferoute_bp
from routes.contact_routes   import contact_bp
from routes.community_routes import community_bp

# Import database initialiser
from models.trip_model    import init_db
from models.contact_model import init_contacts_table, seed_demo_contacts


def create_app():
    """Application factory: creates and configures the Flask app."""
    app = Flask(__name__)

    # ── CORS ──────────────────────────────────────────────────────────────────
    CORS(app, resources={r"/*": {"origins": "*"}})

    # ── Database ──────────────────────────────────────────────────────────────
    init_db()
    init_contacts_table()
    seed_demo_contacts(user_id=1)   # Pre-populate demo contacts on first run

    # ── Blueprint Registration ────────────────────────────────────────────────
    app.register_blueprint(threat_bp,    url_prefix="/api")
    app.register_blueprint(trip_bp,      url_prefix="/api")
    app.register_blueprint(emergency_bp, url_prefix="/api")
    app.register_blueprint(saferoute_bp, url_prefix="/api")
    app.register_blueprint(contact_bp,   url_prefix="/api")
    app.register_blueprint(community_bp, url_prefix="/api")

    # ── Health Check ─────────────────────────────────────────────────────────
    @app.route("/health", methods=["GET"])
    def health_check():
        return jsonify({"status": "ok", "service": "FeelSafe Backend"}), 200

    # ── 404 / 500 ─────────────────────────────────────────────────────────────
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "Route not found"}), 404

    @app.errorhandler(500)
    def server_error(e):
        return jsonify({"error": "Internal server error"}), 500

    return app


if __name__ == "__main__":
    app = create_app()
    print("[FeelSafe] Backend running on http://localhost:5000")
    app.run(debug=True, host="0.0.0.0", port=5000)
