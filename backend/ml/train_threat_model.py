"""
ml/train_threat_model.py
=========================
Train a lightweight TF-IDF + Logistic Regression threat classifier.

Dataset: 55 synthetic examples covering LOW / MEDIUM / HIGH risk scenarios.
Run this script once to generate: ml/models/threat_model.pkl

Usage:
    cd backend
    python ml/train_threat_model.py
"""

import os
import sys

# Allow imports from backend root
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import joblib
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import cross_val_score
import numpy as np

# ── Output Path ───────────────────────────────────────────────────────────────
_ML_DIR     = os.path.dirname(os.path.abspath(__file__))
_MODELS_DIR = os.path.join(_ML_DIR, "models")
os.makedirs(_MODELS_DIR, exist_ok=True)
OUTPUT_PATH = os.path.join(_MODELS_DIR, "threat_model.pkl")

# ── Synthetic Training Dataset ────────────────────────────────────────────────
# Labels: 0 = LOW, 1 = MEDIUM, 2 = HIGH
# Designed to cover escalation patterns, ambiguous cases, and distress signals.

TRAINING_DATA = [
    # ── LOW RISK (label = 0) ──────────────────────────────────────────────────
    ("I am on my way home, everything is fine",                 0),
    ("Just reached my destination safely",                      0),
    ("Walking through the park, feels peaceful",                0),
    ("Cab is on route, driver seems professional",              0),
    ("I can see the market, lots of people around",             0),
    ("Arrived at office, all good",                             0),
    ("Heading back home from college, safe and sound",          0),
    ("Nice weather for a walk today",                           0),
    ("I am in a busy shopping area with lots of people",        0),
    ("I reached home safely, no issues",                        0),
    ("Starting my trip now, will update",                       0),
    ("On the main road, plenty of lights and traffic",          0),

    # ── MEDIUM RISK (label = 1) ───────────────────────────────────────────────
    ("I feel a bit uncomfortable here",                         1),
    ("There is a man staring at me for a while",                1),
    ("The area looks deserted and dark",                        1),
    ("I think someone might be following me but not sure",      1),
    ("This road looks isolated, I am alone here",               1),
    ("The driver took a slightly different turn",               1),
    ("I am in an unfamiliar area, not sure of the route",       1),
    ("It is getting late and the street lights are off",        1),
    ("A group of men near me seem suspicious",                  1),
    ("This route is darker than I expected",                    1),
    ("I feel uneasy, the area has no people",                   1),
    ("My phone battery is very low and I am alone",             1),
    ("This looks like a shortcut but seems unsafe",             1),
    ("I can hear footsteps behind me but no one visible",       1),
    ("The cab driver is not talking and seems aggressive",      1),
    ("There is no signal here and I am stuck",                  1),
    ("The place looks abandoned, I am worried",                 1),
    ("I think I am going the wrong way",                        1),

    # ── HIGH RISK (label = 2) ─────────────────────────────────────────────────
    ("Someone is following me please help",                     2),
    ("I am being followed help me now",                         2),
    ("The cab driver changed the route and locked the door",    2),
    ("I feel very unsafe please call police",                   2),
    ("A man grabbed my arm and I ran away please help",         2),
    ("I think I am going to be attacked help",                  2),
    ("Someone is trying to drag me into a car",                 2),
    ("I have been harassed by a group of men on the road",      2),
    ("My driver is drunk and driving recklessly",               2),
    ("The cab stopped in a dark alley and driver is threatening",2),
    ("HELP ME I AM IN DANGER",                                  2),
    ("I am locked in and screaming for help",                   2),
    ("Someone just snatched my bag and ran",                    2),
    ("Please send help immediately I am being followed",        2),
    ("I am trapped in the cab the driver is taking me away",    2),
    ("Eve teasing happening right now call police 100",         2),
    ("I am scared someone is watching me from behind the bush", 2),
    ("The driver is not stopping and ignoring my requests",     2),
    ("Help help help I am being attacked near MG road",         2),
    ("SOS emergency please track my location now",              2),
    ("I have been assaulted please call ambulance immediately", 2),
    ("Men are following my auto and threatening the driver",    2),
    ("I can see someone with a weapon near me",                 2),
    ("My cab has been stopped by unknown people",               2),
    ("I was molested in the bus please report this",            2),
]

TEXTS  = [d[0] for d in TRAINING_DATA]
LABELS = [d[1] for d in TRAINING_DATA]


def train():
    print(f"\n[TrainThreat] Training on {len(TEXTS)} examples ...")
    print(f"  Class distribution: LOW={LABELS.count(0)}, MEDIUM={LABELS.count(1)}, HIGH={LABELS.count(2)}")

    # ── Build Pipeline ────────────────────────────────────────────────────────
    # TF-IDF: unigrams + bigrams, removes common English stopwords
    # LogReg: multi-class, L2 regularised, calibrated probabilities (predict_proba)
    pipeline = Pipeline([
        ("tfidf", TfidfVectorizer(
            ngram_range=(1, 2),
            max_features=500,
            sublinear_tf=True,      # log(1+tf) — reduces impact of high freq terms
            stop_words="english",
            min_df=1,
        )),
        ("clf", LogisticRegression(
            C=2.0,                  # Moderate regularisation
            max_iter=500,
            multi_class="multinomial",
            solver="lbfgs",
            class_weight="balanced",  # Compensate for unequal class sizes
        )),
    ])

    # ── Cross-validation ──────────────────────────────────────────────────────
    cv_scores = cross_val_score(pipeline, TEXTS, LABELS, cv=3, scoring="accuracy")
    print(f"  3-fold CV accuracy: {cv_scores.mean():.2f} (+/- {cv_scores.std():.2f})")

    # ── Final Fit ─────────────────────────────────────────────────────────────
    pipeline.fit(TEXTS, LABELS)

    # ── Save ──────────────────────────────────────────────────────────────────
    joblib.dump(pipeline, OUTPUT_PATH, compress=3)
    size_kb = os.path.getsize(OUTPUT_PATH) / 1024
    print(f"  Saved to: {OUTPUT_PATH}  ({size_kb:.1f} KB)")

    # ── Quick Sanity Test ─────────────────────────────────────────────────────
    _sanity_check(pipeline)


def _sanity_check(pipeline):
    test_cases = [
        ("I am safe and almost home",                        "LOW"),
        ("This road looks dark and I am alone",              "MEDIUM"),
        ("Someone is following me please help",              "HIGH"),
        ("HELP ME I AM IN DANGER",                          "HIGH"),
        ("The driver changed route and locked the door",     "HIGH"),
    ]
    label_names = {0: "LOW", 1: "MEDIUM", 2: "HIGH"}
    print("\n  Sanity checks:")
    all_pass = True
    for text, expected in test_cases:
        pred_idx = pipeline.predict([text])[0]
        pred     = label_names[pred_idx]
        probs    = pipeline.predict_proba([text])[0]
        status   = "PASS" if pred == expected else "FAIL"
        if status == "FAIL":
            all_pass = False
        print(f"    [{status}] '{text[:50]}...' -> {pred} "
              f"(conf: {probs[pred_idx]:.0%}, expected: {expected})")

    if all_pass:
        print("\n  All sanity checks passed.")
    else:
        print("\n  Some checks failed — review training data for edge cases.")

    print("\n[TrainThreat] Done. Model is ready for inference.\n")


if __name__ == "__main__":
    train()
