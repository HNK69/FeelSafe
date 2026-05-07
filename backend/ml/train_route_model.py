"""
ml/train_route_model.py
========================
Train a lightweight Random Forest Regressor for route safety scoring.

Dataset: 60 synthetic examples with 8 features each.
Output:  ml/models/route_model.pkl

Feature vector (8 features):
  [isolated, near_police, near_hospital, crowd_level,
   unsafe_reports, community_rating, time_of_day, unsafe_zone_density]

All features are normalised to [0, 1] range before training.

Usage:
    cd backend
    python ml/train_route_model.py
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import numpy as np
import joblib
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import cross_val_score
from sklearn.metrics import mean_absolute_error

# ── Output Path ───────────────────────────────────────────────────────────────
_ML_DIR     = os.path.dirname(os.path.abspath(__file__))
_MODELS_DIR = os.path.join(_ML_DIR, "models")
os.makedirs(_MODELS_DIR, exist_ok=True)
OUTPUT_PATH = os.path.join(_MODELS_DIR, "route_model.pkl")

# ── Synthetic Training Dataset ────────────────────────────────────────────────
# Each row: [isolated, near_police, near_hospital, crowd_level(norm),
#            unsafe_reports(norm), community_rating(norm), time(0/0.5/1.0),
#            unsafe_zone_density(norm)]
# Label: safety score 0–100
#
# Feature normalisations used (must match route_model.py):
#   isolated: 0/1          near_police: 0/1      near_hospital: 0/1
#   crowd_level: /5.0      unsafe_reports: /20   community_rating: /5
#   time_of_day: /2        unsafe_zone_density: /10

_D = [
    # ── Very Safe Routes (score 78–95) ──────────────────────────────────────
    # iso  pol   hosp  crowd  reports  rating  time  zones  score
    [0,   1,    1,    1.0,   0.00,    1.00,   0.0,  0.0,   92],
    [0,   1,    1,    0.8,   0.00,    0.90,   0.0,  0.0,   88],
    [0,   1,    1,    1.0,   0.05,    0.88,   0.0,  0.0,   85],
    [0,   1,    1,    0.8,   0.05,    0.80,   0.0,  0.0,   83],
    [0,   1,    0,    1.0,   0.00,    0.90,   0.0,  0.0,   82],
    [0,   1,    1,    0.6,   0.05,    0.82,   0.0,  0.0,   80],
    [0,   1,    1,    0.6,   0.10,    0.76,   0.0,  0.0,   78],
    [0,   0,    1,    1.0,   0.00,    1.00,   0.0,  0.0,   78],
    [0,   1,    1,    0.8,   0.00,    0.80,   0.5,  0.0,   78],   # night, still safe
    [0,   1,    1,    0.6,   0.00,    0.84,   0.5,  0.0,   76],

    # ── Safe-Moderate (score 60–77) ───────────────────────────────────────────
    [0,   1,    0,    0.6,   0.10,    0.70,   0.0,  0.0,   74],
    [0,   0,    1,    0.8,   0.00,    0.80,   0.0,  0.0,   72],
    [0,   1,    0,    0.8,   0.05,    0.68,   0.5,  0.0,   70],
    [0,   1,    1,    0.4,   0.15,    0.70,   0.0,  0.0,   70],
    [0,   0,    1,    0.6,   0.10,    0.70,   0.0,  0.1,   68],
    [0,   1,    0,    0.6,   0.10,    0.64,   0.5,  0.0,   67],
    [0,   0,    0,    1.0,   0.00,    0.80,   0.0,  0.0,   65],
    [0,   1,    0,    0.4,   0.20,    0.60,   0.0,  0.0,   65],
    [0,   0,    1,    0.6,   0.15,    0.68,   0.5,  0.1,   63],
    [0,   1,    0,    0.6,   0.15,    0.60,   0.5,  0.0,   62],
    [0,   0,    0,    0.8,   0.05,    0.72,   0.0,  0.0,   62],
    [0,   0,    1,    0.4,   0.15,    0.64,   0.5,  0.1,   60],

    # ── Moderate (score 40–59) ────────────────────────────────────────────────
    [0,   0,    0,    0.6,   0.15,    0.60,   0.5,  0.1,   58],
    [1,   1,    0,    0.4,   0.10,    0.60,   0.0,  0.0,   56],
    [0,   0,    0,    0.4,   0.20,    0.60,   0.5,  0.0,   55],
    [1,   1,    1,    0.4,   0.10,    0.60,   0.5,  0.0,   54],
    [0,   0,    0,    0.4,   0.25,    0.56,   0.5,  0.1,   52],
    [1,   0,    1,    0.4,   0.10,    0.60,   0.5,  0.0,   52],
    [0,   1,    0,    0.2,   0.30,    0.50,   1.0,  0.1,   50],
    [1,   1,    0,    0.4,   0.15,    0.56,   0.5,  0.1,   49],
    [1,   0,    0,    0.6,   0.10,    0.62,   0.5,  0.0,   48],
    [0,   0,    0,    0.4,   0.30,    0.52,   1.0,  0.1,   46],
    [1,   0,    1,    0.2,   0.20,    0.52,   0.5,  0.2,   46],
    [1,   1,    0,    0.2,   0.20,    0.52,   1.0,  0.1,   44],
    [0,   0,    0,    0.4,   0.35,    0.48,   1.0,  0.2,   43],
    [1,   0,    0,    0.4,   0.20,    0.52,   0.5,  0.1,   42],
    [0,   0,    0,    0.2,   0.35,    0.48,   0.5,  0.2,   41],
    [1,   0,    0,    0.2,   0.25,    0.50,   1.0,  0.1,   40],

    # ── Unsafe (score 15–39) ─────────────────────────────────────────────────
    [1,   0,    0,    0.2,   0.30,    0.44,   1.0,  0.2,   38],
    [1,   0,    0,    0.2,   0.35,    0.40,   1.0,  0.3,   34],
    [1,   0,    0,    0.2,   0.40,    0.40,   1.0,  0.3,   30],
    [1,   0,    0,    0.0,   0.45,    0.36,   1.0,  0.3,   28],
    [1,   0,    0,    0.2,   0.40,    0.36,   1.0,  0.4,   26],
    [1,   0,    0,    0.0,   0.50,    0.32,   1.0,  0.4,   24],
    [1,   0,    0,    0.2,   0.45,    0.32,   1.0,  0.5,   22],
    [1,   0,    0,    0.0,   0.55,    0.28,   1.0,  0.5,   20],
    [1,   0,    0,    0.0,   0.60,    0.24,   1.0,  0.6,   18],
    [1,   0,    0,    0.0,   0.65,    0.20,   1.0,  0.7,   16],

    # ── Additional edge cases ─────────────────────────────────────────────────
    [0,   1,    1,    0.8,   0.00,    0.92,   1.0,  0.0,   74],   # night but excellent route
    [1,   1,    1,    0.6,   0.05,    0.80,   0.0,  0.0,   70],   # isolated but police+hospital
    [0,   0,    0,    1.0,   0.00,    0.60,   0.0,  0.0,   62],   # busy but no POIs
    [1,   0,    0,    0.0,   0.50,    0.40,   0.5,  0.3,   28],   # isolated, reports, night
    [0,   1,    0,    0.6,   0.00,    0.76,   1.0,  0.0,   68],   # deep night, police only
    [1,   1,    1,    0.2,   0.25,    0.52,   1.0,  0.2,   42],   # deep night but POIs
    [0,   0,    0,    0.8,   0.10,    0.68,   0.0,  0.0,   60],   # daytime, average
    [1,   0,    1,    0.0,   0.40,    0.36,   1.0,  0.4,   22],   # hospital but isolated+night
    [0,   1,    1,    1.0,   0.00,    1.00,   0.5,  0.0,   84],   # police+hospital, early night
    [1,   0,    0,    0.4,   0.15,    0.56,   0.0,  0.0,   44],   # isolated, daytime
]

FEATURES = np.array([row[:8] for row in _D], dtype=np.float32)
SCORES   = np.array([row[8]  for row in _D], dtype=np.float32)

FEATURE_NAMES = [
    "isolated", "near_police", "near_hospital", "crowd_level",
    "unsafe_reports", "community_rating", "time_of_day", "unsafe_zone_density",
]


def train():
    print(f"\n[TrainRoute] Training on {len(FEATURES)} examples ...")
    print(f"  Score range: {SCORES.min():.0f} – {SCORES.max():.0f}")
    print(f"  Feature shape: {FEATURES.shape}")

    # ── Build Model ───────────────────────────────────────────────────────────
    # RandomForest: small (50 trees), fast, handles non-linear interactions well
    model = RandomForestRegressor(
        n_estimators=50,      # Small enough for instant inference
        max_depth=8,           # Prevent overfitting on small dataset
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1,
    )

    # ── Cross-validation ──────────────────────────────────────────────────────
    cv_scores = cross_val_score(
        model, FEATURES, SCORES,
        cv=5, scoring="neg_mean_absolute_error",
    )
    print(f"  5-fold CV MAE: {-cv_scores.mean():.2f} (+/- {cv_scores.std():.2f})")

    # ── Final Fit ─────────────────────────────────────────────────────────────
    model.fit(FEATURES, SCORES)

    # Training MAE
    train_preds = model.predict(FEATURES)
    mae = mean_absolute_error(SCORES, train_preds)
    print(f"  Training MAE:  {mae:.2f}")

    # Feature importance
    importances = sorted(
        zip(FEATURE_NAMES, model.feature_importances_),
        key=lambda x: x[1], reverse=True,
    )
    print("  Feature importances:")
    for name, imp in importances:
        bar = "#" * int(imp * 40)
        print(f"    {name:<25} {imp:.3f}  {bar}")

    # ── Save ──────────────────────────────────────────────────────────────────
    joblib.dump(model, OUTPUT_PATH, compress=3)
    size_kb = os.path.getsize(OUTPUT_PATH) / 1024
    print(f"\n  Saved to: {OUTPUT_PATH}  ({size_kb:.1f} KB)")

    # ── Sanity Check ──────────────────────────────────────────────────────────
    _sanity_check(model)


def _sanity_check(model):
    """Test model predictions on intuitive edge-case scenarios."""
    scenarios = [
        {
            "desc":     "Ideal daytime route (police + hospital, busy, no reports)",
            "features": [0, 1, 1, 1.0, 0.00, 1.00, 0.0, 0.0],
            "expected": (75, 100),
        },
        {
            "desc":     "Moderate route (night, no POIs, average rating)",
            "features": [0, 0, 0, 0.6, 0.10, 0.60, 0.5, 0.1],
            "expected": (45, 70),
        },
        {
            "desc":     "Dangerous route (isolated, deep night, many reports)",
            "features": [1, 0, 0, 0.0, 0.60, 0.20, 1.0, 0.7],
            "expected": (0, 35),
        },
    ]

    print("\n  Sanity checks:")
    all_pass = True
    for s in scenarios:
        X    = np.array(s["features"]).reshape(1, -1)
        pred = float(model.predict(X)[0])
        lo, hi = s["expected"]
        ok   = lo <= pred <= hi
        if not ok:
            all_pass = False
        print(f"    [{'PASS' if ok else 'FAIL'}] {s['desc']}")
        print(f"         Predicted: {pred:.1f}   Expected range: {lo}–{hi}")

    if all_pass:
        print("\n  All sanity checks passed.")
    else:
        print("\n  Some checks failed — consider expanding training data.")

    print("\n[TrainRoute] Done. Model is ready for inference.\n")


if __name__ == "__main__":
    train()
