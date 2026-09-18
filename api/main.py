import sys
from pathlib import Path

# Add src to sys.path so we can import from src.pricing etc.
_THIS_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = _THIS_DIR.parent
sys.path.insert(0, str(PROJECT_ROOT / "src"))

import json
from datetime import date
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

from pricing.pricing_engine import PricingEngine, PricingRecommendation

app = FastAPI(title="Wayzyy Pricing API")

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

# Initialize the Pricing Engine on startup
engine = None

@app.on_event("startup")
def load_engine():
    global engine
    try:
        engine = PricingEngine()
    except Exception as e:
        print(f"Warning: Could not initialize PricingEngine: {e}")

class RecommendRequest(BaseModel):
    property_id: str
    date: str

@app.get("/health")
def health_check():
    return {"status": "ok"}

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
            target_date=req.date
        )
        return recommendation.to_dict()
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {e}")

import uuid

# Load users
USERS_PATH = PROJECT_ROOT / "data" / "demo" / "users.json"
try:
    with open(USERS_PATH, "r") as f:
        USERS = json.load(f)
except Exception as e:
    USERS = {}

def save_users():
    with open(USERS_PATH, "w") as f:
        json.dump(USERS, f)

def save_properties():
    with open(DEMO_PROPERTIES_PATH, "w") as f:
        json.dump(DEMO_PROPERTIES, f)

class SignupRequest(BaseModel):
    first_name: str
    last_name: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

@app.post("/api/auth/signup")
def signup(req: SignupRequest):
    if req.email in USERS:
        raise HTTPException(status_code=400, detail="User already exists")
    
    USERS[req.email] = {
        "first_name": req.first_name,
        "last_name": req.last_name,
        "email": req.email,
        "password": req.password,
        "property_id": None
    }
    save_users()
    return {"token": "fake-jwt-token", "user": USERS[req.email]}

@app.post("/api/auth/login")
def login(req: LoginRequest):
    user = USERS.get(req.email)
    if not user or user["password"] != req.password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {"token": "fake-jwt-token", "user": user}

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

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
