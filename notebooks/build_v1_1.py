import pandas as pd
import numpy as np
import os
import joblib
import json
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
import nbformat as nbf
import ast

print("Loading dataset...")
df = pd.read_csv('../data/raw/rental-price-predict/airbnb_train.csv')
df_london = df[df['city'] == 'London'].copy()

# 3. Clean missing values and sensible price outliers
if df_london['price'].dtype == 'O':
    df_london['price'] = df_london['price'].str.replace('$', '', regex=False).str.replace(',', '', regex=False).astype(float)

df_london = df_london[(df_london['price'] > 0) & (df_london['price'] <= 1000)]
target = 'price'
df_london = df_london.dropna(subset=[target])

# Parse amenities to get count
def count_amenities(x):
    try:
        if pd.isna(x): return 0
        return len(ast.literal_eval(x))
    except:
        # Fallback if it's not a valid list string
        return x.count(',') + 1 if isinstance(x, str) else 0

df_london['num_amenities'] = df_london['amenities'].apply(count_amenities)

# Format host_is_superhost (might be 't'/'f')
df_london['host_is_superhost'] = df_london['host_is_superhost'].astype(str).str.lower()

# 4. Select useful features
features_v1 = [
    'property_type', 'room_type', 'accommodates', 'bathrooms', 'bedrooms', 
    'beds', 'number_of_reviews', 'review_scores_rating'
]
features_v1_1_added = [
    'latitude', 'longitude', 'host_neighbourhood', 'review_scores_location', 
    'num_amenities', 'host_is_superhost'
]
features_all = features_v1 + features_v1_1_added

X = df_london[features_all]
y = df_london[target]

numeric_features = [
    'accommodates', 'bathrooms', 'bedrooms', 'beds', 'number_of_reviews', 
    'review_scores_rating', 'latitude', 'longitude', 'review_scores_location', 'num_amenities'
]
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

# 6. Split into train/test sets
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# 7. Train and compare models
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
    print(f"Training {name} V1.1...")
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

print("\nModel Comparison (V1.1):")
for name, metrics in results.items():
    print(f"{name}: MAE={metrics['MAE']:.2f}, RMSE={metrics['RMSE']:.2f}, R2={metrics['R2']:.4f}")

print(f"\nBest Model: {best_model_name}")

# Compare with V1.0 metrics (hardcoded from previous run)
v1_0_r2 = 0.3871
v1_0_mae = 69.82
v1_0_rmse = 115.05

improvement_r2 = best_r2 - v1_0_r2
print(f"\nComparison with V1.0:")
print(f"R2 Improvement: {improvement_r2:.4f}")

# 10. Save the best model
os.makedirs('../models', exist_ok=True)
model_path = '../models/best_pricing_model_v1_1.pkl'
joblib.dump(best_model, model_path)
print(f"\nModel saved to {model_path}")
