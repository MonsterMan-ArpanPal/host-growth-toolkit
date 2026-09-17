import sys
from pathlib import Path
import pandas as pd
import numpy as np

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "src"))

from pricing.pricing_engine import PricingEngine
from pricing.comparables import ComparableFinder
from features.property_transformer import transform_property_features

TRAIN_CSV = PROJECT_ROOT / "data" / "raw" / "rental-price-predict" / "airbnb_train.csv"

def get_matched_df(target, target_id, finder):
    """
    Replicates the progressive filtering logic of ComparableFinder 
    to extract the actual matching dataframe for deep analysis.
    """
    lat = target.get('latitude')
    lon = target.get('longitude')
    
    if pd.isna(lat) or pd.isna(lon):
        return pd.DataFrame()
        
    max_radius_rad = finder.config.max_radius_km / 6371.0
    target_coords = np.radians([[lat, lon]])
    idx_within_max = finder.tree.query_radius(target_coords, r=max_radius_rad)[0]
    
    if len(idx_within_max) == 0:
        return pd.DataFrame()
        
    local_df = finder.df.iloc[idx_within_max].copy()
    
    dlat = np.radians(local_df['latitude'] - lat)
    dlon = np.radians(local_df['longitude'] - lon)
    a = np.sin(dlat/2)**2 + np.cos(np.radians(lat)) * np.cos(np.radians(local_df['latitude'])) * np.sin(dlon/2)**2
    c = 2 * np.arcsin(np.sqrt(a))
    local_df['dist_km'] = 6371.0 * c
    
    if target_id is not None and 'id' in local_df.columns:
        local_df = local_df[local_df['id'] != target_id]
    else:
        local_df = local_df[local_df['dist_km'] > 0.001]
        
    if len(local_df) == 0: return pd.DataFrame()

    r_type = target.get('room_type')
    p_type = target.get('property_type')
    acc = target.get('accommodates')
    beds = target.get('bedrooms')
    baths = target.get('bathrooms')

    # Level 1
    m1 = local_df['dist_km'] <= finder.config.initial_radius_km
    if pd.notna(r_type): m1 &= (local_df['room_type'] == r_type)
    if pd.notna(p_type): m1 &= (local_df['property_type'] == p_type)
    if pd.notna(acc): m1 &= (local_df['accommodates'] == acc)
    if pd.notna(beds): m1 &= (local_df['bedrooms'] == beds)
    if pd.notna(baths): m1 &= (local_df['bathrooms'].isna() | (local_df['bathrooms'] == baths))

    matched = local_df[m1]
    
    # Level 2
    if len(matched) < finder.config.min_comps:
        m2 = local_df['dist_km'] <= finder.config.initial_radius_km
        if pd.notna(r_type): m2 &= (local_df['room_type'] == r_type)
        if pd.notna(acc): m2 &= (local_df['accommodates'].between(acc - 1, acc + 1))
        if pd.notna(beds): m2 &= (local_df['bedrooms'].between(beds - 1, beds + 1))
        matched = local_df[m2]
        
    # Level 3
    if len(matched) < finder.config.min_comps:
        m3 = local_df['dist_km'] <= finder.config.max_radius_km
        if pd.notna(r_type): m3 &= (local_df['room_type'] == r_type)
        if pd.notna(acc): m3 &= (local_df['accommodates'].between(acc - 2, acc + 2))
        matched = local_df[m3]
        
    # Level 4
    if len(matched) < finder.config.min_comps:
        m4 = local_df['dist_km'] <= finder.config.max_radius_km
        if pd.notna(r_type): m4 &= (local_df['room_type'] == r_type)
        matched = local_df[m4]

    matched = matched.sort_values('dist_km').head(finder.config.max_comps)
    return matched

