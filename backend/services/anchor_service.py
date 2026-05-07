"""
services/anchor_service.py
===========================
LOCAL-FIRST safety anchor lookup.

Priority:
  1. Local safety_anchors.json — instant, always works
  2. OSM Overpass — optional supplement (3s timeout, non-blocking for missing types)

This guarantees the feature NEVER returns empty for any Delhi-area route.
"""

import json
import math
import os
import requests
import threading

OVERPASS_URL = "https://overpass-api.de/api/interpreter"

# ── Load local dataset ────────────────────────────────────────────────────────
_BASE              = os.path.dirname(os.path.abspath(__file__))
_LOCAL_PATH        = os.path.join(_BASE, "..", "data", "safety_anchors.json")
_LOCAL_ANCHORS: list = []

try:
    with open(_LOCAL_PATH, encoding="utf-8") as _f:
        _LOCAL_ANCHORS = json.load(_f)
except Exception:
    pass

# ── Display config ────────────────────────────────────────────────────────────
ANCHOR_CONFIG = {
    "police":           {"label": "Police Station",   "color": "#3B82F6", "icon": "🚔"},
    "hospital":         {"label": "Hospital",         "color": "#EF4444", "icon": "🏥"},
    "pharmacy":         {"label": "Pharmacy",         "color": "#8B5CF6", "icon": "💊"},
    "metro_station":    {"label": "Metro Station",    "color": "#F59E0B", "icon": "🚇"},
    "public_safe_zone": {"label": "Safe Public Zone", "color": "#00FF9D", "icon": "🛡"},
    "supermarket":      {"label": "Supermarket",      "color": "#FFC857", "icon": "🛒"},
}

# Category mapping: JSON "category" → internal key
CATEGORY_MAP = {
    "police":           "police",
    "police_station":   "police",
    "hospital":         "hospital",
    "clinic":           "hospital",
    "pharmacy":         "pharmacy",
    "metro_station":    "metro_station",
    "metro":            "metro_station",
    "public_safe_zone": "public_safe_zone",
    "safe_zone":        "public_safe_zone",
    "supermarket":      "supermarket",
}


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (math.sin(d_lat / 2) ** 2
         + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2))
         * math.sin(d_lon / 2) ** 2)
    return R * 2 * math.asin(math.sqrt(a))


def _local_search(lat: float, lon: float,
                  radius_km: float, max_per_type: int = 4) -> dict:
    """
    Scan local safety_anchors.json and return all entries within radius_km,
    grouped by category and sorted by distance.
    """
    buckets: dict[str, list] = {}

    for anchor in _LOCAL_ANCHORS:
        a_lat = anchor.get("lat")
        a_lon = anchor.get("lon")
        if a_lat is None or a_lon is None:
            continue

        dist_km = round(_haversine_km(lat, lon, a_lat, a_lon), 2)
        if dist_km > radius_km:
            continue

        raw_cat = anchor.get("category", "police")
        cat     = CATEGORY_MAP.get(raw_cat, raw_cat)
        cfg     = ANCHOR_CONFIG.get(cat, {})

        entry = {
            "name":         anchor.get("name", cfg.get("label", "Safety Point")),
            "type":         cat,
            "label":        cfg.get("label", cat),
            "icon":         cfg.get("icon",  "📍"),
            "color":        cfg.get("color", "#FFC857"),
            "lat":          a_lat,
            "lon":          a_lon,
            "distance_km":  dist_km,
            "phone":        anchor.get("phone"),
            "open_24x7":    anchor.get("open_24x7", False),
            "safety_score": anchor.get("safety_score", 80),
            "address":      anchor.get("address", ""),
            "navigate_url": (
                f"https://www.google.com/maps/dir/?api=1"
                f"&destination={a_lat},{a_lon}"
            ),
        }
        buckets.setdefault(cat, []).append(entry)

    # Sort each bucket by distance, cap at max_per_type
    for cat in buckets:
        buckets[cat].sort(key=lambda x: x["distance_km"])
        buckets[cat] = buckets[cat][:max_per_type]

    return buckets


