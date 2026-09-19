# Dynamic Pricing Files

This document outlines the important files in the Dynamic Pricing project.

## Backend / Pricing

- **api/main.py**
  - **Purpose**: Main FastAPI application entry point.
  - **Inputs/Outputs**: Receives HTTP requests, outputs JSON responses.
  - **Current Responsibility**: Exposes endpoints for the frontend.
  - **Recently Modified**: No (Not inspected).

- **src/pricing/pricing_engine.py**
  - **Purpose**: Dynamic pricing layer on top of the Random Forest model.
  - **Inputs/Outputs**: Takes property features and date, outputs a `PricingRecommendation` object.
  - **Current Responsibility**: Computes market pressure, applies Fusion logic, and returns demand level.
  - **Recently Modified**: No (Inspected during latest task, but not modified).

- **src/pricing/comparables.py**
  - **Purpose**: Handles fetching and processing of comparable listings.
  - **Inputs/Outputs**: Takes property details, outputs comparable statistics.
  - **Current Responsibility**: Finding similar properties to inform pricing.
  - **Recently Modified**: No (Not inspected).

- **src/pricing/events.py**
  - **Purpose**: Manages event-driven pricing signals.
  - **Inputs/Outputs**: Takes a date, outputs event context.
  - **Current Responsibility**: Adjusting prices based on local events.
  - **Recently Modified**: No (Not inspected).

- **src/pricing/evaluate_pricing.py**
  - **Purpose**: Evaluation scripts for the base pricing models.
  - **Inputs/Outputs**: Model predictions vs actuals.
  - **Current Responsibility**: Generating metrics (R², MAE, RMSE).
  - **Recently Modified**: No (Not inspected).

- **src/pricing/evaluate_fusion.py**
  - **Purpose**: Evaluates the Fusion pricing logic.
  - **Inputs/Outputs**: Fusion predictions vs actuals.
  - **Current Responsibility**: Tuning and evaluating the Fusion V1/V2 algorithms.
  - **Recently Modified**: No (Not inspected).

- **src/pricing/analyze_comparables.py**
  - **Purpose**: Analytics on comparable listings.
  - **Inputs/Outputs**: Comparable data.
  - **Current Responsibility**: Providing insights into local market competition.
  - **Recently Modified**: No (Not inspected).

- **src/pricing/demo_pricing.py**
  - **Purpose**: Script for demoing the pricing engine.
  - **Inputs/Outputs**: Hardcoded or CLI inputs, outputs pricing recommendations.
  - **Current Responsibility**: Local testing and demonstration.
  - **Recently Modified**: No (Not inspected).

- **src/features/property_transformer.py**
  - **Purpose**: Transforms raw property data into model features.
  - **Inputs/Outputs**: Raw dict -> processed feature array/dict.
  - **Current Responsibility**: Feature engineering for the ML pipeline.
  - **Recently Modified**: No (Not inspected).

## Frontend

- **frontend/src/api/pricing.js**
  - **Purpose**: API abstraction layer for the React frontend.
  - **Inputs/Outputs**: Takes frontend requests, calls FastAPI, returns formatted data.
  - **Current Responsibility**: Fetching pricing recommendations and calendar data.
  - **Recently Modified**: No (Inspected during latest task, but not modified).

- **frontend/src/pages/PricingPage.jsx**
  - **Purpose**: Main React page for the dynamic pricing dashboard.
  - **Inputs/Outputs**: User interactions, fetches data, renders components.
  - **Current Responsibility**: State management for the pricing dashboard.
  - **Recently Modified**: No (Inspected during latest task, but not modified).

- **frontend/src/components/pricing/PricingCalendar.jsx**
  - **Purpose**: Renders the 30-day pricing calendar.
  - **Inputs/Outputs**: Takes `calendarData` array, renders a grid.
  - **Current Responsibility**: Visualizing price and demand over a 30-day period.
  - **Recently Modified**: Yes.
  - **Latest Change**: Updated the color mapping logic to map backend high demand to `demand-low` (red) and backend low demand to `demand-high` (green), matching intended visual semantics.

