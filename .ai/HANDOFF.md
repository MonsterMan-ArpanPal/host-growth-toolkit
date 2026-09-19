Dynamic Pricing + Auto-Listing Generator — Handoff

Current state

The Dynamic Pricing feature ships, and the Auto-Listing Generator flow
is now the active development focus. All backend services run from a
single uv-managed FastAPI entry point: `api/main.py`.

Implemented

- Random Forest base pricing model
- Feature engineering
- Comparable listing matching
- Market pressure signal
- Seasonality
- Event-aware pricing
- Fusion V2 pricing logic
- FastAPI pricing endpoint
- React pricing page
- Dynamic date-specific recommendations
- 30-day calendar connected to per-date backend recommendations
- Auto-Listing Generator pipeline (`src/listings/pipeline.py`):
  - Stage 1 Photo QC — lightweight variance-of-Laplacian blur via OpenCV
    (PyIQA / PyTorch intentionally removed; assumed sharp when absent)
  - Stage 2 Vision feature extraction (Qwen 2.5-VL via OpenAI-compatible API)
  - Stage 3 Listing writer (GPT-4o-mini via OpenRouter)
  - Offline fallback listing generation when no API key is set
- Unified backend `api/main.py` (uv managed): auth, properties,
  pricing, listings generate/save/list, WhatsApp webhook, bookings.
- Listings are persisted in a TinyDB NoSQL document store
  (`data/demo/listings.json`) with uploaded photos stored under
  `data/demo/listings_photos/<prop_id>/`.
- Frontend listings flow: "Create New Listing" button -> `/listings/new` ->
  upload photos + specs -> Save -> navigates back to ListingsPage, which
  renders listing cards (photo, name, type, location, capacity specs,
  amenities, highlights, photo count).

Latest completed work and current state

<<<<<<< Updated upstream
- Remote main was merged locally after a rejected push; demo JSON records were union-merged with no divergent shared entries.
- Calendar turnover UX refined: the static turnover banner was removed and September 12/19 demo turnover tags now open a date-level cleaning-prep popover. Booking arrival/departure dates use the same dynamic indicator.
- Calendar simplified: iCal sync, external-channel UI, property-name emojis, and color-coded reservation panels were removed in favor of neutral booking states.
- Calendar date cells now use a vertical hierarchy: prominent date, muted price beneath it, and a bottom-aligned status.
- Calendar now includes click-to-open booking detail popovers and a booking-derived monthly revenue, occupancy, and channel summary footer.
- Calendar red-state investigation completed.
- Root cause was frontend demand-level/color mapping.
- Backend market pressure and demandLevel were verified.
- PricingCalendar.jsx was changed.
- PricingPage.css was inspected but intentionally NOT modified.
- Build passed.
- End-to-end verification completed: recommendation, comparables, 30-day calendar, and calendar date selection all load real backend data.
- Demand mapping was verified: backend low maps to green, medium to neutral, and high to red in the calendar.
- Calendar loading was made resilient to transient request failures: each pricing request retries up to three times, and calendar requests are limited to five concurrent calls.
- Frontend-only demo support added: if FastAPI is unreachable, the Pricing page uses the repository's deterministic bundled demo recommendations and calendar instead of showing a loading error. When FastAPI is available, real API recommendations remain the primary source.
- Model compatibility: `models/best_pricing_model_v1_2.pkl` embeds scikit-learn 1.7.2. Backend dependency manifests pin `scikit-learn==1.7.2` so new environments can load the model reliably.
=======
- Moved the heavy photo-QC packages (`pyiqa`, `opencv-python-headless`,
  `pillow`) into an optional `image-qc` extra in both `pyproject.toml`
  files. They pull in PyTorch; the pipeline now degrades gracefully
  without them. Re-enable with `uv sync --extra image-qc`.
- `uv.lock` regenerated; `uv sync` installs only light packages.
- Fixed `whatsapp_router` import in `api/main.py` by adding `api/` to
  sys.path so `uv run uvicorn api.main:app` works from the project root.
- Repaired `data/demo/properties.json` (was two concatenated JSON
  objects) -> merged 30 properties; `users.json` kept as-is.
- Added `GET /api/listings` (returns all saved listings),
  `POST /api/listings/save` (multipart: `manual_data`, `listing_result`,
  `files` photos), and `GET /media/listings/{prop_id}/{filename}`.
- Added `/media` proxy to `frontend/vite.config.js`.
- Deprecated `db/init_db.py` path removed — main.py uses TinyDB, not
  SQLite, so `_sqlite3` absence on system Python 3.14 is non-blocking.
- Frontend `vite build` passes; backend routes verified via TestClient
  including photo round-trip.
>>>>>>> Stashed changes

Run commands

- Backend: `uv run uvicorn api.main:app --reload --host 0.0.0.0 --port 8000`
  (from project root), or `cd api && uv run python main.py`.
- Frontend: `cd frontend && npm run dev` (port 3000).

Note: a stale backend instance (old `main.py`, PID 94795) was running
and clobbering `data/demo/properties.json` from its in-memory state.
Restart the backend to pick up the TinyDB listing flow and the restored
30-property dataset.

Next steps

- Test the full create-listing flow in the browser against the backend.
- Consider seeding `data/demo/listings.json` with sample listings so the
  ListingsPage gallery is not empty on first load.
- Then continue improving/testing the Dynamic Pricing feature and other
  Host Growth Toolkit features.
- Model compatibility pin retained after backend merge: the serialized pricing model requires scikit-learn==1.7.2.

- 2026-09-19: Pulled `origin/main` (fast-forward). Restored local demo-data edits; `properties.json` was conflict-resolved as a union of 30 pulled and four local-only records (34 total). `users.json` local edits remain staged. The temporary safety stash is retained.
- 2026-09-19: Diagnosed pricing endpoint 500s after the pull: the comparable-listings CSV's `price` column is pandas 3.0 `str` dtype, which bypasses the legacy `dtype == 'O'` cleanup in `src/pricing/comparables.py`; filtering then attempts `str >= float`. All non-pricing endpoints verified in the terminal log returned 200.
- 2026-09-19: Fixed the pricing 500 by coercing comparable-listing prices to numeric regardless of pandas string dtype; the FastAPI pricing recommendation request now returns 200 under pandas 3.0.6.
- 2026-09-19: Scoped property and listing reads to the signed-in email. The pricing selector, Listings page, and listing detail request their account's records only; API isolation checks and the frontend production build pass.