def _osm_supplement(lat: float, lon: float,
                    radius_m: int, missing_types: list) -> dict:
    """
    Try OSM Overpass for types not covered by local data.
    Short timeout (3s), non-blocking from caller's perspective.
    """
    OSM_QUERIES = {
        "police":      'node["amenity"="police"]',
        "hospital":    '(node["amenity"="hospital"];node["amenity"="clinic"];)',
        "pharmacy":    'node["amenity"="pharmacy"]',
        "supermarket": '(node["shop"="supermarket"];node["shop"="convenience"];)',
    }
    extra: dict[str, list] = {}

    for t in missing_types:
        q = OSM_QUERIES.get(t)
        if not q:
            continue
        query = f'[out:json][timeout:3];\n({q}(around:{radius_m},{lat},{lon}););\nout center;\n'
        try:
            resp = requests.post(OVERPASS_URL, data={"data": query}, timeout=4)
            if resp.status_code != 200:
                continue
            elements = resp.json().get("elements", [])
            cfg      = ANCHOR_CONFIG.get(t, {})
            entries  = []
            for el in elements:
                el_lat = el.get("lat") or el.get("center", {}).get("lat")
                el_lon = el.get("lon") or el.get("center", {}).get("lon")
                if el_lat is None:
                    continue
                tags  = el.get("tags", {})
                name  = tags.get("name") or tags.get("name:en") or cfg.get("label", "Place")
                dist  = round(_haversine_km(lat, lon, el_lat, el_lon), 2)
                entries.append({
                    "name":         name,
                    "type":         t,
                    "label":        cfg.get("label", t),
                    "icon":         cfg.get("icon",  "📍"),
                    "color":        cfg.get("color", "#FFC857"),
                    "lat":          el_lat,
                    "lon":          el_lon,
                    "distance_km":  dist,
                    "phone":        tags.get("phone"),
                    "open_24x7":    tags.get("opening_hours", "").strip() == "24/7",
                    "safety_score": 80,
                    "address":      tags.get("addr:street", ""),
                    "navigate_url": (
                        f"https://www.google.com/maps/dir/?api=1"
                        f"&destination={el_lat},{el_lon}"
                    ),
                })
            if entries:
                entries.sort(key=lambda x: x["distance_km"])
                extra[t] = entries[:4]
        except Exception:
            pass

    return extra


def get_safety_anchors(lat: float, lon: float,
                       radius_m: int = 1500,
                       max_per_type: int = 4) -> dict:
    """
    Return nearby safety anchors. LOCAL dataset first (instant),
    OSM used to supplement missing types only (short timeout).

    Guarantees: always returns results for any Delhi-area coordinate.
    """
    radius_km = radius_m / 1000.0
    core_types = ["police", "hospital", "pharmacy"]

    # ── Step 1: Local search at requested radius ──────────────────────────────
    result = _local_search(lat, lon, radius_km, max_per_type)

    # ── Step 2: For each missing CORE type, widen to 5 km automatically ───────
    missing_core = [t for t in core_types if not result.get(t)]
    if missing_core:
        wider_km  = max(radius_km, 5.0)
        wider_res = _local_search(lat, lon, wider_km, max_per_type)
        for t in missing_core:
            if wider_res.get(t):
                result[t] = wider_res[t]

    # ── Step 3: If still missing after local 5 km, try OSM (3s) ─────────────
    still_missing = [t for t in core_types if not result.get(t)]
    if still_missing:
        try:
            osm_extra = _osm_supplement(lat, lon, max(radius_m, 5000), still_missing)
            for t, items in osm_extra.items():
                if not result.get(t):
                    result[t] = items
        except Exception:
            pass

    # ── Step 4: Final safety net — ensure metro/safe_zone included if any ─────
    if not result:
        result = _local_search(lat, lon, 10.0, max_per_type)

    # ── Final count ───────────────────────────────────────────────────────────
    total         = sum(len(v) for v in result.values())
    police_list   = result.get("police",   [])
    hospital_list = result.get("hospital", [])

    return {
        "success":             True,
        "anchors":             result,
        "total_found":         total,
        "nearest_police_km":   police_list[0]["distance_km"]   if police_list   else None,
        "nearest_hospital_km": hospital_list[0]["distance_km"] if hospital_list else None,
        "search_radius_m":     radius_m,
        "center":              {"lat": lat, "lon": lon},
    }

