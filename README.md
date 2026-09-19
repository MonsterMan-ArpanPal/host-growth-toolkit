# Wayzyy — Host Growth Toolkit

AI-powered short-term rental platform for hosts: dynamic pricing, an AI
auto-listing generator, and WhatsApp booking intake.

## Architecture

```
frontend/  React (Vite) UI            → http://localhost:5173
api/       Unified FastAPI backend    → http://localhost:8000
src/pricing/     ML pricing engine (Random Forest V1.2 + Fusion V2)
src/listings/    Auto-listing pipeline (photo QC → vision → writer)
src/features/    Feature engineering for the pricing model
data/demo/       TinyDB document store + demo properties/users
models/          Trained pricing model artifacts
```

`api/main.py` is the single backend entry point. It serves auth, property
onboarding, pricing, the auto-listing generator and the WhatsApp webhook, and
reads/writes property data in the TinyDB store.

## Run it (one command)

```bash
# backend (from the project root)
uv sync                       # first time only — creates .venv
uv run uvicorn api.main:app --reload --host 0.0.0.0 --port 8000

# frontend (separate terminal)
cd frontend && npm install    # first time only
npm run dev
```

Dependencies are managed with [uv](https://docs.astral.sh/uv/) via
`pyproject.toml` + `uv.lock`. `api/` is a uv workspace member.

Optional heavy photo-QC extras (PyIQA + PyTorch + OpenCV):

```bash
uv sync --extra image-qc
```

Without them the listing pipeline skips blur/quality flagging but still runs
the vision + writer steps.

## Data store

Property data lives in `data/demo/`:

| File | Contents |
| --- | --- |
| `listings.json` | TinyDB store — every listing saved from the UI |
| `properties.json` | Demo properties (including `/setup` onboarding results) |
| `users.json` | Demo user accounts |
| `listings_photos/` | Photos uploaded when creating a listing |

Every saved listing stores the full pricing feature set (type, room type,
capacity, bedrooms/beds/bathrooms, neighbourhood, coordinates, canonical
amenity flags, `num_amenities`, distance to centre, per-bedroom ratios), so the
pricing engine needs no data from anywhere else.

## Pricing flow

```
Pricing UI → GET /api/properties        (demo + saved listings)
           → POST /api/pricing/recommend  { property_id, date }
           → property document loaded from the DB
           → feature engineering → RF base price
           → comparables + market pressure + weekend + events (Fusion V2)
           → recommended price
```

> **Note:** `scikit-learn` is pinned to `<1.8` because
> `models/best_pricing_model_v1_2.pkl` was fitted with an older release
> (sklearn 1.9 renamed `SimpleImputer._fit_dtype` → `_fill_dtype`, which breaks
> loading/transforming the existing artifact).

## Key endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/signup`, `/api/auth/login` | Demo auth |
| `GET` `POST` | `/api/properties` | List the host's properties / create one from `/setup`. Seeded demo rows are hidden unless you pass `?include_demo=true` |
| `POST` | `/api/pricing/recommend` | Price a property on a date |
| `POST` | `/api/listings/generate` | Run the AI listing pipeline |
| `POST` | `/api/listings/save` | Persist a listing + photos to the DB |
| `GET` | `/api/listings`, `/api/listings/{id}` | Listings page / detail view |
| `POST` | `/api/whatsapp/webhook`, `GET /api/bookings` | WhatsApp intake |
