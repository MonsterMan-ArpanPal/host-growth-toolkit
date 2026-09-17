import pandas as pd
import numpy as np
import os
import joblib
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

# 1. Load dataset & filter city == "London"
print("Loading dataset...")
df = pd.read_csv('../data/raw/rental-price-predict/airbnb_train.csv')
print(f"Original dataset size: {len(df)}")
df_london = df[df['city'] == 'London'].copy()
london_size = len(df_london)
print(f"London dataset size: {london_size}")

# 3. Clean missing values and sensible price outliers
# Convert price to float just in case it's string with $
if df_london['price'].dtype == 'O':
    df_london['price'] = df_london['price'].str.replace('$', '').str.replace(',', '').astype(float)

# Remove unrealistic prices (e.g., $0 or very high values like $5000+ per night)
df_london = df_london[(df_london['price'] > 0) & (df_london['price'] <= 1000)]

# 4. Select useful features
# Avoiding text (name, description, etc.) and host-identifying fields (host_id, host_name, etc.)
# We will use property_type, room_type, accommodates, bathrooms, bedrooms, beds, number_of_reviews, review_scores_rating
features = [
    'property_type', 'room_type', 'accommodates', 'bathrooms', 'bedrooms', 
    'beds', 'number_of_reviews', 'review_scores_rating'
]
target = 'price'

# Drop rows where target is missing
df_london = df_london.dropna(subset=[target])
X = df_london[features]
y = df_london[target]

# 5. Preprocess categorical and numerical features
numeric_features = ['accommodates', 'bathrooms', 'bedrooms', 'beds', 'number_of_reviews', 'review_scores_rating']
categorical_features = ['property_type', 'room_type']

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
best_pipeline = None

for name, model in models.items():
    print(f"Training {name}...")
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
        best_pipeline = pipeline

print("\nModel Comparison:")
for name, metrics in results.items():
    print(f"{name}: MAE={metrics['MAE']:.2f}, RMSE={metrics['RMSE']:.2f}, R2={metrics['R2']:.4f}")

print(f"\nBest Model: {best_model_name}")

# 9. Small table of actual vs predicted
y_pred_best = best_pipeline.predict(X_test)
df_results = pd.DataFrame({'Actual': y_test.values, 'Predicted': y_pred_best})
print("\nActual vs Predicted (first 5):")
print(df_results.head())

# 10. Save the best model
os.makedirs('../models', exist_ok=True)
model_path = '../models/best_pricing_model_v1.pkl'
joblib.dump(best_pipeline, model_path)
print(f"\nModel saved to {model_path}")

# Write code to notebook
nb = nbf.v4.new_notebook()
cells = [
    nbf.v4.new_markdown_cell("# Wayzyy's Dynamic Pricing Engine - V1 (London)"),
    nbf.v4.new_code_cell("""import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
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
import joblib
import os"""),
    nbf.v4.new_markdown_cell("## 1. Load Data & Filter for London"),
    nbf.v4.new_code_cell("""df = pd.read_csv('../data/raw/rental-price-predict/airbnb_train.csv')
df_london = df[df['city'] == 'London'].copy()
print(f'London dataset size: {len(df_london)}')"""),
    nbf.v4.new_markdown_cell("## 2 & 3. EDA and Data Cleaning\nRemoving outliers ($0 or > $1000) and missing target values."),
    nbf.v4.new_code_cell("""if df_london['price'].dtype == 'O':
    df_london['price'] = df_london['price'].str.replace('$', '', regex=False).str.replace(',', '', regex=False).astype(float)

plt.figure(figsize=(10,6))
sns.histplot(df_london['price'], bins=50, kde=True)
plt.title('Price Distribution Before Cleaning')
plt.show()

# Clean outliers
df_london = df_london[(df_london['price'] > 0) & (df_london['price'] <= 1000)]
df_london = df_london.dropna(subset=['price'])

plt.figure(figsize=(10,6))
sns.histplot(df_london['price'], bins=50, kde=True)
plt.title('Price Distribution After Cleaning')
plt.show()"""),
    nbf.v4.new_markdown_cell("## 4 & 5. Feature Selection and Preprocessing"),
    nbf.v4.new_code_cell("""features = ['property_type', 'room_type', 'accommodates', 'bathrooms', 'bedrooms', 'beds', 'number_of_reviews', 'review_scores_rating']
target = 'price'

X = df_london[features]
y = df_london[target]

numeric_features = ['accommodates', 'bathrooms', 'bedrooms', 'beds', 'number_of_reviews', 'review_scores_rating']
categorical_features = ['property_type', 'room_type']

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
    ])"""),
    nbf.v4.new_markdown_cell("## 6. Train/Test Split"),
    nbf.v4.new_code_cell("X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)"),
    nbf.v4.new_markdown_cell("## 7 & 8. Model Training and Evaluation"),
    nbf.v4.new_code_cell("""models = {
    'Linear Regression': LinearRegression(),
    'Random Forest': RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1),
}
if XGB_AVAILABLE:
    models['XGBoost'] = xgb.XGBRegressor(n_estimators=100, random_state=42, n_jobs=-1)

results = {}
best_model = None
best_r2 = -float('inf')
best_name = ''

for name, model in models.items():
    pipeline = Pipeline(steps=[('preprocessor', preprocessor), ('model', model)])
    pipeline.fit(X_train, y_train)
    y_pred = pipeline.predict(X_test)
    
    mae = mean_absolute_error(y_test, y_pred)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    r2 = r2_score(y_test, y_pred)
    results[name] = {'MAE': mae, 'RMSE': rmse, 'R2': r2}
    
    if r2 > best_r2:
        best_r2 = r2
        best_name = name
        best_model = pipeline

results_df = pd.DataFrame(results).T
print(results_df)"""),
    nbf.v4.new_markdown_cell("## 9. Actual vs Predicted"),
    nbf.v4.new_code_cell("""y_pred_best = best_model.predict(X_test)
comparison_df = pd.DataFrame({'Actual': y_test.values, 'Predicted': y_pred_best})
print(comparison_df.head(10))"""),
    nbf.v4.new_markdown_cell("## 10. Save Model"),
    nbf.v4.new_code_cell("""os.makedirs('../models', exist_ok=True)
joblib.dump(best_model, '../models/best_pricing_model_v1.pkl')
print('Model saved to ../models/best_pricing_model_v1.pkl')""")
]
nb.cells.extend(cells)
with open('02_price_prediction_v1.ipynb', 'w') as f:
    nbf.write(nb, f)
print("Notebook 02_price_prediction_v1.ipynb created successfully.")
