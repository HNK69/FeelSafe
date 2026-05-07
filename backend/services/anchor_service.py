"""
services/anchor_service.py
===========================
Finds nearby safety anchors using OpenStreetMap Overpass API.
NO paid APIs — 100% free OSM data.

Anchor types:
  - police stations
  - hospitals / clinics
  - pharmacies
  - supermarkets (safe public spaces)
"""

import math
import requests

OVERPASS_URL = "https://overpass-api.de/api/interpreter"

# Amenity queries per anchor type
ANCHOR_QUERIES = {
    "police":      'node["amenity"="police"]',
    "hospital":    '(node["amenity"="hospital"];node["amenity"="clinic"];)',
    "pharmacy":    'node["amenity"="pharmacy"]',
    "supermarket": '(node["shop"="supermarket"];node["shop"="convenience"];)',
}

# Friendly display config
ANCHOR_CONFIG = {
    "police":      {"label": "Police Station",  "color": "#00E5FF", "icon": "🚔"},
    "hospital":    {"label": "Hospital/Clinic",  "color": "#FF3B5C", "icon": "🏥"},
    "pharmacy":    {"label": "Pharmacy",         "color": "#00FF9D", "icon": "💊"},
    "supermarket": {"label": "Supermarket",      "color": "#FFC857", "icon": "🛒"},
}


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Haversine distance between two coordinates in km."""
    R = 6371.0
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (math.sin(d_lat / 2) ** 2
         + math.cos(math.radians(lat1))
         * math.cos(math.radians(lat2))
         * math.sin(d_lon / 2) ** 2)
    return R * 2 * math.asin(math.sqrt(a))


def _query_overpass(lat: float, lon: float, radius_m: int, amenity_type: str) -> list:
    """
    Query Overpass for a single amenity type around a coordinate.

    Returns a list of raw elements (nodes/ways with center).
    """
    osm_query = ANCHOR_QUERIES.get(amenity_type, "")
    if not osm_query:
        return []

    # Build Overpass QL query
    query = f"""
    [out:json][timeout:10];
    (
      {osm_query}(around:{radius_m},{lat},{lon});
    );
    out center;
    """

    try:
        resp = requests.post(
            OVERPASS_URL,
            data={"data": query},
            timeout=12,
        )
        if resp.status_code == 200:
            return resp.json().get("elements", [])
    except (requests.exceptions.Timeout, requests.exceptions.ConnectionError):
        pass
    return []


def get_safety_anchors(lat: float, lon: float,
                       radius_m: int = 1000,
                       max_per_type: int = 4) -> dict:
    """
    Find safety anchors near a coordinate using OSM Overpass.

    Args:
        lat, lon:      Center coordinate.
        radius_m:      Search radius in metres (default 1 km).
        max_per_type:  Max results per anchor type.

    Returns:
        {
            "anchors": {
                "police":      [ { name, lat, lon, distance_km, ... } ],
                "hospital":    [ ... ],
                "pharmacy":    [ ... ],
                "supermarket": [ ... ],
            },
            "total_found": int,
            "nearest_police_km": float | None,
            "nearest_hospital_km": float | None,
        }
    """
    result = {}
    total  = 0

    for anchor_type in ANCHOR_QUERIES:
        elements = _query_overpass(lat, lon, radius_m, anchor_type)
        config   = ANCHOR_CONFIG[anchor_type]
        entries  = []

        for el in elements:
            # Nodes have lat/lon directly; ways have a center
            el_lat = el.get("lat") or el.get("center", {}).get("lat")
            el_lon = el.get("lon") or el.get("center", {}).get("lon")
            if el_lat is None or el_lon is None:
                continue

            tags = el.get("tags", {})
            name = (
                tags.get("name")
                or tags.get("name:en")
                or config["label"]
            )
            dist_km = round(_haversine_km(lat, lon, el_lat, el_lon), 2)

            entries.append({
                "name":        name,
                "type":        anchor_type,
                "label":       config["label"],
                "icon":        config["icon"],
                "color":       config["color"],
                "lat":         el_lat,
                "lon":         el_lon,
                "distance_km": dist_km,
                "phone":       tags.get("phone", tags.get("contact:phone", None)),
                "opening":     tags.get("opening_hours", None),
            })

        # Sort by distance, take top N
        entries.sort(key=lambda x: x["distance_km"])
        result[anchor_type] = entries[:max_per_type]
        total += len(result[anchor_type])

    # Nearest police/hospital for quick-SOS response
    police_list   = result.get("police", [])
    hospital_list = result.get("hospital", [])

    return {
        "anchors":              result,
        "total_found":          total,
        "nearest_police_km":   police_list[0]["distance_km"]   if police_list   else None,
        "nearest_hospital_km": hospital_list[0]["distance_km"] if hospital_list else None,
        "search_radius_m":     radius_m,
        "center":              {"lat": lat, "lon": lon},
    }
