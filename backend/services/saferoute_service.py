"""
services/saferoute_service.py
==============================
MAIN NOVELTY FEATURE — Smart SafeRoute AI.

Calculates the safest route using:
  - Police stations nearby (+)
  - Hospitals nearby (+)
  - Isolated roads (-)
  - Community unsafe reports (-)
  - Community safety ratings (+)
  - Time of day / nighttime (-)
  - Known unsafe zones (-)

All scoring is rule-based — no heavy ML models.
"""

import json
import os
from utils.risk_scoring import compute_route_safety_score
from utils.location_utils import find_nearby, haversine_km
from utils.constants import UNSAFE_ZONE_RADIUS_KM
from models.feedback_model import get_route_stats

# ── Load Static Data ──────────────────────────────────────────────────────────
_BASE   = os.path.dirname(os.path.abspath(__file__))
_DATA   = os.path.join(_BASE, "..", "data")

with open(os.path.join(_DATA, "unsafe_zones.json"),  encoding="utf-8") as f:
    UNSAFE_ZONES = json.load(f)

with open(os.path.join(_DATA, "sample_routes.json"), encoding="utf-8") as f:
    SAMPLE_ROUTES = json.load(f)

# Static POI lists (extend or replace with Overpass API in production)
POLICE_POI = [
    {"name": "Connaught Place PS",  "lat": 28.6330, "lon": 77.2195},
    {"name": "Lajpat Nagar PS",     "lat": 28.5680, "lon": 77.2440},
    {"name": "Hauz Khas PS",        "lat": 28.5490, "lon": 77.2050},
    {"name": "Karol Bagh PS",       "lat": 28.6519, "lon": 77.1909},
    {"name": "Dwarka Sector 10",    "lat": 28.5820, "lon": 77.0490},
    {"name": "Noida Sector 18 PS",  "lat": 28.5355, "lon": 77.3910},
]

HOSPITAL_POI = [
    {"name": "AIIMS New Delhi",     "lat": 28.5672, "lon": 77.2100},
    {"name": "Safdarjung Hospital", "lat": 28.5687, "lon": 77.2051},
    {"name": "Apollo Sarita Vihar", "lat": 28.5351, "lon": 77.2874},
    {"name": "Max Saket",           "lat": 28.5244, "lon": 77.2090},
    {"name": "Fortis Noida",        "lat": 28.5497, "lon": 77.3390},
    {"name": "RML Hospital",        "lat": 28.6378, "lon": 77.2072},
]

SEARCH_RADIUS_KM = 1.5   # Radius used to look up nearby POIs for a route


# ── Public API ────────────────────────────────────────────────────────────────

def get_safest_route(
    origin_lat: float,
    origin_lon: float,
    dest_lat: float,
    dest_lon: float,
) -> dict:
    """
    Rank all sample routes by safety score and return the safest one.

    For a real deployment, candidate routes would be fetched from OSRM.
    Here we use the static sample_routes.json and score each one.

    Args:
        origin_lat, origin_lon: User's current coordinates.
        dest_lat,   dest_lon:   Destination coordinates.

    Returns:
        {
            "safest_route":      dict,   # Full route info + score
            "all_routes_ranked": list,   # All candidates sorted safest-first
            "explanation":       str,
        }
    """
    candidates = _find_candidate_routes(origin_lat, origin_lon, dest_lat, dest_lon)

    if not candidates:
        # Fall back to direct-line "route" with live scoring
        fallback = _score_direct_route(origin_lat, origin_lon, dest_lat, dest_lon)
        return {
            "safest_route":      fallback,
            "all_routes_ranked": [fallback],
            "explanation": (
                "No pre-defined routes matched your journey. "
                "A direct route has been scored based on current conditions."
            ),
        }

    scored = [_score_route(r) for r in candidates]
    scored.sort(key=lambda r: r["safety_score"], reverse=True)   # Safest first

    best  = scored[0]
    label = best["safety_label"]

    explanation = (
        f"The safest route is '{best['name']}' with a safety score of "
        f"{best['safety_score']}/100 ({label}). "
        f"Key factors: {', '.join(best['safety_factors'][:3]) if best['safety_factors'] else 'standard conditions'}."
    )

    return {
        "safest_route":      best,
        "all_routes_ranked": scored,
        "explanation":       explanation,
    }


def score_custom_route(
    mid_lat: float,
    mid_lon: float,
    is_isolated: bool,
    community_rating: float,
    unsafe_report_count: int,
    route_id: str = None,
) -> dict:
    """
    Score a custom / user-defined route segment using the safety engine.
    Useful when the frontend sends a route it obtained from OSRM.
    """
    has_police   = bool(find_nearby(mid_lat, mid_lon, POLICE_POI,   radius_km=SEARCH_RADIUS_KM))
    has_hospital = bool(find_nearby(mid_lat, mid_lon, HOSPITAL_POI, radius_km=SEARCH_RADIUS_KM))

    # Merge with community DB stats if route_id provided
    if route_id:
        stats = get_route_stats(route_id)
        community_rating     = stats["avg_rating"]   or community_rating
        unsafe_report_count  = stats["unsafe_report_count"] or unsafe_report_count

    result = compute_route_safety_score(
        has_hospital_nearby  = has_hospital,
        has_police_nearby    = has_police,
        is_isolated          = is_isolated,
        unsafe_report_count  = unsafe_report_count,
        community_rating     = community_rating,
    )

    return {
        "safety_score":   result["score"],
        "safety_label":   result["label"],
        "safety_factors": result["factors"],
        "is_nighttime":   result["is_nighttime"],
    }


