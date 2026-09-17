import sys
from pathlib import Path
import pandas as pd
import numpy as np

# Ensure project root is on sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "src"))

from pricing.pricing_engine import PricingEngine

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
TRAIN_CSV = PROJECT_ROOT / "data" / "raw" / "rental-price-predict" / "airbnb_train.csv"
DATE_FEATURES_CSV = PROJECT_ROOT / "notebooks" / "data" / "processed" / "london_date_features.csv"

def load_evaluation_data(n_properties=100, n_dates=10):
    """Load sample properties and dates for evaluation."""
    # 1. Load properties
    df_props = pd.read_csv(TRAIN_CSV)
    df_london = df_props[df_props['city'] == 'London'].copy()
    
    if df_london['price'].dtype == 'O':
        df_london['price'] = (
            df_london['price']
            .str.replace('$', '', regex=False)
            .str.replace(',', '', regex=False)
            .astype(float)
        )
    df_london = df_london[(df_london['price'] > 0) & (df_london['price'] <= 1000)]
    
    # Sample properties
    sample_props = df_london.sample(n=n_properties, random_state=42)
    
    # 2. Load dates
    df_dates = pd.read_csv(DATE_FEATURES_CSV)
    
    # Sample dates across pressure quantiles
    df_dates = df_dates.sort_values('market_pressure_score')
    low_dates = df_dates.head(int(n_dates * 0.3))
    high_dates = df_dates.tail(int(n_dates * 0.3))
    med_dates = df_dates.iloc[
        len(df_dates)//2 - int(n_dates * 0.2) : len(df_dates)//2 + int(n_dates * 0.2)
    ]
    
    # In case of odd math, just take exactly n_dates
    sample_dates = pd.concat([low_dates, med_dates, high_dates]).head(n_dates)
    
    return sample_props, sample_dates['date'].tolist()

