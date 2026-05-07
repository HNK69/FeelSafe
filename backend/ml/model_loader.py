"""
ml/model_loader.py
===================
Centralised model loader with graceful fallback.

Strategy:
  - Try to load .pkl models from ml/models/ using joblib.
  - If a model file is missing or corrupt, log a warning and return None.
  - Callers check for None and fall back to rule-based scoring.

This ensures the app NEVER crashes if models haven't been trained yet.
"""

import os
import logging

logger = logging.getLogger("feelsafe.model_loader")

# ── Paths ─────────────────────────────────────────────────────────────────────
_ML_DIR     = os.path.dirname(os.path.abspath(__file__))
_MODELS_DIR = os.path.join(_ML_DIR, "models")

THREAT_MODEL_PATH    = os.path.join(_MODELS_DIR, "threat_model.pkl")
ROUTE_MODEL_PATH     = os.path.join(_MODELS_DIR, "route_model.pkl")
VECTORIZER_PATH      = os.path.join(_MODELS_DIR, "threat_vectorizer.pkl")

# ── In-memory cache (load once per process) ───────────────────────────────────
_cache: dict = {}


def load_threat_model():
    """
    Load the threat classification pipeline (TF-IDF + Logistic Regression).
    Returns the sklearn pipeline, or None if unavailable.
    """
    return _load("threat_model", THREAT_MODEL_PATH)


def load_route_model():
    """
    Load the route safety regression model (Random Forest).
    Returns the sklearn model, or None if unavailable.
    """
    return _load("route_model", ROUTE_MODEL_PATH)


def load_threat_vectorizer():
    """
    Load the TF-IDF vectorizer (if stored separately from the pipeline).
    Returns the vectorizer, or None if unavailable.
    """
    return _load("threat_vectorizer", VECTORIZER_PATH)


def models_available() -> dict:
    """
    Quick status check — useful for the /health endpoint or debug views.
    Returns dict with availability flags for each model.
    """
    return {
        "threat_model":     os.path.isfile(THREAT_MODEL_PATH),
        "route_model":      os.path.isfile(ROUTE_MODEL_PATH),
        "threat_vectorizer": os.path.isfile(VECTORIZER_PATH),
    }


# ── Internal ──────────────────────────────────────────────────────────────────

def _load(key: str, path: str):
    """Load a joblib artifact with caching and error handling."""
    if key in _cache:
        return _cache[key]

    if not os.path.isfile(path):
        logger.warning(
            "[ModelLoader] '%s' not found at %s. "
            "Run the training script first. Falling back to rule-based mode.",
            key, path,
        )
        _cache[key] = None
        return None

    try:
        import joblib
        obj = joblib.load(path)
        _cache[key] = obj
        logger.info("[ModelLoader] Loaded '%s' from %s", key, path)
        return obj
    except Exception as exc:
        logger.error(
            "[ModelLoader] Failed to load '%s': %s. Falling back to rule-based mode.",
            key, exc,
        )
        _cache[key] = None
        return None


def invalidate_cache():
    """Force reload of all models on next access (call after retraining)."""
    _cache.clear()
    logger.info("[ModelLoader] Model cache cleared.")
