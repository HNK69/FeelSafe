"""
services/anchor_service.py
===========================
Finds nearby safety anchors.

Strategy (priority order):
  1. OpenStreetMap Overpass API (live, may time out)
  2. Local safety_anchors.json (always works, realistic Delhi data)

Anchor types:
  - police       (police stations)
  - hospital     (hospitals / clinics)
  - pharmacy     (pharmacies)
  - metro_station
  - public_safe_zone
  - supermarket  (OSM only)
"""

import json
import math
import os
import requests

OVERPASS_URL = "https://overpass-api.de/api/interpreter"

# ── Local fallback dataset ────────────────────────────────────────────────────
_BASE = os.path.dirname(os.path.abspath(__file__))
_LOCAL_ANCHORS_PATH = os.path.join(_BASE, "..", "data", "safety_anchors.json")

def _load_local_anchors() -> list:
    try:
        with open(_LOCAL_ANCHORS_PATH, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []

_LOCAL_ANCHORS = _load_local_anchors()

# Amenity queries per anchor type (OSM)
ANCHOR_QUERIES = {
    "police":      'node["amenity"="police"]',
    "hospital":    '(node["amenity"="hospital"];node["amenity"="clinic"];)',
    "pharmacy":    'node["amenity"="pharmacy"]',
    "supermarket": '(node["shop"="supermarket"];node["shop"="convenience"];)',
}

ANCHOR_CONFIG = {
    "police":           {"label": "Police Station",   "color": "#3B82F6", "icon": "🚔"},
    "hospital":         {"label": "Hospital/Clinic",  "color": "#EF4444", "icon": "🏥"},
    "pharmacy":         {"label": "Pharmacy",          "color": "#8B5CF6", "icon": "💊"},
    "metro_station":    {"label": "Metro Station",    "color": "#F59E0B", "icon": "🚇"},
    "public_safe_zone": {"label": "Safe Public Zone", "color": "#00FF9D", "icon": "🛡"},
    "supermarket":      {"label": "Supermarket",      "color": "#FFC857", "icon": "🛒"},
}


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (math.sin(d_lat / 2) ** 2
         + math.cos(math.radians(lat1))
         * math.cos(math.radians(lat2))
         * math.sin(d_lon / 2) ** 2)
    return R * 2 * math.asin(math.sqrt(a))


def _local_anchors_near(lat: float, lon: float, radius_m: int,
                         max_per_type: int = 4) -> dict:
    """
    Filter local safety_anchors.json by distance.
    Returns dict keyed by category.
    """
    radius_km = radius_m / 1000.0
    result: dict[str, list] = {}

    for anchor in _LOCAL_ANCHORS:
        a_lat = anchor.get("lat")
        a_lon = anchor.get("lon")
        if a_lat is None or a_lon is None:
            continue
        dist_km = round(_haversine_km(lat, lon, a_lat, a_lon), 2)
        if dist_km > radius_km:
            continue

        cat    = anchor.get("category", "police")
        config = ANCHOR_CONFIG.get(cat, {})
        entry  = {
            "name":        anchor.get("name", config.get("label", "Safety Point")),
            "type":        cat,
            "label":       config.get("label", cat),
            "icon":        config.get("icon", "📍"),
            "color":       config.get("color", "#FFC857"),
            "lat":         a_lat,
            "lon":         a_lon,
            "distance_km": dist_km,
            "phone":       anchor.get("phone"),
            "open_24x7":   anchor.get("open_24x7", False),
            "safety_score": anchor.get("safety_score", 80),
            "address":     anchor.get("address", ""),
            "navigate_url": f"https://www.google.com/maps/dir/?api=1&destination={a_lat},{a_lon}",
        }
        result.setdefault(cat, []).append(entry)

    # Sort by distance, cap per type
    for cat in result:
        result[cat].sort(key=lambda x: x["distance_km"])
        result[cat] = result[cat][:max_per_type]

    return result


def _query_overpass(lat: float, lon: float, radius_m: int,
                    amenity_type: str) -> list:
    osm_query = ANCHOR_QUERIES.get(amenity_type, "")
    if not osm_query:
        return []

    query = f"""
    [out:json][timeout:8];
    (
      {osm_query}(around:{radius_m},{lat},{lon});
    );
    out center;
    """
    try:
        resp = requests.post(
            OVERPASS_URL,
            data={"data": query},
            timeout=10,
        )
        if resp.status_code == 200:
            return resp.json().get("elements", [])
    except Exception:
        pass
    return []


def _parse_overpass_elements(elements: list, anchor_type: str,
                              lat: float, lon: float) -> list:
    config = ANCHOR_CONFIG.get(anchor_type, {})
    entries = []
    for el in elements:
        el_lat = el.get("lat") or el.get("center", {}).get("lat")
        el_lon = el.get("lon") or el.get("center", {}).get("lon")
        if el_lat is None or el_lon is None:
            continue
        tags = el.get("tags", {})
        name = tags.get("name") or tags.get("name:en") or config.get("label", "Safety Point")
        dist_km = round(_haversine_km(lat, lon, el_lat, el_lon), 2)
        entries.append({
            "name":        name,
            "type":        anchor_type,
            "label":       config.get("label", anchor_type),
            "icon":        config.get("icon", "📍"),
            "color":       config.get("color", "#FFC857"),
            "lat":         el_lat,
            "lon":         el_lon,
            "distance_km": dist_km,
            "phone":       tags.get("phone", tags.get("contact:phone")),
            "open_24x7":   tags.get("opening_hours", "").lower() == "24/7",
            "safety_score": 80,
            "address":     tags.get("addr:full", tags.get("addr:street", "")),
            "navigate_url": f"https://www.google.com/maps/dir/?api=1&destination={el_lat},{el_lon}",
        })
    entries.sort(key=lambda x: x["distance_km"])
    return entries


def get_safety_anchors(lat: float, lon: float,
                        radius_m: int = 1500,
                        max_per_type: int = 4) -> dict:
    """
    Find safety anchors near a coordinate.

    Strategy:
    1. Try OSM Overpass (live data) for police/hospital/pharmacy/supermarket.
    2. Always merge local safety_anchors.json for metro_station + public_safe_zone.
    3. If OSM returns 0 total results, fall back entirely to local dataset.

    Returns:
        {
            "success": True,
            "anchors": { "police": [...], "hospital": [...], ... },
            "total_found": int,
            "nearest_police_km": float | None,
            "nearest_hospital_km": float | None,
            "source": "osm" | "local" | "mixed",
        }
    """
    # ── Try OSM first ─────────────────────────────────────────────────────────
    osm_result: dict[str, list] = {}
    osm_total = 0

    for anchor_type in ("police", "hospital", "pharmacy", "supermarket"):
        elements = _query_overpass(lat, lon, radius_m, anchor_type)
        if elements:
            parsed = _parse_overpass_elements(elements, anchor_type, lat, lon)[:max_per_type]
            osm_result[anchor_type] = parsed
            osm_total += len(parsed)

    # ── Always include local metro + safe zones ────────────────────────────────
    local_all = _local_anchors_near(lat, lon, radius_m, max_per_type)
    for cat in ("metro_station", "public_safe_zone"):
        if local_all.get(cat):
            osm_result[cat] = local_all[cat]
            osm_total += len(local_all[cat])

    # ── Fallback: if OSM gave no police/hospital/pharmacy, use local ──────────
    source = "mixed"
    if osm_total == 0 or not any(osm_result.get(t) for t in ("police", "hospital", "pharmacy")):
        # Full local fallback
        result = _local_anchors_near(lat, lon, radius_m, max_per_type)
        source = "local"
    else:
        # Supplement missing types from local
        for anchor_type in ("police", "hospital", "pharmacy"):
            if not osm_result.get(anchor_type) and local_all.get(anchor_type):
                osm_result[anchor_type] = local_all[anchor_type]
        result = osm_result
        source = "osm" if osm_total > 0 else "local"

    # Final count
    total = sum(len(v) for v in result.values())

    # If still nothing, widen radius and retry local
    if total == 0:
        result  = _local_anchors_near(lat, lon, max(radius_m, 5000), max_per_type)
        total   = sum(len(v) for v in result.values())
        source  = "local_widened"

    police_list   = result.get("police", [])
    hospital_list = result.get("hospital", [])

    return {
        "success":             True,
        "anchors":             result,
        "total_found":         total,
        "nearest_police_km":   police_list[0]["distance_km"]   if police_list   else None,
        "nearest_hospital_km": hospital_list[0]["distance_km"] if hospital_list else None,
        "search_radius_m":     radius_m,
        "center":              {"lat": lat, "lon": lon},
        "source":              source,
    }
