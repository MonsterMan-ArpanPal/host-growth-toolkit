import pandas as pd
import numpy as np
import os
import joblib
import json
import ast
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
try:
    import xgboost as xgb
    XGB_AVAILABLE = True
except ImportError:
    XGB_AVAILABLE = False
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

print("Loading dataset...")
df = pd.read_csv('../data/raw/rental-price-predict/airbnb_train.csv')
df_london = df[df['city'] == 'London'].copy()

# Target processing
if df_london['price'].dtype == 'O':
    df_london['price'] = df_london['price'].str.replace('$', '', regex=False).str.replace(',', '', regex=False).astype(float)
df_london = df_london[(df_london['price'] > 0) & (df_london['price'] <= 1000)]
target = 'price'
df_london = df_london.dropna(subset=[target])

# FEATURE ENGINEERING

# 1. Geographic Features
# Center of London roughly Trafalgar Square
LONDON_LAT = 51.5072
LONDON_LON = -0.1276
df_london['dist_to_center'] = np.sqrt((df_london['latitude'] - LONDON_LAT)**2 + (df_london['longitude'] - LONDON_LON)**2)

# 2. Amenities extraction
def parse_amenities(x):
    try:
        if pd.isna(x): return []
        return [item.lower() for item in ast.literal_eval(x)]
    except:
        return []

df_london['amenities_list'] = df_london['amenities'].apply(parse_amenities)
df_london['num_amenities'] = df_london['amenities_list'].apply(len)

top_amenities = ['wifi', 'kitchen', 'heating', 'smoke alarm', 'washer', 'dryer', 'air conditioning', 'free parking on premises', 'iron', 'dedicated workspace', 'tv', 'elevator']
for am in top_amenities:
    df_london[f'has_{am.replace(" ", "_")}'] = df_london['amenities_list'].apply(lambda x: 1 if any(am in item for item in x) else 0)

# 3. Host features
# tenure
df_london['host_since_year'] = pd.to_datetime(df_london['host_since'], errors='coerce').dt.year
# Fill missing with median year
df_london['host_since_year'].fillna(df_london['host_since_year'].median(), inplace=True)
current_year = 2024 # We use a static reference year
df_london['host_tenure_years'] = current_year - df_london['host_since_year']

def clean_rate(x):
    if pd.isna(x): return np.nan
    if isinstance(x, str):
        return float(x.replace('%', '')) / 100.0
    return float(x)

df_london['host_response_rate'] = df_london['host_response_rate'].apply(clean_rate)
df_london['host_acceptance_rate'] = df_london['host_acceptance_rate'].apply(clean_rate)
df_london['host_is_superhost'] = df_london['host_is_superhost'].astype(str).str.lower()

# 4. Interaction Features
# bedrooms/bathrooms replace 0 with NaN or 1 to avoid inf
df_london['bedrooms_safe'] = df_london['bedrooms'].replace(0, 1).fillna(1)
df_london['guests_per_bedroom'] = df_london['accommodates'] / df_london['bedrooms_safe']
df_london['bathrooms_per_bedroom'] = df_london['bathrooms'] / df_london['bedrooms_safe']

# Final Features
features_v1 = [
    'property_type', 'room_type', 'accommodates', 'bathrooms', 'bedrooms', 
    'beds', 'number_of_reviews', 'review_scores_rating'
]
features_v1_1_added = [
    'latitude', 'longitude', 'host_neighbourhood', 'review_scores_location', 
    'num_amenities', 'host_is_superhost'
]
features_v1_2_added = [
    'dist_to_center', 'host_tenure_years', 'host_response_rate', 'host_acceptance_rate',
    'host_listings_count', 'review_scores_accuracy', 'review_scores_cleanliness', 
    'review_scores_checkin', 'review_scores_communication', 'review_scores_value', 
    'reviews_per_month', 'number_of_reviews_ltm', 'number_of_reviews_l30d',
    'guests_per_bedroom', 'bathrooms_per_bedroom'
] + [f'has_{am.replace(" ", "_")}' for am in top_amenities]

features_all = features_v1 + features_v1_1_added + features_v1_2_added
X = df_london[features_all]
y = df_london[target]

numeric_features = [f for f in features_all if f not in ['property_type', 'room_type', 'host_neighbourhood', 'host_is_superhost']]
categorical_features = ['property_type', 'room_type', 'host_neighbourhood', 'host_is_superhost']

numeric_transformer = Pipeline(steps=[
    ('imputer', SimpleImputer(strategy='median')),
    ('scaler', StandardScaler())
])

categorical_transformer = Pipeline(steps=[
    ('imputer', SimpleImputer(strategy='constant', fill_value='missing')),
    ('onehot', OneHotEncoder(handle_unknown='ignore'))
])

preprocessor = ColumnTransformer(
    transformers=[
        ('num', numeric_transformer, numeric_features),
        ('cat', categorical_transformer, categorical_features)
    ])

# Train/Test Split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Models
models = {
    'Linear Regression': LinearRegression(),
    'Random Forest': RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1),
}
if XGB_AVAILABLE:
    models['XGBoost'] = xgb.XGBRegressor(n_estimators=100, random_state=42, n_jobs=-1)

results = {}
best_model = None
best_r2 = -float('inf')
best_model_name = ""

for name, model in models.items():
    print(f"Training {name} V1.2...")
    pipeline = Pipeline(steps=[('preprocessor', preprocessor),
                               ('model', model)])
    pipeline.fit(X_train, y_train)
    y_pred = pipeline.predict(X_test)
    
    mae = mean_absolute_error(y_test, y_pred)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    r2 = r2_score(y_test, y_pred)
    
    results[name] = {'MAE': mae, 'RMSE': rmse, 'R2': r2}
    
    if r2 > best_r2:
        best_r2 = r2
        best_model_name = name
        best_model = pipeline

print("\nModel Comparison (V1.2):")
for name, metrics in results.items():
    print(f"{name}: MAE={metrics['MAE']:.2f}, RMSE={metrics['RMSE']:.2f}, R2={metrics['R2']:.4f}")

# Feature importance for Random Forest (or XGBoost if it won)
if best_model_name in ['Random Forest', 'XGBoost']:
    model_step = best_model.named_steps['model']
    preprocessor_step = best_model.named_steps['preprocessor']
    
    # Get feature names from onehot encoder
    cat_encoder = preprocessor_step.named_transformers_['cat'].named_steps['onehot']
    cat_features = cat_encoder.get_feature_names_out(categorical_features)
    all_feat_names = numeric_features + list(cat_features)
    
    importances = model_step.feature_importances_
    feat_imp = pd.DataFrame({'Feature': all_feat_names, 'Importance': importances})
    feat_imp = feat_imp.sort_values(by='Importance', ascending=False)
    print("\nTop 10 Important Features:")
    print(feat_imp.head(10).to_string(index=False))

os.makedirs('../models', exist_ok=True)
joblib.dump(best_model, '../models/best_pricing_model_v1_2.pkl')
print("\nModel saved to ../models/best_pricing_model_v1_2.pkl")