def main():
    print("Initializing components...")
    engine = PricingEngine()
    finder = ComparableFinder()
    
    df_props = pd.read_csv(TRAIN_CSV)
    df_london = df_props[df_props['city'] == 'London'].copy()
    # Shuffle
    df_london = df_london.sample(frac=1, random_state=123).reset_index(drop=True)
    
    divergent_cases = []
    
    print("Scanning for >30% divergent cases...")
    for idx, row in df_london.iterrows():
        if len(divergent_cases) >= 50:
            break
            
        prop_dict = row.to_dict()
        target_id = prop_dict.get('id')
        
        # 1. Base Price
        transformed = transform_property_features(prop_dict)
        base_price = engine._predict_base_price(transformed)
        
        # 2. Comps
        comps = finder.find_comparables(prop_dict, target_id)
        if comps['comparable_count'] < 5 or comps['median_price'] is None:
            continue
            
        comp_med = comps['median_price']
        diff_pct = abs(comp_med - base_price) / base_price
        
        if diff_pct > 0.30:
            matched_df = get_matched_df(prop_dict, target_id, finder)
            if len(matched_df) == 0:
                continue
                
            # Analyze similarity
            avg_dist = matched_df['dist_km'].mean()
            max_dist = matched_df['dist_km'].max()
            
            same_room_pct = (matched_df['room_type'] == prop_dict.get('room_type')).mean() * 100
            
            p_type = prop_dict.get('property_type')
            same_prop_pct = (matched_df['property_type'] == p_type).mean() * 100 if pd.notna(p_type) else 0
            
            acc = prop_dict.get('accommodates', 0)
            avg_acc_diff = abs(matched_df['accommodates'] - acc).mean() if pd.notna(acc) else 0
            
            beds = prop_dict.get('bedrooms', 0)
            avg_bed_diff = abs(matched_df['bedrooms'] - beds).mean() if pd.notna(beds) else 0

            divergent_cases.append({
                "id": target_id,
                "room_type": prop_dict.get('room_type'),
                "property_type": prop_dict.get('property_type'),
                "bedrooms": prop_dict.get('bedrooms'),
                "accommodates": prop_dict.get('accommodates'),
                "bathrooms": prop_dict.get('bathrooms'),
                "base_price": base_price,
                "comp_count": comps['comparable_count'],
                "comp_p25": comps['p25_price'],
                "comp_med": comp_med,
                "comp_p75": comps['p75_price'],
                "avg_dist": avg_dist,
                "max_dist": max_dist,
                "same_room_pct": same_room_pct,
                "same_prop_pct": same_prop_pct,
                "avg_acc_diff": avg_acc_diff,
                "avg_bed_diff": avg_bed_diff
            })
            
    print(f"\nCollected {len(divergent_cases)} highly divergent cases.")
    
    df_div = pd.DataFrame(divergent_cases)
    
    # -------------------------------------------------------------------------
    # Special Categories
    # -------------------------------------------------------------------------
    gt_2x = df_div[df_div['comp_med'] > 2.0 * df_div['base_price']]
    lt_half = df_div[df_div['comp_med'] < 0.5 * df_div['base_price']]
    
    df_div['spread_ratio'] = (df_div['comp_p75'] - df_div['comp_p25']) / df_div['comp_med']
    large_spread = df_div.sort_values('spread_ratio', ascending=False).head(5)
    
    print("\n" + "="*80)
    print("  CASES WHERE COMP MEDIAN > 2x BASE PRICE")
    print("="*80)
    for _, row in gt_2x.iterrows():
        print(f"ID {row['id']} | {row['room_type']} ({row['accommodates']} guests)")
        print(f"  Base: ${row['base_price']:.2f} -> Comp Med: ${row['comp_med']:.2f}")
        print(f"  Comps: {row['comp_count']} | Max dist: {row['max_dist']:.2f}km | Room Match: {row['same_room_pct']:.0f}% | Avg guest diff: {row['avg_acc_diff']:.1f}")

    print("\n" + "="*80)
    print("  CASES WHERE COMP MEDIAN < 0.5x BASE PRICE")
    print("="*80)
    for _, row in lt_half.iterrows():
        print(f"ID {row['id']} | {row['room_type']} ({row['accommodates']} guests)")
        print(f"  Base: ${row['base_price']:.2f} -> Comp Med: ${row['comp_med']:.2f}")
        print(f"  Comps: {row['comp_count']} | Max dist: {row['max_dist']:.2f}km | Room Match: {row['same_room_pct']:.0f}% | Avg guest diff: {row['avg_acc_diff']:.1f}")

    print("\n" + "="*80)
    print("  CASES WITH UNUSUALLY LARGE P25-P75 SPREAD")
    print("="*80)
    for _, row in large_spread.iterrows():
        print(f"ID {row['id']} | {row['room_type']} ({row['accommodates']} guests)")
        print(f"  Base: ${row['base_price']:.2f} | P25: ${row['comp_p25']:.2f} | P75: ${row['comp_p75']:.2f} | Spread Ratio: {row['spread_ratio']:.2f}")
        print(f"  Comps: {row['comp_count']} | Max dist: {row['max_dist']:.2f}km | Room Match: {row['same_room_pct']:.0f}% | Avg guest diff: {row['avg_acc_diff']:.1f}")

    print("\n" + "="*80)
    print("  OVERALL SIMILARITY METRICS (FOR ALL 50 CASES)")
    print("="*80)
    print(f"Avg matching room_type %: {df_div['same_room_pct'].mean():.1f}%")
    print(f"Avg matching prop_type %: {df_div['same_prop_pct'].mean():.1f}%")
    print(f"Avg absolute difference in guests (accommodates): {df_div['avg_acc_diff'].mean():.2f}")
    print(f"Avg absolute difference in bedrooms: {df_div['avg_bed_diff'].mean():.2f}")
    print(f"Avg maximum distance of comparables: {df_div['max_dist'].mean():.2f} km")

if __name__ == "__main__":
    main()
