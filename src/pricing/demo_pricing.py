#!/usr/bin/env python
"""
Wayzyy Dynamic Pricing — Demo / Smoke-test Script
===================================================

Loads a handful of real London properties from the training set and
runs them through the pricing engine on dates representing low,
medium, and high market pressure.

Usage (from project root):
    python src/pricing/demo_pricing.py
"""

from __future__ import annotations

import ast
import sys
from pathlib import Path

import numpy as np
import pandas as pd

# Ensure project root is on sys.path so we can import the engine
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "src"))

from pricing.pricing_engine import PricingEngine, PricingConfig

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
TRAIN_CSV = PROJECT_ROOT / "data" / "raw" / "rental-price-predict" / "airbnb_train.csv"


from features.property_transformer import transform_property_features


# ---------------------------------------------------------------------------
# Demo properties — hand-picked archetypes
# ---------------------------------------------------------------------------
def load_demo_properties(n: int = 4) -> pd.DataFrame:
    """Load a few diverse London properties from the training CSV."""
    df = pd.read_csv(TRAIN_CSV)
    london = df[df["city"] == "London"].copy()

    # Clean price
    if london["price"].dtype == "O":
        london["price"] = (
            london["price"]
            .str.replace("$", "", regex=False)
            .str.replace(",", "", regex=False)
            .astype(float)
        )
    london = london[(london["price"] > 0) & (london["price"] <= 1000)]

    # Pick diverse examples: budget, mid-range, premium, shared room
    budget = london[
        (london["price"] >= 30) & (london["price"] <= 60)
        & (london["room_type"] == "Entire home/apt")
    ].head(1)
    mid = london[
        (london["price"] >= 100) & (london["price"] <= 180)
        & (london["room_type"] == "Entire home/apt")
        & (london["bedrooms"] >= 2)
    ].head(1)
    premium = london[
        (london["price"] >= 300) & (london["price"] <= 600)
        & (london["room_type"] == "Entire home/apt")
    ].head(1)
    private = london[
        (london["room_type"] == "Private room")
        & (london["price"] >= 40) & (london["price"] <= 90)
    ].head(1)

    samples = pd.concat([budget, mid, premium, private], ignore_index=True)
    return samples


# ---------------------------------------------------------------------------
# Test dates — chosen to represent low / medium / high pressure
# ---------------------------------------------------------------------------
TEST_DATES = {
    "low":    "2026-08-24",   # market_pressure_score ≈ 2.9 (Normal Monday)
    "medium": "2026-08-03",   # market_pressure_score ≈ 19.7 (Normal Monday)
    "high":   "2026-06-19",   # market_pressure_score ≈ 96.0 (Weekend Friday)
    "event":  "2026-12-31",   # New Year's Eve (Event)
}


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    print("=" * 72)
    print("  Wayzyy Dynamic Pricing Engine -- Demo")
    print("=" * 72)

    # Load engine
    print("\nLoading pricing engine ...")
    engine = PricingEngine()
    print(f"  Model loaded:  {engine.model.named_steps['model'].__class__.__name__}")
    print(f"  Date features: {len(engine.date_features)} rows")
    print(f"  Config:        max_adjustment={engine.config.max_adjustment:.0%}, "
          f"weekend_premium={engine.config.weekend_premium:.0%}, "
          f"min=${engine.config.min_price}, max=${engine.config.max_price}")

    # Load demo properties
    print("\nLoading demo properties ...")
    props_df = load_demo_properties()
    print(f"  Loaded {len(props_df)} properties\n")

    # Run tests
    for idx, prop_row in props_df.iterrows():
        label = (
            f"{prop_row.get('property_type', '?')} | "
            f"{prop_row.get('room_type', '?')} | "
            f"{prop_row.get('bedrooms', '?')} bed | "
            f"actual_price=${prop_row.get('price', '?')}"
        )
        print("-" * 72)
        print(f"Property #{idx + 1}: {label}")
        print("-" * 72)

        features = transform_property_features(prop_row)

        for pressure_label, date_str in TEST_DATES.items():
            rec = engine.recommend_price(features, date_str)
            print(f"\n  [{pressure_label.upper()} pressure]  Date: {date_str}")
            print(rec)
            print()

    # --- Also demo: custom config with more aggressive adjustment ---
    print("=" * 72)
    print("  Bonus: aggressive config (+/-25 %, 5 % weekend premium)")
    print("=" * 72)
    aggressive = PricingConfig(max_adjustment=0.25, weekend_premium=0.05)
    engine_agg = PricingEngine(config=aggressive)

    if len(props_df) > 0:
        features = transform_property_features(props_df.iloc[0])
        for pressure_label, date_str in TEST_DATES.items():
            rec = engine_agg.recommend_price(features, date_str)
            print(f"\n  [{pressure_label.upper()} pressure]  Date: {date_str}")
            print(rec)
            print()


if __name__ == "__main__":
    main()
