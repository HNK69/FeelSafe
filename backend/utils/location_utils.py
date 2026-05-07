"""
utils/location_utils.py
=======================
Geospatial utilities: distance calculations and nearby-entity helpers.
Uses the Haversine formula – no external dependencies required.
"""

import math
from typing import List, Dict, Tuple


# ── Haversine Distance ────────────────────────────────────────────────────────

def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great-circle distance (km) between two points on Earth.
    Uses the Haversine formula.

    Args:
        lat1, lon1: First point coordinates (degrees).
        lat2, lon2: Second point coordinates (degrees).

    Returns:
        Distance in kilometres.
    """
    R = 6371.0  # Earth's radius in km

    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lam = math.radians(lon2 - lon1)

    a = (math.sin(d_phi / 2) ** 2
         + math.cos(phi1) * math.cos(phi2) * math.sin(d_lam / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return R * c


# ── Nearby Filter ─────────────────────────────────────────────────────────────

def find_nearby(
    user_lat: float,
    user_lon: float,
    locations: List[Dict],
    radius_km: float = 1.0,
    lat_key: str = "lat",
    lon_key: str = "lon",
) -> List[Dict]:
    """
    Filter a list of location dicts to those within `radius_km` of the user.

    Each dict must have keys `lat_key` and `lon_key` (default: "lat", "lon").
    The returned dicts are augmented with a "distance_km" key.

    Args:
        user_lat:   User's current latitude.
        user_lon:   User's current longitude.
        locations:  List of location dicts to filter.
        radius_km:  Inclusion radius in km (default 1.0).
        lat_key:    Key name for latitude in the location dicts.
        lon_key:    Key name for longitude in the location dicts.

    Returns:
        Filtered list sorted by distance (closest first).
    """
    results = []
    for loc in locations:
        dist = haversine_km(user_lat, user_lon, loc[lat_key], loc[lon_key])
        if dist <= radius_km:
            entry = dict(loc)
            entry["distance_km"] = round(dist, 3)
            results.append(entry)

    results.sort(key=lambda x: x["distance_km"])
    return results


# ── ETA Calculation ───────────────────────────────────────────────────────────

def estimate_eta_minutes(
    origin_lat: float,
    origin_lon: float,
    dest_lat: float,
    dest_lon: float,
    speed_kmph: float = 30.0,
) -> float:
    """
    Rough ETA estimate based on straight-line distance and assumed speed.

    Args:
        origin_lat, origin_lon: Starting coordinates.
        dest_lat,   dest_lon:   Destination coordinates.
        speed_kmph:             Average travel speed (default 30 km/h).

    Returns:
        Estimated travel time in minutes (rounded to 1 decimal).
    """
    distance = haversine_km(origin_lat, origin_lon, dest_lat, dest_lon)
    if speed_kmph <= 0:
        return float("inf")
    eta_hours = distance / speed_kmph
    return round(eta_hours * 60, 1)


# ── Bounding Box ──────────────────────────────────────────────────────────────

def bounding_box(lat: float, lon: float, radius_km: float) -> Tuple[float, float, float, float]:
    """
    Return a rough bounding box (min_lat, min_lon, max_lat, max_lon) for a
    given centre point and radius, useful for pre-filtering before Haversine.

    Args:
        lat, lon:   Centre coordinates.
        radius_km:  Radius in km.

    Returns:
        (min_lat, min_lon, max_lat, max_lon)
    """
    lat_delta = radius_km / 111.0           # ~111 km per degree latitude
    lon_delta = radius_km / (111.0 * math.cos(math.radians(lat)))
    return (lat - lat_delta, lon - lon_delta,
            lat + lat_delta, lon + lon_delta)


# ── Route Deviation Check ─────────────────────────────────────────────────────

def is_off_route(
    current_lat: float,
    current_lon: float,
    route_waypoints: List[Dict],
    tolerance_km: float = 0.3,
    lat_key: str = "lat",
    lon_key: str = "lon",
) -> bool:
    """
    Check whether the user has deviated from the planned route.
    Returns True if the user is more than `tolerance_km` away from ALL
    waypoints in the route.

    Args:
        current_lat, current_lon: User's current position.
        route_waypoints:          List of waypoint dicts with lat/lon keys.
        tolerance_km:             Off-route threshold in km (default 0.3 km).

    Returns:
        True if user appears to be off-route.
    """
    if not route_waypoints:
        return False  # No route to deviate from

    for wp in route_waypoints:
        dist = haversine_km(current_lat, current_lon, wp[lat_key], wp[lon_key])
        if dist <= tolerance_km:
            return False  # On route

    return True  # All waypoints are too far away → off route