# ── Internal Helpers ──────────────────────────────────────────────────────────

def _find_candidate_routes(
    origin_lat: float, origin_lon: float,
    dest_lat:   float, dest_lon:   float,
    max_origin_km: float = 5.0,
    max_dest_km:   float = 5.0,
) -> list:
    """
    Filter sample routes to those whose origin and destination are
    reasonably close to the user's request.
    """
    results = []
    for route in SAMPLE_ROUTES:
        o = route["origin"]
        d = route["destination"]
        if (haversine_km(origin_lat, origin_lon, o["lat"], o["lon"]) <= max_origin_km and
                haversine_km(dest_lat, dest_lon, d["lat"], d["lon"]) <= max_dest_km):
            results.append(route)
    return results


def _score_route(route: dict) -> dict:
    """
    Score a single route from sample_routes.json using all safety factors.
    Also fetches live community stats from the DB.
    """
    mid_lat = (route["origin"]["lat"] + route["destination"]["lat"]) / 2
    mid_lon = (route["origin"]["lon"] + route["destination"]["lon"]) / 2

    # Live community stats (DB)
    stats = get_route_stats(route["id"])
    community_rating    = stats["avg_rating"]        if stats["total_ratings"] > 0 else route.get("community_rating", 3.0)
    unsafe_report_count = stats["unsafe_report_count"] or route.get("unsafe_report_count", 0)

    # POI proximity
    has_police   = route.get("nearby_police",   False) or bool(find_nearby(mid_lat, mid_lon, POLICE_POI,   radius_km=SEARCH_RADIUS_KM))
    has_hospital = route.get("nearby_hospital", False) or bool(find_nearby(mid_lat, mid_lon, HOSPITAL_POI, radius_km=SEARCH_RADIUS_KM))

    # Unsafe zone penalty (count how many known unsafe zones are along the route)
    unsafe_zone_hits = _count_unsafe_zones_on_route(route)
    unsafe_report_count += unsafe_zone_hits * 2   # Each unsafe zone counts as 2 extra reports

    result = compute_route_safety_score(
        has_hospital_nearby = has_hospital,
        has_police_nearby   = has_police,
        is_isolated         = route.get("is_isolated", False),
        unsafe_report_count = unsafe_report_count,
        community_rating    = float(community_rating),
    )

    return {
        **route,                               # Include all original route fields
        "safety_score":   result["score"],
        "safety_label":   result["label"],
        "safety_factors": result["factors"],
        "is_nighttime":   result["is_nighttime"],
        "community_stats": stats,
    }


def _score_direct_route(
    origin_lat: float, origin_lon: float,
    dest_lat:   float, dest_lon:   float,
) -> dict:
    """Fallback: score the midpoint of a direct origin→destination line."""
    mid_lat = (origin_lat + dest_lat) / 2
    mid_lon = (origin_lon + dest_lon) / 2

    has_police   = bool(find_nearby(mid_lat, mid_lon, POLICE_POI,   radius_km=SEARCH_RADIUS_KM))
    has_hospital = bool(find_nearby(mid_lat, mid_lon, HOSPITAL_POI, radius_km=SEARCH_RADIUS_KM))
    unsafe_near  = find_nearby(mid_lat, mid_lon, UNSAFE_ZONES,      radius_km=UNSAFE_ZONE_RADIUS_KM)

    result = compute_route_safety_score(
        has_hospital_nearby = has_hospital,
        has_police_nearby   = has_police,
        is_isolated         = False,
        unsafe_report_count = len(unsafe_near),
        community_rating    = 3.0,
    )

    from utils.location_utils import haversine_km as _hkm
    dist = _hkm(origin_lat, origin_lon, dest_lat, dest_lon)

    return {
        "id":             "direct",
        "name":           "Direct Route",
        "origin":         {"lat": origin_lat, "lon": origin_lon, "name": "Your Location"},
        "destination":    {"lat": dest_lat,   "lon": dest_lon,   "name": "Destination"},
        "distance_km":    round(dist, 2),
        "waypoints":      [],
        "safety_score":   result["score"],
        "safety_label":   result["label"],
        "safety_factors": result["factors"],
        "is_nighttime":   result["is_nighttime"],
        "community_stats": {"route_id": "direct", "total_ratings": 0, "avg_rating": 0, "unsafe_report_count": 0},
    }


def _count_unsafe_zones_on_route(route: dict) -> int:
    """Count how many known unsafe zones fall near the route's waypoints."""
    waypoints = route.get("waypoints", [])
    # Also check midpoint between origin and destination
    waypoints = waypoints + [
        {"lat": route["origin"]["lat"],      "lon": route["origin"]["lon"]},
        {"lat": route["destination"]["lat"], "lon": route["destination"]["lon"]},
    ]
    hits = set()
    for wp in waypoints:
        for zone in UNSAFE_ZONES:
            dist = haversine_km(wp["lat"], wp["lon"], zone["lat"], zone["lon"])
            if dist <= UNSAFE_ZONE_RADIUS_KM:
                hits.add(zone["id"])
    return len(hits)