def main():
    print("=" * 72)
    print("  Wayzyy Dynamic Pricing Engine -- Evaluation")
    print("=" * 72)
    
    print("Loading engine...")
    engine = PricingEngine()
    
    n_props = 100
    n_dates = 10
    print(f"Loading {n_props} properties and {n_dates} dates...")
    props_df, date_list = load_evaluation_data(n_props, n_dates)
    
    print("\nRunning evaluation (this may take a minute due to comparable lookups)...")
    
    results = []
    
    # Run the engine
    for idx, prop_row in props_df.iterrows():
        prop_dict = prop_row.to_dict()
        for target_date in date_list:
            rec = engine.recommend_price(prop_dict, target_date)
            
            # Collect data
            results.append({
                "property_id": prop_dict.get('id'),
                "property_type": prop_dict.get('property_type'),
                "room_type": prop_dict.get('room_type'),
                "actual_price": prop_dict.get('price'),
                "date": target_date,
                "base_price": rec.base_price,
                "rec_price": rec.recommended_price,
                "comp_median": rec.comparable_median,
                "comp_count": rec.comparable_count,
                "mps": rec.market_pressure_score,
                "demand_level": rec.demand_level,
                "total_adj_pct": rec.adjustment_pct,
                "fusion_adj_pct": rec.fusion_adjustment_pct,
            })
            
    res_df = pd.DataFrame(results)
    
    # -----------------------------------------------------------------------
    # Evaluation Metrics
    # -----------------------------------------------------------------------
    print("\n" + "=" * 72)
    print("  SUMMARY STATISTICS")
    print("=" * 72)
    
    total_runs = len(res_df)
    
    # 1. Base price vs recommended price
    mean_base = res_df['base_price'].mean()
    mean_rec = res_df['rec_price'].mean()
    mean_diff = mean_rec - mean_base
    print(f"1. Base vs Recommended Price:")
    print(f"   Mean Base Price:      ${mean_base:.2f}")
    print(f"   Mean Rec Price:       ${mean_rec:.2f}")
    print(f"   Mean Difference:      ${mean_diff:+.2f}")
    
    # 2. Comparable median vs base price
    # Filter out runs with no comp median
    valid_comps = res_df[res_df['comp_median'].notna()]
    mean_comp_med = valid_comps['comp_median'].mean()
    mean_base_valid = valid_comps['base_price'].mean()
    print(f"\n2. Comparable Median vs Base Price:")
    print(f"   Mean Base Price:      ${mean_base_valid:.2f}")
    print(f"   Mean Comp Median:     ${mean_comp_med:.2f}")
    print(f"   Mean Difference:      ${mean_comp_med - mean_base_valid:+.2f}")
    
    # 3. Market pressure vs recommended-price adjustment
    print(f"\n3. Market Pressure vs Adjustment:")
    for level in ['low', 'medium', 'high']:
        subset = res_df[res_df['demand_level'] == level]
        if not subset.empty:
            avg_adj = subset['total_adj_pct'].mean()
            print(f"   {level.capitalize():<8} demand (MPS ~{subset['mps'].mean():.0f}): {avg_adj:+.2f}% avg adjustment")
            
    # 4. Minimum/maximum adjustment
    min_adj = res_df['total_adj_pct'].min()
    max_adj = res_df['total_adj_pct'].max()
    print(f"\n4. Adjustment Range:")
    print(f"   Minimum Adjustment:   {min_adj:+.2f}%")
    print(f"   Maximum Adjustment:   {max_adj:+.2f}%")
    
    # 5. Number of comparables found
    mean_comps = res_df['comp_count'].mean()
    max_comps = res_df['comp_count'].max()
    min_comps = res_df['comp_count'].min()
    print(f"\n5. Number of Comparables Found:")
    print(f"   Mean: {mean_comps:.1f} | Min: {min_comps} | Max: {max_comps}")
    
    # 6. Cases with fewer than 5 comparables
    few_comps = len(res_df[res_df['comp_count'] < 5])
    print(f"\n6. Cases with < 5 comparables: {few_comps} / {total_runs} ({(few_comps/total_runs)*100:.1f}%)")
    
    # 7. Cases where base price differs from comparable median by >30%
    if not valid_comps.empty:
        diff_pct = abs(valid_comps['comp_median'] - valid_comps['base_price']) / valid_comps['base_price']
        huge_diff = len(valid_comps[diff_pct > 0.30])
        print(f"\n7. Base differs from Comp Median by >30%: {huge_diff} / {len(valid_comps)} ({(huge_diff/len(valid_comps))*100:.1f}%)")
    
    # 8. Cases hitting guardrails
    min_guardrail = engine.config.min_price
    max_guardrail = engine.config.max_price
    hit_min = len(res_df[res_df['rec_price'] <= min_guardrail * 1.01])
    hit_max = len(res_df[res_df['rec_price'] >= max_guardrail * 0.99])
    print(f"\n8. Guardrail Hits (Min ${min_guardrail}, Max ${max_guardrail}):")
    print(f"   Hit Minimum: {hit_min} cases")
    print(f"   Hit Maximum: {hit_max} cases")
    
    # -----------------------------------------------------------------------
    # Edge Cases
    # -----------------------------------------------------------------------
    print("\n" + "=" * 72)
    print("  10 INTERESTING EDGE CASES")
    print("=" * 72)
    
    # Pick a variety of edge cases
    edges = []
    
    # 1-2. Largest positive/negative adjustments
    edges.append(res_df.loc[res_df['total_adj_pct'].idxmax()])
    edges.append(res_df.loc[res_df['total_adj_pct'].idxmin()])
    
    # 3. Fewest comps
    edges.append(res_df.loc[res_df['comp_count'].idxmin()])
    
    # 4. Highest market pressure
    edges.append(res_df.loc[res_df['mps'].idxmax()])
    
    # 5-6. Biggest gap between base and comp median
    if not valid_comps.empty:
        valid_comps_copy = valid_comps.copy()
        valid_comps_copy['diff_pct_val'] = abs(valid_comps_copy['comp_median'] - valid_comps_copy['base_price']) / valid_comps_copy['base_price']
        biggest_gaps = valid_comps_copy.sort_values('diff_pct_val', ascending=False).head(2)
        for _, row in biggest_gaps.iterrows():
            edges.append(row)
            
    # Pad to 10 with random samples
    if len(edges) < 10:
        remaining = 10 - len(edges)
        for _, row in res_df.sample(n=remaining, random_state=42).iterrows():
            edges.append(row)
            
    for i, edge in enumerate(edges[:10], 1):
        c_med = f"${edge['comp_median']:.2f}" if pd.notna(edge['comp_median']) else "N/A"
        print(f"Edge Case #{i}:")
        print(f"  Property:   {edge['room_type']} (ID: {edge['property_id']})")
        print(f"  Date:       {edge['date']} | Pressure: {edge['mps']:.1f}/100")
        print(f"  Comps:      {edge['comp_count']} found | Median: {c_med}")
        print(f"  Prices:     Base ${edge['base_price']:.2f} -> Rec ${edge['rec_price']:.2f} (Adj {edge['total_adj_pct']:+.1f}%)")
        print()

if __name__ == "__main__":
    main()
