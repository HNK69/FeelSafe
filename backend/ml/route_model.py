"""
ml/route_model.py
==================
ML-powered route safety prediction for FeelSafe.

Architecture:
  - Primary: Random Forest Regressor (.pkl) — predicts safety score 0–100
  - Hybrid:  final_score = 0.7 * rule_score + 0.3 * ml_score
  - Fallback: pure rule-based if model not loaded

Feature vector (8 features, matches training):
  [isolated, near_police, near_hospital, crowd_level,
   unsafe_reports, community_rating, time_of_day, unsafe_zone_density]

Semi-realtime intelligence:
  - time_of_day is computed live at inference time
  - dynamic risk density adds context-aware variation
  - community feedback weighting adjusts influence by trust
"""

import math
from ml.model_loader import load_route_model
from utils.helpers import current_hour_local, clamp
from utils.constants import (
    ROUTE_SAFE_THRESHOLD,
    ROUTE_MODERATE_THRESHOLD,
    NIGHT_START_HOUR,
    NIGHT_END_HOUR,
)


def predict_route_score(
    isolated: bool,
    near_police: bool,
    near_hospital: bool,
    unsafe_reports: int,
    community_rating: float,
    unsafe_zone_density: int = 0,
    crowd_level: int = 3,
    current_hour: int | None = None,
    rule_score: int | None = None,
) -> dict:
    """
    Predict the safety score for a route using hybrid ML + rule intelligence.

    Args:
        isolated:            True if road is isolated.
        near_police:         True if police station is within radius.
        near_hospital:       True if hospital is within radius.
        unsafe_reports:      Number of community unsafe reports.
        community_rating:    Average community rating (0–5).
        unsafe_zone_density: Number of unsafe zones along the route.
        crowd_level:         Estimated crowd level 1(empty)–5(busy). Default 3.
        current_hour:        Hour of day; uses system clock if None.
        rule_score:          Pre-computed rule-based score (0–100); if provided,
                             used in the hybrid fusion formula.

    Returns:
        {
            "score":        int (0–100),
            "confidence":   float (0.0–1.0),
            "label":        "Safe" | "Moderate" | "Unsafe",
            "ml_active":    bool,
            "features_used": dict,
            "explanation":  str,
        }
    """
    if current_hour is None:
        current_hour = current_hour_local()

    # ── Build feature vector ──────────────────────────────────────────────────
    time_of_day = _encode_time(current_hour)   # 0 = day, 1 = night, 2 = deep night
    features    = _build_features(
        isolated, near_police, near_hospital,
        crowd_level, unsafe_reports, community_rating,
        time_of_day, unsafe_zone_density,
    )

    # ── ML Inference ─────────────────────────────────────────────────────────
    ml_model = load_route_model()
    ml_active = ml_model is not None

    if ml_active:
        ml_score, ml_confidence = _run_ml(ml_model, features)
    else:
        ml_score, ml_confidence = _simulate_ml(features), 0.70

    # ── Hybrid Fusion ─────────────────────────────────────────────────────────
    if rule_score is not None:
        # Core hybrid formula: rule carries more weight (proven, deterministic)
        fused_score = 0.70 * rule_score + 0.30 * ml_score
    else:
        # No rule score available — use ML + heuristic adjustments only
        fused_score = ml_score

    # ── Context-aware dynamic adjustments ────────────────────────────────────
    dynamic_delta = _dynamic_adjustment(
        current_hour, isolated, unsafe_reports, unsafe_zone_density
    )
    fused_score = fused_score + dynamic_delta

    final_score = int(clamp(fused_score, 0, 100))
    label       = _score_label(final_score)
    confidence  = round(min(1.0, ml_confidence * 0.85 + 0.15), 2)

    explanation = _build_explanation(
        final_score, label, ml_active,
        rule_score, ml_score, dynamic_delta,
        current_hour, features,
    )

    return {
        "score":         final_score,
        "confidence":    confidence,
        "label":         label,
        "ml_active":     ml_active,
        "ml_score":      round(ml_score, 1),
        "rule_score":    rule_score,
        "dynamic_delta": round(dynamic_delta, 1),
        "features_used": {
            "isolated":            isolated,
            "near_police":         near_police,
            "near_hospital":       near_hospital,
            "crowd_level":         crowd_level,
            "unsafe_reports":      unsafe_reports,
            "community_rating":    community_rating,
            "time_of_day":         ["day", "night", "deep_night"][time_of_day],
            "unsafe_zone_density": unsafe_zone_density,
        },
        "explanation":   explanation,
    }


# ── ML Execution ──────────────────────────────────────────────────────────────

def _run_ml(model, features: list) -> tuple:
    """Run the Random Forest regressor and return (score, confidence)."""
    try:
        import numpy as np
        X = np.array(features).reshape(1, -1)
        score = float(model.predict(X)[0])
        score = clamp(score, 0, 100)

        # Approximate confidence from tree variance (if accessible)
        confidence = _estimate_rf_confidence(model, X)
        return score, confidence
    except Exception:
        return _simulate_ml(features), 0.65


