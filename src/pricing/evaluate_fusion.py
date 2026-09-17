import sys
from pathlib import Path
import pandas as pd
import numpy as np

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "src"))

from pricing.pricing_engine import PricingEngine
from pricing.comparables import get_comparables
from features.property_transformer import transform_property_features

def calculate_metrics(actual, pred):
    """Calculate error metrics safely."""
    # Filter out NaNs
    valid = ~(np.isnan(actual) | np.isnan(pred))
    actual = actual[valid]
    pred = pred[valid]
    
    if len(actual) == 0:
        return {
            "MAE": np.nan, "RMSE": np.nan, "MedAE": np.nan, 
            "MPE": np.nan, "MdAPE": np.nan
        }

    err = pred - actual
    abs_err = np.abs(err)
    
    # Safe percentage error
    with np.errstate(divide='ignore', invalid='ignore'):
        pct_err = err / actual
        abs_pct_err = np.abs(pct_err)
        
    return {
        "MAE": np.mean(abs_err),
        "RMSE": np.sqrt(np.mean(err**2)),
        "MedAE": np.median(abs_err),
        "MPE": np.mean(pct_err[actual > 0]) * 100.0,      # Mean Percentage Error
        "MdAPE": np.median(abs_pct_err[actual > 0]) * 100.0  # Median Absolute Percentage Error
    }

def main():
    print("=" * 80)
    print("  Wayzyy Dynamic Pricing Engine -- Fusion Validation")
    print("  NOTE: Validating against observed asking/listing prices,")
    print("  NOT booking outcomes or optimal revenue.")
    print("=" * 80)

    engine = PricingEngine()
    
    # Load 500 properties
    train_csv = PROJECT_ROOT / "data" / "raw" / "rental-price-predict" / "airbnb_train.csv"
    df_props = pd.read_csv(train_csv)
    df_london = df_props[df_props['city'] == 'London'].copy()
    
    if df_london['price'].dtype == 'O':
        df_london['price'] = df_london['price'].str.replace('$', '', regex=False).str.replace(',', '', regex=False).astype(float)
    df_london = df_london[(df_london['price'] > 0) & (df_london['price'] <= 1000)]
    
    sample_props = df_london.sample(n=500, random_state=42)
    
    # Load dates
    date_csv = PROJECT_ROOT / "notebooks" / "data" / "processed" / "london_date_features.csv"
    df_dates = pd.read_csv(date_csv).sort_values('market_pressure_score')
    
    low_date = df_dates.head(1).iloc[0]['date']
    med_date = df_dates.iloc[len(df_dates)//2]['date']
    high_date = df_dates.tail(1).iloc[0]['date']
    
    dates = [
        ("low", low_date),
        ("medium", med_date),
        ("high", high_date)
    ]
    
    print(f"Loaded 500 properties. Processing across Low, Med, High pressure dates...")
    
    results = []
    
    for idx, row in sample_props.iterrows():
        prop_dict = row.to_dict()
        actual = prop_dict.get('price')
        target_id = prop_dict.get('id')
        
        for pressure_lbl, date_str in dates:
            rec = engine.recommend_price(prop_dict, date_str)
            
            # Use NaN for comparable median if there aren't enough comps
            comp_med = rec.comparable_median if rec.comparable_count >= 5 else np.nan
            
            results.append({
                "id": target_id,
                "pressure": pressure_lbl,
                "date": date_str,
                "actual": actual,
                "base": rec.base_price,
                "comp_med": comp_med,
                "fusion": rec.recommended_price
            })
            
    df = pd.DataFrame(results)
    
    print("\n" + "=" * 80)
    print("  PERFORMANCE METRICS TABLE")
    print("=" * 80)
    
    models = [("Base Model", "base"), ("Comp Median", "comp_med"), ("Fusion V1", "fusion")]
    
    # Overall
    print(f"\n--- OVERALL (All Pressures, N={len(df)}) ---")
    header = f"{'Model':<15} | {'MAE':>7} | {'RMSE':>7} | {'MedAE':>7} | {'MPE %':>7} | {'MdAPE %':>7}"
    print(header)
    print("-" * len(header))
    for name, col in models:
        metrics = calculate_metrics(df['actual'], df[col])
        print(f"{name:<15} | ${metrics['MAE']:>6.2f} | ${metrics['RMSE']:>6.2f} | ${metrics['MedAE']:>6.2f} | {metrics['MPE']:>6.1f}% | {metrics['MdAPE']:>6.1f}%")

    # By Pressure
    for p_lbl, _ in dates:
        df_p = df[df['pressure'] == p_lbl]
        print(f"\n--- {p_lbl.upper()} PRESSURE (N={len(df_p)}) ---")
        print(header)
        print("-" * len(header))
        for name, col in models:
            metrics = calculate_metrics(df_p['actual'], df_p[col])
            print(f"{name:<15} | ${metrics['MAE']:>6.2f} | ${metrics['RMSE']:>6.2f} | ${metrics['MedAE']:>6.2f} | {metrics['MPE']:>6.1f}% | {metrics['MdAPE']:>6.1f}%")
            
    # Substantially Worse Cases
    # Define "substantially worse": Fusion error is > $20 larger than BOTH Base error and Comp error
    df['err_base'] = np.abs(df['base'] - df['actual'])
    df['err_comp'] = np.abs(df['comp_med'] - df['actual'])
    df['err_fusion'] = np.abs(df['fusion'] - df['actual'])
    
    worse_cases = df[
        (df['err_fusion'] > df['err_base'] + 20) & 
        (df['err_fusion'] > df['err_comp'] + 20) &
        (df['comp_med'].notna())
    ]
    
    print("\n" + "=" * 80)
    print(f"  CASES WHERE FUSION IS SUBSTANTIALLY WORSE ({len(worse_cases)} cases found)")
    print("  (Fusion error > $20 worse than BOTH Base and Comp Median)")
    print("=" * 80)
    
    for _, row in worse_cases.head(10).iterrows():
        print(f"ID: {row['id']} | Pressure: {row['pressure'].upper()}")
        print(f"  Actual Price: ${row['actual']:.2f}")
        print(f"  Base Price:   ${row['base']:.2f} (Error: ${row['err_base']:.2f})")
        print(f"  Comp Median:  ${row['comp_med']:.2f} (Error: ${row['err_comp']:.2f})")
        print(f"  Fusion Price: ${row['fusion']:.2f} (Error: ${row['err_fusion']:.2f})")
        print("-" * 40)

if __name__ == "__main__":
    main()
