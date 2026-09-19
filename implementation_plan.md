# Auto-Listing Generator Implementation Plan

This plan details the implementation of the AI-powered Auto-Listing Generator pipeline and the new "Create Listing" frontend flow. 

Since the project currently lacks a backend API server to connect the frontend to the ML models, this plan also includes setting up a lightweight FastAPI server.

## User Review Required

> [!IMPORTANT]
> **Model Hosting Strategy**
> Running Qwen 2.5-VL and a Text Model locally requires significant GPU memory and can be slow depending on your hardware. 
> - **Option A (Recommended for speed & ease)**: Use cloud APIs for the Vision and Text models (e.g., OpenRouter, Together AI, or OpenAI/Anthropic), and run only PyIQA locally.
> - **Option B (Fully Local)**: Run everything locally using the `transformers` library and a local LLM runner. 
> 
> *Please confirm your preference.*

> [!IMPORTANT]
> **Text Writer Model**
> Which text-only model would you like to use for the final prose generation? (e.g., GPT-4o-mini, Claude 3.5 Haiku, Llama 3 8B, etc.).

## Open Questions

> [!TIP]
> 1. **PyIQA Thresholds**: Do you have a preference on how strict the quality/blur filter should be for photos, or should I define sensible defaults?
> 2. **Saving State**: When the AI generates the listing and the user clicks "Save", we currently only have mock data. Should I implement a basic SQLite database in the FastAPI backend to actually save and retrieve these new properties, or just update the frontend mock state temporarily?

## Proposed Changes

### 1. Frontend: UI Updates

#### [NEW] `frontend/src/pages/NewListingPage.jsx` & `.css`
Create a new page (`/dashboard/listings/new`) following the existing glassmorphic, dark-theme design style.
- **Manual Input Fields**: Fields the AI cannot accurately guess.
  - Location (e.g., Assagao, India)
  - Property Type (e.g., Villa, Apartment)
  - Capacity (Number of Guests, Bedrooms, Beds, Bathrooms)
  - Key Amenities Checkboxes (e.g., Self check-in, A/C, Pool, WiFi)
- **Bulk Photo Upload**: A drag-and-drop zone to upload multiple property photos.
- **Action Button**: "Generate Listing with AI".
- **Result View**: Once generated, displays the AI-written Title, Highlights, and Description. Shows PyIQA photo quality verdicts (e.g., flagging a blurry photo). Includes a final "Save Listing" button.

#### [MODIFY] `frontend/src/pages/ListingsPage.jsx`
- Add a prominent "Create New Listing" button at the top header that navigates to the new page.
- **Completeness Score**: Introduce a new "Profile Completeness" score for properties. This score will evaluate if manual details (capacity, amenities) and AI details (title, description, photos) are all present, giving the host a metric to improve.

#### [MODIFY] `frontend/src/App.jsx`
- Register the new route `<Route path="listings/new" element={<NewListingPage />} />`.

#### [MODIFY] `frontend/src/api/listings.js` (New Client)
- Implement `generateListing(files, manualData)` to send a `multipart/form-data` request to the backend.

### 2. Backend: API Server & ML Pipeline

#### [NEW] `src/api/server.py`
- Initialize a FastAPI application with CORS enabled for the React frontend.
- Create `POST /api/listings/generate` endpoint accepting multiple images and form data (the manual inputs).

#### [NEW] `src/listings/pipeline.py`
- **`run_photo_qc(images)`**: 
  - Uses `pyiqa` to score each image for quality (e.g., MUSIQ/BRISQUE) and blurriness.
  - Returns verdicts and specific flags (e.g., "Blurry", "Good quality").
- **`extract_vision_features(images)`**: 
  - Iterates through the good quality images.
  - Prompts Qwen 2.5-VL to extract structured JSON features: room type, lighting, furniture, style, and unique visual selling points.
- **`generate_listing(manual_facts, vision_features)`**: 
  - Feeds the host's manual inputs (capacity, location, amenities) and extracted JSON features to the Text Writer Model.
  - Prompts the model to output a structured JSON containing: `title`, `highlights` (e.g., "Outdoor entertainment", "Designed for staying cool"), and `full_description` formatted for Airbnb-style listings.

#### [MODIFY] `requirements.txt`
- Add `fastapi`, `uvicorn`, `python-multipart`, `pyiqa`, `transformers` (if local), and API clients (e.g., `openai`).

## Verification Plan

1. Start the FastAPI backend and the Vite frontend.
2. Navigate to the Listings page and click "Create New Listing".
3. Fill in manual details (e.g., 3 bedrooms, Villa in Goa, Pool).
4. Upload 3 photos (including one blurry one).
5. Click "Generate Listing".
6. Verify the pipeline accurately flags the bad photo via PyIQA and displays the alert on the UI.
7. Verify Qwen 2.5-VL extracts features from the good photos.
8. Verify the Writer Model incorporates the manual facts (3 beds, pool) and visual facts into a coherent title and description.
9. Check that the Profile Completeness score updates appropriately when viewing the saved listing.
