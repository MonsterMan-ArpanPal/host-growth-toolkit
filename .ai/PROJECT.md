Wayzyy Dynamic Pricing — Project Context

Current focus

For now, work only on the Dynamic Pricing feature of the Wayzyy Host Growth Toolkit.

Goal

Given a host property and a date, generate a useful nightly price recommendation using:

Property characteristics

ML-based base price

Comparable listings

Market pressure

Seasonality

Weekend/event signals

Current architecture

Property + Date
      ↓
Feature Engineering
      ↓
ML Base Price
      ↓
Comparables + Market Pressure + Date/Event Signals
      ↓
Fusion V2 Pricing Engine
      ↓
Recommended Price
      ↓
FastAPI
      ↓
React Pricing UI

Current model

Random Forest is the current base pricing model. Multiple versions were developed with progressively richer property/location features.

Documented V1.0 → V1.1 → V1.2 evaluations:

V1.0 RF: R² 0.3871, MAE $69.82, RMSE $115.05

V1.1 RF: R² 0.6071, MAE $52.06, RMSE $92.12

V1.2 RF: R² 0.6350, MAE $50.16, RMSE $88.78

Current dynamic layer

Fusion V2 combines the ML base price with comparable-market, market-pressure, weekend, and event signals while keeping adjustments bounded.

The UI has:

Date-specific recommendation

Comparable market range

Pricing factors

30-day pricing calendar

Immediate work

The 30-day pricing calendar has recently been changed to request real backend recommendations for individual dates.

Latest Updates

- Backend pricing data was verified as correct.
- September dates correctly return low market pressure / low demand.
- The issue was frontend color mapping, not the pricing engine.
- PricingCalendar.jsx was mapping backend demand levels to the existing CSS classes incorrectly for the intended visual semantics.
- Fixed mapping:
  - backend high → demand-high → red
  - backend low → demand-low → green
- Keep the existing CSS/layout/design unchanged.
- Build completed successfully.
- Mention that medium-demand mapping should also remain correct/neutral.
- Do not claim any backend pricing/model changes were made.

Rules

Use the current local code as the source of truth.

Do not invent pricing results.

Keep existing UI/design unless explicitly asked to change it.

Do not silently reintroduce mock pricing into the real pricing flow.