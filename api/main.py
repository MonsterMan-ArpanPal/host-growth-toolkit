"""
Wayzyy Unified API — single backend entry point
================================================

All services run from this one FastAPI app:

1. Dynamic Pricing Engine          (src/pricing)
2. Auto-Listing Generator          (src/listings)
3. User Auth & Property Setup      (data/demo/*.json)
4. WhatsApp Webhook & Bookings      (whatsapp_router.py)

Run (from the project root, using uv):
    uv run uvicorn api.main:app --reload --host 0.0.0.0 --port 8000

Or from inside api/:
    uv run python main.py
"""

import sys
from pathlib import Path

# Add src and this dir to sys.path so we can import from
# src.pricing / src.listings and from whatsapp_router regardless of cwd.
_THIS_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = _THIS_DIR.parent
SRC_DIR = PROJECT_ROOT / "src"
for _p in (SRC_DIR, _THIS_DIR):
    if str(_p) not in sys.path:
        sys.path.insert(0, str(_p))

import json
import tempfile
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List

from dotenv import load_dotenv

# Load .env (OPENROUTER_API_KEY, VISION_MODEL, WRITER_MODEL, ...)
load_dotenv(PROJECT_ROOT / ".env")

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
import uvicorn
from tinydb import TinyDB

from pricing.pricing_engine import PricingEngine, PricingRecommendation
from whatsapp_router import router as whatsapp_router

app = FastAPI(title="Wayzyy Pricing API")
app.include_router(whatsapp_router)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load demo properties
DEMO_PROPERTIES_PATH = PROJECT_ROOT / "data" / "demo" / "properties.json"
try:
    with open(DEMO_PROPERTIES_PATH, "r") as f:
        DEMO_PROPERTIES = json.load(f)
except Exception as e:
    print(f"Warning: Could not load demo properties: {e}")
    DEMO_PROPERTIES = {}

# Load users
USERS_PATH = PROJECT_ROOT / "data" / "demo" / "users.json"
try:
    with open(USERS_PATH, "r") as f:
        USERS = json.load(f)
except Exception as e:
    print(f"Warning: Could not load users: {e}")
    USERS = {}


def save_users():
    with open(USERS_PATH, "w") as f:
        json.dump(USERS, f)


def save_properties():
    with open(DEMO_PROPERTIES_PATH, "w") as f:
        json.dump(DEMO_PROPERTIES, f)


# ---------------------------------------------------------------------------
# NoSQL store (TinyDB — lightweight JSON document database)
# ---------------------------------------------------------------------------
LISTINGS_DB_PATH = PROJECT_ROOT / "data" / "demo" / "listings.json"
LISTINGS_PHOTOS_DIR = PROJECT_ROOT / "data" / "demo" / "listings_photos"
LISTINGS_DB_PATH.parent.mkdir(parents=True, exist_ok=True)
LISTINGS_PHOTOS_DIR.mkdir(parents=True, exist_ok=True)

listings_db = TinyDB(str(LISTINGS_DB_PATH))


# Initialize the Pricing Engine on startup
engine = None


@app.on_event("startup")
def load_engine():
    global engine
    try:
        engine = PricingEngine()
    except Exception as e:
        print(f"Warning: Could not initialize PricingEngine: {e}")


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------
class RecommendRequest(BaseModel):
    property_id: str
    date: str


class SignupRequest(BaseModel):
    first_name: str
    last_name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class PropertySetupRequest(BaseModel):
    email: str
    property_type: str
    room_type: str
    accommodates: int
    bathrooms: float
    bedrooms: float
    beds: int
    latitude: float
    longitude: float
    host_neighbourhood: str
    amenities: list[str]


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------
@app.get("/health")
def health_check():
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------
@app.post("/api/auth/signup")
def signup(req: SignupRequest):
    if req.email in USERS:
        raise HTTPException(status_code=400, detail="User already exists")

    USERS[req.email] = {
        "first_name": req.first_name,
        "last_name": req.last_name,
        "email": req.email,
        "password": req.password,
        "property_id": None,
    }
    save_users()
    return {"token": "fake-jwt-token", "user": USERS[req.email]}