- **frontend/src/components/pricing/ComparableListings.jsx**
  - **Purpose**: Displays comparable listings data.
  - **Inputs/Outputs**: Takes comparables statistics, renders UI.
  - **Current Responsibility**: Showing host the local market competition.
  - **Recently Modified**: No (Not inspected).

- **frontend/src/components/pricing/PricingControls.jsx**
  - **Purpose**: UI controls for adjusting prices and settings.
  - **Inputs/Outputs**: User inputs for manual overrides.
  - **Current Responsibility**: Providing manual control over pricing.
  - **Recently Modified**: No (Not inspected).

- **frontend/src/components/pricing/PricingFactors.jsx**
  - **Purpose**: Renders the breakdown of pricing adjustments.
  - **Inputs/Outputs**: Takes factors array, renders list.
  - **Current Responsibility**: Explaining to the host why a price was recommended.
  - **Recently Modified**: No (Not inspected).

- **frontend/src/components/pricing/PricingHero.jsx**
  - **Purpose**: Top hero section displaying the recommended price and demand badge.
  - **Inputs/Outputs**: Takes recommendation data, renders large text and badges.
  - **Current Responsibility**: Quick summary of the selected date's pricing.
  - **Recently Modified**: No (Inspected during latest task, but not modified).

- **frontend/src/pages/PricingPage.css**
  - **Purpose**: CSS styles for the pricing dashboard.
  - **Inputs/Outputs**: CSS styles.
  - **Current Responsibility**: Styling components, including `.demand-high` (green) and `.demand-low` (red) classes.
  - **Recently Modified**: No (Inspected during latest task, but not modified).

## Data/Model/Config

- **models/best_pricing_model_v1_2.pkl**
  - **Purpose**: Serialized Random Forest model (V1.2).
  - **Inputs/Outputs**: Model artifact.
  - **Current Responsibility**: Base price prediction.
  - **Recently Modified**: No (Not inspected).

- **data/demo/properties.json**
  - **Purpose**: Mock property data.
  - **Inputs/Outputs**: JSON data.
  - **Current Responsibility**: Providing demo properties for development.
  - **Recently Modified**: No (Not inspected).

- **notebooks/data/processed/london_date_features.csv**
  - **Purpose**: Processed date features including market pressure scores.
  - **Inputs/Outputs**: CSV data.
  - **Current Responsibility**: Providing historical/simulated market pressure for the pricing engine.
  - **Recently Modified**: No (Inspected during latest task to verify `market_pressure_score`, but not modified).

- **data/processed/london_date_features.csv**
  - **Purpose**: Production or alternate copy of date features.
  - **Inputs/Outputs**: CSV data.
  - **Current Responsibility**: Similar to the notebook version.
  - **Recently Modified**: No (Not inspected).

## Latest Investigation

- **Problem**: Pricing calendar appeared mostly red.
- **Files inspected**: `PricingCalendar.jsx`, `PricingPage.css`, `frontend/src/api/pricing.js`, `src/pricing/pricing_engine.py`, `src/api/server.py`, `frontend/src/pages/PricingPage.jsx`, `frontend/src/components/pricing/PricingHero.jsx`, `frontend/src/data/mockData.js`, `src/api/pricing_mock.py`, and `notebooks/data/processed/london_date_features.csv`.
- **Root cause**: CSS semantics and frontend demand-level mapping were inconsistent. The backend correctly returns "low" demand for dates with low market pressure. The CSS styles `.demand-low` as red and `.demand-high` as green. The visual design clashed with the standard semantic where red = high/hot demand.
- **Backend was verified** to return correct low/high demand levels.
- **Fix**: Frontend mapping only. Modified `PricingCalendar.jsx` to map backend `high` → `demand-low` (red) and backend `low` → `demand-high` (green).
- **CSS was not changed**.
- **Build passed**.
- **Verification still needed**: Visually test low/medium/high calendar dates to confirm appropriate colors.
