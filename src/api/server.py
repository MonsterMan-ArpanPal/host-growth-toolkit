"""
Wayzyy API Server
=================

Lightweight FastAPI server that connects the React frontend to the
ML pipeline and pricing engine.

Run with:
    uvicorn src.api.server:app --reload --host 0.0.0.0 --port 8000
"""

from __future__ import annotations

import os
import sys
import tempfile
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

# Add project root to path so imports work when run from anywhere
_PROJECT_ROOT = str(Path(__file__).resolve().parent.parent.parent)
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)

app = FastAPI(
    title="Wayzyy API",
    description="Auto-Listing Generator and Pricing Engine backend",
    version="0.1.0",
)

# CORS — allow the Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",  # Vite default fallback
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------
@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "wayzyy-api"}


# ---------------------------------------------------------------------------
# POST /api/listings/generate
# ---------------------------------------------------------------------------
@app.post("/api/listings/generate")
async def generate_listing(
    files: List[UploadFile] = File(...),
    location: str = Form(""),
    property_type: str = Form(""),
    capacity_guests: int = Form(2),
    bedrooms: int = Form(1),
    beds: int = Form(1),
    bathrooms: int = Form(1),
    amenities: str = Form(""),
    description_notes: str = Form(""),
):
    """
    Accept property photos + manual form data, run the three-stage
    AI pipeline, and return the generated listing.
    """
    # Save uploaded files to a temp directory
    upload_dir = Path(tempfile.mkdtemp(prefix="wayzyy_uploads_"))
    saved_paths: List[str] = []

    for upload_file in files:
        dest = upload_dir / upload_file.filename
        content = await upload_file.read()
        dest.write_bytes(content)
        saved_paths.append(str(dest))

    if not saved_paths:
        raise HTTPException(status_code=400, detail="At least one photo is required")

    # Build manual data dict
    manual_data: Dict[str, Any] = {
        "location": location,
        "property_type": property_type,
        "capacity_guests": capacity_guests,
        "bedrooms": bedrooms,
        "beds": beds,
        "bathrooms": bathrooms,
        "amenities": [a.strip() for a in amenities.split(",") if a.strip()],
        "description_notes": description_notes,
    }

    # Run the pipeline
    try:
        from listings.pipeline import run_pipeline
        result = run_pipeline(saved_paths, manual_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Pipeline failed: {e}")

    return {
        "title": result.title,
        "highlights": result.highlights,
        "full_description": result.full_description,
        "photo_verdicts": result.photo_verdicts,
        "vision_features": result.vision_features,
    }


# ---------------------------------------------------------------------------
# Pricing endpoints (bridge to existing pricing engine)
# ---------------------------------------------------------------------------
@app.get("/api/properties")
async def get_properties():
    """Return mock properties list — swap for real DB later."""
    from api.pricing_mock import MOCK_PROPERTIES
    return MOCK_PROPERTIES


@app.post("/api/pricing/recommend")
async def pricing_recommend(payload: Dict[str, Any]):
    """Run the pricing engine for a property + date."""
    property_features = payload.get("property_features", {})
    target_date = payload.get("date")

    if not target_date:
        raise HTTPException(status_code=400, detail="date is required")

    try:
        from pricing.pricing_engine import recommend_price
        rec = recommend_price(property_features, target_date)
        return rec.to_dict()
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Pricing engine error: {e}")


# ---------------------------------------------------------------------------
# Entrypoint
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