@app.post("/api/auth/login")
def login(req: LoginRequest):
    user = USERS.get(req.email)
    if not user or user["password"] != req.password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {"token": "fake-jwt-token", "user": user}


# ---------------------------------------------------------------------------
# Properties
# ---------------------------------------------------------------------------
@app.get("/api/properties")
def list_properties():
    """Return the list of known demo properties for the frontend property selector."""
    result = []
    for prop_id, prop in DEMO_PROPERTIES.items():
        result.append({
            "id": prop_id,
            "name": prop.get("name") or prop.get("host_neighbourhood", prop_id),
            "address": f"{prop.get('host_neighbourhood', 'London')}, London",
            "minPrice": 50,
            "maxPrice": 1000,
        })
    return result


@app.post("/api/properties")
def setup_property(req: PropertySetupRequest):
    user = USERS.get(req.email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    prop_id = f"prop_{uuid.uuid4().hex[:8]}"

    prop_data = {
        "id": prop_id,
        "property_type": req.property_type,
        "room_type": req.room_type,
        "accommodates": req.accommodates,
        "bathrooms": req.bathrooms,
        "bedrooms": req.bedrooms,
        "beds": req.beds,
        "latitude": req.latitude,
        "longitude": req.longitude,
        "host_neighbourhood": req.host_neighbourhood,
        "amenities": json.dumps(req.amenities),
        "has_wifi": 1 if "Wifi" in req.amenities else 0,
        "has_kitchen": 1 if "Kitchen" in req.amenities else 0,
        "has_heating": 1 if "Heating" in req.amenities else 0,
        "has_smoke_alarm": 1 if "Smoke alarm" in req.amenities else 0,
        "has_washer": 1 if "Washer" in req.amenities else 0,
        "has_dryer": 1 if "Dryer" in req.amenities else 0,
        "has_air_conditioning": 1 if "Air conditioning" in req.amenities else 0,
        "has_tv": 1 if "TV" in req.amenities else 0,
        "number_of_reviews": 10,
        "review_scores_rating": 4.8,
        "review_scores_location": 4.8,
        "host_is_superhost": "t",
        "dist_to_center": 3.0,
        "host_tenure_years": 2.0,
        "host_response_rate": 100,
        "host_acceptance_rate": 100,
        "host_listings_count": 1,
    }

    DEMO_PROPERTIES[prop_id] = prop_data
    save_properties()

    user["property_id"] = prop_id
    save_users()

    return {"property_id": prop_id}


# ---------------------------------------------------------------------------
# Pricing recommendations
# ---------------------------------------------------------------------------
@app.post("/api/pricing/recommend")
def recommend_price(req: RecommendRequest):
    if engine is None:
        raise HTTPException(status_code=500, detail="PricingEngine not initialized properly.")

    prop_id = req.property_id
    if prop_id not in DEMO_PROPERTIES:
        raise HTTPException(status_code=404, detail=f"Property {prop_id} not found in demo data.")

    prop_features = DEMO_PROPERTIES[prop_id]

    try:
        recommendation: PricingRecommendation = engine.recommend_price(
            property_features=prop_features,
            target_date=req.date,
        )
        return recommendation.to_dict()
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {e}")


# ---------------------------------------------------------------------------
# Auto-Listing Generator
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
    from listings.pipeline import run_pipeline

    upload_dir = Path(tempfile.mkdtemp(prefix="wayzyy_uploads_"))
    saved_paths: List[str] = []

    for upload_file in files:
        dest = Path(upload_dir) / upload_file.filename
        content = await upload_file.read()
        dest.write_bytes(content)
        saved_paths.append(str(dest))

    if not saved_paths:
        raise HTTPException(status_code=400, detail="At least one photo is required")

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

    try:
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


@app.post("/api/listings/save")
async def save_generated_listing(
    manual_data: str = Form(...),
    listing_result: str = Form(...),
    files: List[UploadFile] = File(default=[]),
):
    """
    Persist a generated listing (plus its photos) into the NoSQL
    document store (TinyDB) so it appears on the frontend listings page.
    """
    manual = json.loads(manual_data)
    listing = json.loads(listing_result)

    amenities = [
        a.strip() for a in (manual.get("amenities") or [])
        if isinstance(a, str) and a.strip()
    ]

    prop_id = f"prop_{uuid.uuid4().hex[:8]}"

    # Store uploaded photos to disk
    photo_paths: List[str] = []
    prop_photo_dir = LISTINGS_PHOTOS_DIR / prop_id
    prop_photo_dir.mkdir(parents=True, exist_ok=True)

    for upload_file in files:
        safe_name = Path(upload_file.filename or f"photo_{len(photo_paths)}.jpg").name
        dest = prop_photo_dir / safe_name
        content = await upload_file.read()
        if content:
            dest.write_bytes(content)
            photo_paths.append(f"/media/listings/{prop_id}/{safe_name}")

    prop_data = {
        "id": prop_id,
        "name": listing.get("title", "New Property"),
        "property_type": manual.get("property_type") or "Apartment",
        "room_type": "Entire home/apt",
        "accommodates": int(manual.get("capacity_guests", 2)),
        "bathrooms": float(manual.get("bathrooms", 1)),
        "bedrooms": float(manual.get("bedrooms", 1)),
        "beds": int(manual.get("beds", 1)),
        "host_neighbourhood": manual.get("location") or "London",
        "latitude": 51.5074,
        "longitude": -0.1278,
        "amenities": amenities,
        "number_of_reviews": 0,
        "review_scores_rating": 4.8,
        "review_scores_location": 4.8,
        "host_is_superhost": "f",
        "dist_to_center": 3.0,
        "host_tenure_years": 0.0,
        "host_response_rate": 100,
        "host_acceptance_rate": 100,
        "host_listings_count": 1,
        # AI-generated listing content
        "listing_title": listing.get("title"),
        "highlights": listing.get("highlights", []),
        "full_description": listing.get("full_description", ""),
        "photo_verdicts": listing.get("photo_verdicts", []),
        "vision_features": listing.get("vision_features", []),
        # Photos given during listing creation
        "photos": photo_paths,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    listings_db.insert(prop_data)

    return {"success": True, "property_id": prop_id}


@app.get("/api/listings")
def list_saved_listings():
    """Return all listings saved in the NoSQL store."""
    docs = listings_db.all()
    result = []
    for doc in docs:
        result.append({
            "id": doc.get("id"),
            "name": doc.get("name") or doc.get("listing_title") or "New Property",
            "property_type": doc.get("property_type", ""),
            "location": doc.get("host_neighbourhood", ""),
            "accommodates": doc.get("accommodates", 0),
            "bedrooms": doc.get("bedrooms", 0),
            "beds": doc.get("beds", 0),
            "bathrooms": doc.get("bathrooms", 0),
            "amenities": doc.get("amenities", []),
            "photos": doc.get("photos", []),
            "listing_title": doc.get("listing_title"),
            "highlights": doc.get("highlights", []),
            "full_description": doc.get("full_description", ""),
        })
    return {"listings": result}


@app.get("/media/listings/{prop_id}/{filename}")
def get_listing_photo(prop_id: str, filename: str):
    """Serve a photo uploaded for a listing."""
    safe_name = Path(filename).name
    if safe_name != filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    photo_path = LISTINGS_PHOTOS_DIR / prop_id / safe_name
    if not photo_path.is_file():
        raise HTTPException(status_code=404, detail="Photo not found")
    return FileResponse(photo_path)


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)