"""
routes/contact_routes.py
=========================
Blueprint: Emergency contacts CRUD.

Endpoints:
    GET    /api/contacts?user_id=1
    POST   /api/contacts
    PUT    /api/contacts/<id>
    DELETE /api/contacts/<id>
"""

from flask import Blueprint, request, jsonify
from models.contact_model import (
    add_contact, get_contacts_for_user,
    update_contact, delete_contact, get_contact_by_id,
)
from utils.helpers import error_response, require_fields

contact_bp = Blueprint("contacts", __name__)


@contact_bp.route("/contacts", methods=["GET"])
def api_get_contacts():
    """Return all contacts for a user (default user_id=1 for demo)."""
    user_id = request.args.get("user_id", 1, type=int)
    contacts = get_contacts_for_user(user_id)
    return jsonify({"success": True, "contacts": contacts, "count": len(contacts)}), 200


@contact_bp.route("/contacts", methods=["POST"])
def api_add_contact():
    """
    Add an emergency contact.

    Body:
        {
            "user_id": 1,
            "name": "Mom",
            "phone": "+919876543210",
            "relation": "Mother",
            "medium_alert_enabled": true,
            "high_alert_enabled": true
        }
    """
    data = request.get_json(silent=True) or {}
    missing = require_fields(data, ["name", "phone"])
    if missing:
        return jsonify(error_response(f"Missing field: '{missing}'")[0]), 400

    contact = add_contact(
        user_id=data.get("user_id", 1),
        name=str(data["name"]).strip(),
        phone=str(data["phone"]).strip(),
        relation=data.get("relation", "Contact"),
        medium_alert=bool(data.get("medium_alert_enabled", True)),
        high_alert=bool(data.get("high_alert_enabled", True)),
    )
    return jsonify({"success": True, "contact": contact}), 201


@contact_bp.route("/contacts/<int:contact_id>", methods=["PUT"])
def api_update_contact(contact_id: int):
    """Update a contact's fields."""
    data = request.get_json(silent=True) or {}
    if not data:
        return jsonify(error_response("No update fields provided.")[0]), 400

    updated = update_contact(contact_id, **data)
    if not updated:
        return jsonify(error_response(f"Contact {contact_id} not found.")[0]), 404

    return jsonify({"success": True, "contact": updated}), 200


@contact_bp.route("/contacts/<int:contact_id>", methods=["DELETE"])
def api_delete_contact(contact_id: int):
    """Delete a contact."""
    deleted = delete_contact(contact_id)
    if not deleted:
        return jsonify(error_response(f"Contact {contact_id} not found.")[0]), 404
    return jsonify({"success": True, "message": f"Contact {contact_id} deleted."}), 200
