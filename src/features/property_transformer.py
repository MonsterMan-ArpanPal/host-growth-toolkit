import ast
from typing import Any, Dict, Union
import numpy as np
import pandas as pd

LONDON_LAT = 51.5072
LONDON_LON = -0.1276

TOP_AMENITIES = [
    "wifi", "kitchen", "heating", "smoke alarm", "washer", "dryer",
    "air conditioning", "free parking on premises", "iron",
    "dedicated workspace", "tv", "elevator",
]


def _parse_amenities(x: Any) -> list:
    try:
        if pd.isna(x):
            return []
        if isinstance(x, str):
            return [item.lower() for item in ast.literal_eval(x)]
        if isinstance(x, list):
            return [str(item).lower() for item in x]
    except Exception:
        pass
    return []


def _clean_rate(x: Any) -> float:
    if pd.isna(x):
        return np.nan
    if isinstance(x, str):
        return float(x.replace("%", "")) / 100.0
    return float(x)


def transform_property_features(raw_features: Union[Dict[str, Any], pd.Series]) -> Dict[str, Any]:
    """
    Convert raw Airbnb property features into the engineered format 
    expected by the V1.2 pricing model.
    """
    if isinstance(raw_features, pd.Series):
        raw_features = raw_features.to_dict()

    feats = {}

    # 1. Direct pass-through columns
    direct_cols = [
        "property_type", "room_type", "accommodates", "bathrooms",
        "bedrooms", "beds", "number_of_reviews", "review_scores_rating",
        "latitude", "longitude", "host_neighbourhood",
        "review_scores_location", "host_listings_count",
        "review_scores_accuracy", "review_scores_cleanliness",
        "review_scores_checkin", "review_scores_communication",
        "review_scores_value", "reviews_per_month",
        "number_of_reviews_ltm", "number_of_reviews_l30d",
    ]
    for col in direct_cols:
        feats[col] = raw_features.get(col, np.nan)

    # 2. Amenities
    # Allow skipping if amenities are already transformed
    has_flags = [f"has_{am.replace(' ', '_')}" for am in TOP_AMENITIES]
    if all(flag in raw_features for flag in has_flags):
        for flag in has_flags:
            feats[flag] = raw_features[flag]
        feats["num_amenities"] = raw_features.get("num_amenities", 0)
    else:
        amenities_list = _parse_amenities(raw_features.get("amenities", "[]"))
        feats["num_amenities"] = len(amenities_list)
        for am in TOP_AMENITIES:
            key = f"has_{am.replace(' ', '_')}"
            feats[key] = 1 if any(am in item for item in amenities_list) else 0

    # 3. Host features
    feats["host_is_superhost"] = str(raw_features.get("host_is_superhost", "f")).lower()
    feats["host_response_rate"] = _clean_rate(raw_features.get("host_response_rate"))
    feats["host_acceptance_rate"] = _clean_rate(raw_features.get("host_acceptance_rate"))

    if "host_tenure_years" in raw_features and pd.notna(raw_features["host_tenure_years"]):
        feats["host_tenure_years"] = raw_features["host_tenure_years"]
    else:
        host_since = pd.to_datetime(raw_features.get("host_since"), errors="coerce")
        if pd.notna(host_since):
            feats["host_tenure_years"] = 2024 - host_since.year
        else:
            feats["host_tenure_years"] = np.nan

    # 4. Engineered features
    if "dist_to_center" in raw_features and pd.notna(raw_features["dist_to_center"]):
        feats["dist_to_center"] = raw_features["dist_to_center"]
    else:
        feats["dist_to_center"] = np.sqrt(
            (feats.get("latitude", LONDON_LAT) - LONDON_LAT) ** 2
            + (feats.get("longitude", LONDON_LON) - LONDON_LON) ** 2
        )

    if "guests_per_bedroom" in raw_features and "bathrooms_per_bedroom" in raw_features:
        feats["guests_per_bedroom"] = raw_features["guests_per_bedroom"]
        feats["bathrooms_per_bedroom"] = raw_features["bathrooms_per_bedroom"]
    else:
        bedrooms_safe = max(feats.get("bedrooms", 1) or 1, 1)
        feats["guests_per_bedroom"] = (feats.get("accommodates", 2) or 2) / bedrooms_safe
        feats["bathrooms_per_bedroom"] = (feats.get("bathrooms", 1) or 1) / bedrooms_safe

    return feats