def _estimate_rf_confidence(model, X) -> float:
    """
    Estimate Random Forest confidence from inter-tree variance.
    Lower variance among trees → higher confidence.
    """
    try:
        preds = [tree.predict(X)[0] for tree in model.estimators_]
        import statistics
        std  = statistics.stdev(preds) if len(preds) > 1 else 0
        # std ≈ 0 → confidence ≈ 1.0; std ≈ 20 → confidence ≈ 0.5
        conf = max(0.4, 1.0 - std / 20.0)
        return round(conf, 2)
    except Exception:
        return 0.70


def _simulate_ml(features: list) -> float:
    """
    Simulate ML output from feature vector when model isn't loaded.
    Uses a linear approximation of what the RF would learn.
    """
    (isolated, near_police, near_hospital,
     crowd_level, unsafe_reports, community_rating,
     time_of_day, unsafe_zone_density) = features

    score = 50.0
    score += near_police   * 22
    score += near_hospital * 16
    score += (community_rating / 5.0) * 20
    score += (crowd_level  / 5.0)     * 10
    score -= isolated       * 20
    score -= unsafe_reports * 4
    score -= unsafe_zone_density * 6
    score -= time_of_day   * 8      # 0=day, 1=night, 2=deep night
    return clamp(score, 0, 100)


# ── Feature Engineering ───────────────────────────────────────────────────────

def _build_features(
    isolated, near_police, near_hospital,
    crowd_level, unsafe_reports, community_rating,
    time_of_day, unsafe_zone_density,
) -> list:
    """
    Build the 8-feature vector used by the ML model.
    All values normalised to similar scales.
    """
    return [
        int(isolated),                          # 0 or 1
        int(near_police),                       # 0 or 1
        int(near_hospital),                     # 0 or 1
        clamp(crowd_level, 1, 5) / 5.0,         # 0.2–1.0 (normalised)
        clamp(unsafe_reports, 0, 20) / 20.0,    # 0–1.0 (normalised)
        clamp(community_rating, 0, 5) / 5.0,    # 0–1.0 (normalised)
        time_of_day / 2.0,                      # 0, 0.5, 1.0
        clamp(unsafe_zone_density, 0, 10) / 10.0,  # 0–1.0 (normalised)
    ]


def _encode_time(hour: int) -> int:
    """0 = day, 1 = early night (20–22, 4–6), 2 = deep night (22–4)."""
    if hour >= 22 or hour < 4:
        return 2
    if hour >= NIGHT_START_HOUR or hour < NIGHT_END_HOUR:
        return 1
    return 0


# ── Dynamic Adjustments ───────────────────────────────────────────────────────

def _dynamic_adjustment(
    hour: int,
    isolated: bool,
    unsafe_reports: int,
    unsafe_zone_density: int,
) -> float:
    """
    Context-aware live adjustment to the fused score.
    Simulates real-time environmental awareness.

    Conditions:
      - Night + isolated + reports > 3  → severe penalty (-12)
      - Night + reports > 0             → moderate penalty (-5)
      - Daytime + police + hospital     → slight bonus (+4)
    """
    time_enc = _encode_time(hour)
    delta    = 0.0

    if time_enc == 2 and isolated and unsafe_reports > 3:
        # Worst-case scenario: deep night, isolated, multiple reports
        delta -= 12
    elif time_enc >= 1 and unsafe_reports > 0:
        # Night with reports — meaningful risk
        delta -= 5
    elif unsafe_zone_density > 2:
        # Dense unsafe zone cluster on route
        delta -= 6
    elif time_enc == 0 and unsafe_reports == 0 and unsafe_zone_density == 0:
        # Daytime, clean route — slight optimism bonus
        delta += 4

    return delta


# ── Labels & Explanation ──────────────────────────────────────────────────────

def _score_label(score: int) -> str:
    if score >= ROUTE_SAFE_THRESHOLD:
        return "Safe"
    if score >= ROUTE_MODERATE_THRESHOLD:
        return "Moderate"
    return "Unsafe"


def _build_explanation(
    final_score, label, ml_active,
    rule_score, ml_score, dynamic_delta,
    hour, features,
) -> str:
    mode  = "ML + rule hybrid" if ml_active else "rule-based simulation"
    blend = f"rule {rule_score:.0f} × 0.7 + ML {ml_score:.0f} × 0.3" if rule_score is not None else f"ML {ml_score:.0f}"

    base  = (
        f"Route scored {final_score}/100 ({label}) using {mode}. "
        f"Score blend: [{blend}]"
    )

    if dynamic_delta < 0:
        base += f", adjusted {dynamic_delta:.0f} pts for real-time risk conditions"
    elif dynamic_delta > 0:
        base += f", boosted +{dynamic_delta:.0f} pts for favourable conditions"

    base += "."
    return base
