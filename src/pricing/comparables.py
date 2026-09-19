from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Optional
import numpy as np
import pandas as pd
from sklearn.neighbors import BallTree

# ---------------------------------------------------------------------------
# Paths & Default Config
# ---------------------------------------------------------------------------
_THIS_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = _THIS_DIR.parent.parent
DEFAULT_LISTINGS_PATH = PROJECT_ROOT / "data" / "raw" / "listings.csv.gz"

@dataclass
class ComparablesConfig:
    min_comps: int = 5
    max_comps: int = 30
    initial_radius_km: float = 1.0
    max_radius_km: float = 5.0
    
    # Cleaning constraints (same as V1 model)
    min_price: float = 1.0
    max_price: float = 1000.0


class ComparableFinder:
    """
    Finds comparable listings from the ~92k London listings dataset 
    using a progressively relaxed filtering strategy.
    """
    def __init__(
        self, 
        listings_path: Optional[Path] = None, 
        config: Optional[ComparablesConfig] = None
    ):
        self.config = config or ComparablesConfig()
        self.listings_path = listings_path or DEFAULT_LISTINGS_PATH
        
        self.df = pd.DataFrame()
        self.tree: Optional[BallTree] = None
        
        self._load_and_prepare_data()

    def _load_and_prepare_data(self):
        """Load listings, clean price, and build BallTree for spatial queries."""
        if not self.listings_path.exists():
            raise FileNotFoundError(f"Listings file not found: {self.listings_path}")
            
        # Load only necessary columns to save memory
        usecols = [
            'id', 'latitude', 'longitude', 'room_type', 
            'property_type', 'accommodates', 'bedrooms', 
            'bathrooms', 'price', 'review_scores_rating',
            'number_of_reviews', 'amenities'
        ]
        
        # In case some columns are missing, we load what we can
        try:
            df = pd.read_csv(self.listings_path, compression='gzip', usecols=usecols, low_memory=False)
        except ValueError as e:
            # Fallback if usecols don't match exactly
            df = pd.read_csv(self.listings_path, compression='gzip', low_memory=False)
            df = df[[c for c in usecols if c in df.columns]]

        # Clean price
        if 'price' in df.columns and df['price'].dtype == 'O':
            df['price'] = df['price'].str.replace('$', '', regex=False)\
                                     .str.replace(',', '', regex=False)\
                                     .astype(float)
                                     
        if 'amenities' in df.columns:
            df['num_amenities'] = df['amenities'].astype(str).str.count(',') + 1
        else:
            df['num_amenities'] = np.nan
                                     
        # Filter valid prices
        df = df[
            (df['price'] >= self.config.min_price) & 
            (df['price'] <= self.config.max_price)
        ].copy()
        
        # Drop rows with invalid coordinates
        df = df.dropna(subset=['latitude', 'longitude'])
        
        self.df = df.reset_index(drop=True)
        
        # Build BallTree (requires radians for Haversine distance)
        coords = np.radians(self.df[['latitude', 'longitude']].values)
        self.tree = BallTree(coords, metric='haversine')

    def find_comparables(self, target: Dict[str, Any], target_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Given target property features, find comparable listings and calculate stats.
        Progressively relaxes filters if min_comps is not met.
        """
        lat = target.get('latitude')
        lon = target.get('longitude')
        
        if pd.isna(lat) or pd.isna(lon):
            return self._empty_stats("Missing latitude/longitude in target property.")
            
        # 1. Spatial query: Find all listings within max_radius_km
        # Earth radius in km ~ 6371.0
        max_radius_rad = self.config.max_radius_km / 6371.0
        target_coords = np.radians([[lat, lon]])
        
        # query_radius returns an array of arrays of indices
        idx_within_max = self.tree.query_radius(target_coords, r=max_radius_rad)[0]
        
        if len(idx_within_max) == 0:
            return self._empty_stats(f"No listings found within {self.config.max_radius_km}km.")
            
        # Get local dataframe
        local_df = self.df.iloc[idx_within_max].copy()
        
        # Distance calculation in km for exact filtering
        # (Haversine formula approximation)
        dlat = np.radians(local_df['latitude'] - lat)
        dlon = np.radians(local_df['longitude'] - lon)
        a = np.sin(dlat/2)**2 + np.cos(np.radians(lat)) * np.cos(np.radians(local_df['latitude'])) * np.sin(dlon/2)**2
        c = 2 * np.arcsin(np.sqrt(a))
        local_df['dist_km'] = 6371.0 * c
        
        # Exclude target property itself
        if target_id is not None and 'id' in local_df.columns:
            local_df = local_df[local_df['id'] != target_id]
        else:
            # If no ID provided, exclude listings with distance effectively 0 
            # and same exact features to be safe.
            local_df = local_df[local_df['dist_km'] > 0.001]
            
        if len(local_df) == 0:
            return self._empty_stats("No other listings found after excluding target.")

        # Target attributes
        r_type = target.get('room_type')
        p_type = target.get('property_type')
        acc = target.get('accommodates')
        beds = target.get('bedrooms')
        baths = target.get('bathrooms')

        # Add quality filter config
        # Target attributes
        t_rating = target.get('review_scores_rating')
        t_amenities_raw = target.get('amenities')
        t_num_amenities = np.nan
        if pd.notna(t_amenities_raw):
            t_num_amenities = str(t_amenities_raw).count(',') + 1

        # Matching levels (progressively relaxed)
        # Level 1: Strict match within initial_radius
        m1 = local_df['dist_km'] <= self.config.initial_radius_km
        if pd.notna(r_type): m1 &= (local_df['room_type'] == r_type)
        if pd.notna(p_type): m1 &= (local_df['property_type'] == p_type)
        if pd.notna(acc): m1 &= (local_df['accommodates'] == acc)
        if pd.notna(beds): m1 &= (local_df['bedrooms'] == beds)
        if pd.notna(baths): 
            # safe bathrooms compare (handling NaNs in dataframe)
            m1 &= (local_df['bathrooms'].isna() | (local_df['bathrooms'] == baths))

        matched = local_df[m1]
        
        # Level 2: Relax bathrooms and property_type, allow slight variation in size
        if len(matched) < self.config.min_comps:
            m2 = local_df['dist_km'] <= self.config.initial_radius_km
            if pd.notna(r_type): m2 &= (local_df['room_type'] == r_type)
            if pd.notna(acc): m2 &= (local_df['accommodates'].between(acc - 1, acc + 1))
            if pd.notna(beds): m2 &= (local_df['bedrooms'].between(beds - 1, beds + 1))
            matched = local_df[m2]
            
        # Level 3: Relax distance up to max_radius, slightly wider size
        if len(matched) < self.config.min_comps:
            m3 = local_df['dist_km'] <= self.config.max_radius_km
            if pd.notna(r_type): m3 &= (local_df['room_type'] == r_type)
            if pd.notna(acc): m3 &= (local_df['accommodates'].between(acc - 2, acc + 2))
            matched = local_df[m3]
            
        # Level 4: Just room_type and max distance
        if len(matched) < self.config.min_comps:
            m4 = local_df['dist_km'] <= self.config.max_radius_km
            if pd.notna(r_type): m4 &= (local_df['room_type'] == r_type)
            matched = local_df[m4]

        # Final check for structural matches
        if len(matched) == 0:
            return self._empty_stats("No comparable listings found even with relaxed filters.")
            
        initial_candidates = len(matched)
        quality_relaxed = False

        # --- QUALITY FILTERING STAGE ---
        if initial_candidates > self.config.min_comps:
            m_q1 = pd.Series(True, index=matched.index)
            
            # Strict quality bounds (+/- 0.3 rating, +/- 30% amenities)
            if pd.notna(t_rating):
                m_q1 &= matched['review_scores_rating'].between(t_rating - 0.3, t_rating + 0.3) | matched['review_scores_rating'].isna()
                
            if pd.notna(t_num_amenities):
                lower_am = t_num_amenities * 0.7
                upper_am = t_num_amenities * 1.3
                m_q1 &= matched['num_amenities'].between(lower_am, upper_am) | matched['num_amenities'].isna()
                
            strict_matched = matched[m_q1]
            
            if len(strict_matched) >= self.config.min_comps:
                matched = strict_matched
            else:
                quality_relaxed = True
                # Moderate quality bounds (+/- 0.6 rating, +/- 50% amenities)
                m_q2 = pd.Series(True, index=matched.index)
                if pd.notna(t_rating):
                    m_q2 &= matched['review_scores_rating'].between(t_rating - 0.6, t_rating + 0.6) | matched['review_scores_rating'].isna()
                if pd.notna(t_num_amenities):
                    lower_am = t_num_amenities * 0.5
                    upper_am = t_num_amenities * 1.5
                    m_q2 &= matched['num_amenities'].between(lower_am, upper_am) | matched['num_amenities'].isna()
                    
                mod_matched = matched[m_q2]
                
                if len(mod_matched) >= self.config.min_comps:
                    matched = mod_matched
                # else fallback to original matched set (structural only)
        
        final_candidates = len(matched)
            
        # Sort by distance and limit to max_comps
        matched = matched.sort_values('dist_km').head(self.config.max_comps)
        
        # Calculate stats
        prices = matched['price']
        return {
            "comparable_count": len(prices),
            "median_price": float(prices.median()),
            "p25_price": float(prices.quantile(0.25)),
            "p75_price": float(prices.quantile(0.75)),
            "mean_price": float(prices.mean()),
            "message": f"Found {len(prices)} comps within {matched['dist_km'].max():.2f}km.",
            "initial_candidates": initial_candidates,
            "final_candidates": final_candidates,
            "quality_relaxed": quality_relaxed
        }
        
    def _empty_stats(self, msg: str) -> Dict[str, Any]:
        return {
            "comparable_count": 0,
            "median_price": None,
            "p25_price": None,
            "p75_price": None,
            "mean_price": None,
            "message": msg,
            "initial_candidates": 0,
            "final_candidates": 0,
            "quality_relaxed": False
        }

# Global singleton for easy reuse without reloading 92k rows
_default_finder: Optional[ComparableFinder] = None

def get_comparables(target: Dict[str, Any], target_id: Optional[int] = None) -> Dict[str, Any]:
    global _default_finder
    if _default_finder is None:
        try:
            _default_finder = ComparableFinder()
        except FileNotFoundError as e:
            # The London listings dataset is optional — degrade to "no
            # comparables" rather than failing the whole recommendation.
            return {
                "comparable_count": 0,
                "median_price": None,
                "p25_price": None,
                "p75_price": None,
                "mean_price": None,
                "message": f"Comparables dataset unavailable: {e}",
                "initial_candidates": 0,
                "final_candidates": 0,
                "quality_relaxed": False,
            }
    return _default_finder.find_comparables(target, target_id)
