"""
Auto-Listing Generator Pipeline
===============================

Three-stage pipeline that turns uploaded property photos + manual facts
into an Airbnb-style listing.

Stage 1 – Photo QC (PyIQA)
    Scores each image for perceptual quality and sharpness.
    Flags blurry / low-quality photos before they reach the LLM.

Stage 2 – Vision Feature Extraction (Qwen 2.5-VL via API)
    Sends the *good* photos to a vision-language model and asks for
    structured JSON describing room types, lighting, furniture, style,
    and visual selling points.

Stage 3 – Listing Writer (Text LLM via API)
    Combines the host's manual inputs with the extracted visual features
    and asks the writer model to produce a title, highlight bullets, and
    a full listing description.

All external model calls use the OpenAI-compatible chat API format,
making them compatible with OpenRouter, Together AI, OpenAI, and any
other provider that exposes a /v1/chat/completions endpoint.
"""

from __future__ import annotations

import base64
import io
import json
import logging
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
VISION_MODEL = os.getenv("VISION_MODEL", "qwen/qwen-2.5-vl-72b-instruct")
WRITER_MODEL = os.getenv("WRITER_MODEL", "openai/gpt-4o-mini")
API_BASE_URL = os.getenv("OPENAI_API_BASE", os.getenv("OPENROUTER_API_BASE", "https://openrouter.ai/api/v1"))
API_KEY = os.getenv("OPENROUTER_API_KEY", os.getenv("OPENAI_API_KEY", ""))

# PyIQA thresholds
QUALITY_MIN_SCORE = float(os.getenv("PHOTO_QUALITY_MIN", "40"))
BLUR_MAX_SCORE = float(os.getenv("PHOTO_BLUR_MAX", "50"))


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------
@dataclass
class PhotoVerdict:
    filename: str
    quality_score: float
    blur_score: float
    is_good: bool
    flags: List[str] = field(default_factory=list)


@dataclass
class VisionFeatures:
    filename: str
    room_type: str
    lighting: str
    furniture_style: str
    colour_palette: str
    unique_selling_points: List[str]
    description: str


@dataclass
class ListingResult:
    title: str
    highlights: List[str]
    full_description: str
    photo_verdicts: List[Dict[str, Any]]
    vision_features: List[Dict[str, Any]]


# ---------------------------------------------------------------------------
# Stage 1 – Photo QC
# ---------------------------------------------------------------------------
def run_photo_qc(image_paths: List[str]) -> List[PhotoVerdict]:
    """
    Score each image with PyIQA and flag quality / blur issues.

    Uses MUSIQ for quality (higher = better) and a variance-of-Laplacian
    proxy for blur (higher = sharper, so we invert for a "blur score"
    where higher = blurrier).

    Returns a list of PhotoVerdict objects.
    """
    try:
        import pyiqa
        import torch
    except ImportError:
        logger.warning("pyiqa not installed — skipping photo QC, marking all as good")
        return [
            PhotoVerdict(
                filename=Path(p).name,
                quality_score=100.0,
                blur_score=0.0,
                is_good=True,
                flags=["QC skipped (pyiqa not installed)"],
            )
            for p in image_paths
        ]

    device = "cuda" if torch.cuda.is_available() else "cpu"

    try:
        quality_metric = pyiqa.create_metric("musiq", device=device)
    except Exception:
        quality_metric = None
        logger.warning("Could not load MUSIQ model — quality scores will be default")

    verdicts: List[PhotoVerdict] = []
    for path in image_paths:
        fname = Path(path).name
        flags: List[str] = []

        # Quality score (MUSIQ, 0-100)
        quality_score = 80.0
        if quality_metric is not None:
            try:
                from PIL import Image as PILImage
                img = PILImage.open(path).convert("RGB")
                with torch.no_grad():
                    quality_score = float(quality_metric(img).item())
            except Exception as e:
                logger.warning(f"Quality scoring failed for {fname}: {e}")

        # Blur score (variance of Laplacian — higher = sharper)
        blur_score = 0.0
        try:
            import cv2
            import numpy as np

            img_cv = cv2.imread(str(path), cv2.IMREAD_GRAYSCALE)
            if img_cv is not None:
                blur_score = float(cv2.Laplacian(img_cv, cv2.CV_64F).var())
        except ImportError:
            logger.warning("opencv-python not installed — blur detection skipped")
            blur_score = 500.0  # assume not blurry

        # Invert so higher = blurrier (threshold comparison is simpler)
        blur_metric = max(0, 1000.0 - blur_score)  # 0 = sharp, 1000 = very blurry

        if quality_score < QUALITY_MIN_SCORE:
            flags.append("Low quality")
        if blur_metric > BLUR_MAX_SCORE:
            flags.append("Blurry")

        is_good = len(flags) == 0
        if is_good:
            flags.append("Good quality")

        verdicts.append(
            PhotoVerdict(
                filename=fname,
                quality_score=round(quality_score, 1),
                blur_score=round(blur_metric, 1),
                is_good=is_good,
                flags=flags,
            )
        )

    return verdicts


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _image_to_base64(image_path: str) -> str:
    """Read an image file and return a base64-encoded data URI."""
    ext = Path(image_path).suffix.lower()
    mime = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "webp": "image/webp"}.get(
        ext.lstrip("."), "image/jpeg"
    )
    with open(image_path, "rb") as f:
        data = base64.b64encode(f.read()).decode()
    return f"data:{mime};base64,{data}"


def _call_llm(messages: List[Dict[str, Any]], model: str, temperature: float = 0.4) -> str:
    """
    Call an OpenAI-compatible chat completions endpoint.
    Works with OpenRouter, Together AI, OpenAI, local vLLM, etc.
    """
    import requests

    url = f"{API_BASE_URL.rstrip('/')}/chat/completions"
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": 2048,
    }

    resp = requests.post(url, headers=headers, json=payload, timeout=120)
    resp.raise_for_status()
    data = resp.json()
    return data["choices"][0]["message"]["content"]


# ---------------------------------------------------------------------------
# Stage 2 – Vision Feature Extraction
# ---------------------------------------------------------------------------
VISION_PROMPT = """You are an expert real-estate photographer and listing analyst.
Analyse this property photo and extract structured features.

Return ONLY a JSON object with these fields:
{
  "room_type": "e.g. living room, bedroom, kitchen, bathroom, exterior, pool, garden",
  "lighting": "e.g. bright natural light, warm evening ambiance, well-lit artificial",
  "furniture_style": "e.g. modern minimalist, bohemian, classic Victorian, coastal",
  "colour_palette": "e.g. neutral earth tones, bold jewel tones, monochrome",
  "unique_selling_points": ["list", "of", "notable", "features visible in the photo"],
  "description": "2-3 sentence description of what makes this space appealing to guests"
}

Be specific and observant. Focus on what a potential guest would care about."""


def extract_vision_features(image_paths: List[str], filenames: Optional[List[str]] = None) -> List[VisionFeatures]:
    """
    Send good-quality photos to the vision model and extract
    structured features from each.
    """
    if not API_KEY:
        logger.warning("No API key set — returning placeholder vision features")
        return [
            VisionFeatures(
                filename=filenames[i] if filenames else Path(p).name,
                room_type="unknown",
                lighting="unknown",
                furniture_style="unknown",
                colour_palette="unknown",
                unique_selling_points=["API key not configured"],
                description="Vision analysis unavailable without an API key.",
            )
            for i, p in enumerate(image_paths)
        ]

    results: List[VisionFeatures] = []

    for i, path in enumerate(image_paths):
        fname = filenames[i] if filenames else Path(path).name
        try:
            image_b64 = _image_to_base64(path)

            messages = [
                {
                    "role": "user",
                    "content": [
                        {"type": "image_url", "image_url": {"url": image_b64}},
                        {"type": "text", "text": VISION_PROMPT},
                    ],
                }
            ]

            raw = _call_llm(messages, model=VISION_MODEL, temperature=0.3)

            # Extract JSON from possible markdown code fences
            text = raw.strip()
            if text.startswith("```"):
                text = text.split("\n", 1)[1] if "\n" in text else text[3:]
                if text.endswith("```"):
                    text = text[:-3]
                text = text.strip()

            feat = json.loads(text)
            results.append(
                VisionFeatures(
                    filename=fname,
                    room_type=feat.get("room_type", "unspecified"),
                    lighting=feat.get("lighting", "unspecified"),
                    furniture_style=feat.get("furniture_style", "unspecified"),
                    colour_palette=feat.get("colour_palette", "unspecified"),
                    unique_selling_points=feat.get("unique_selling_points", []),
                    description=feat.get("description", ""),
                )
            )
        except Exception as e:
            logger.warning(f"Vision extraction failed for {fname}: {e}")
            results.append(
                VisionFeatures(
                    filename=fname,
                    room_type="analysis failed",
                    lighting="unknown",
                    furniture_style="unknown",
                    colour_palette="unknown",
                    unique_selling_points=[],
                    description=f"Vision analysis failed: {e}",
                )
            )

    return results


# ---------------------------------------------------------------------------
# Stage 3 – Listing Writer
# ---------------------------------------------------------------------------
WRITER_PROMPT = """You are an expert Airbnb / vacation-rental copywriter.
Write a compelling listing for this property based on the information below.

## Host-provided facts
{manual_facts}

## Visual features extracted from property photos
{vision_summary}

## Your task
Return ONLY a JSON object with:
{{
  "title": "A catchy, search-friendly listing title (max 80 chars)",
  "highlights": ["4-6 short bullet points highlighting the best features"],
  "full_description": "A warm, inviting 3-5 paragraph listing description. "
                      "Weave in the visual details naturally. "
                      "Write for a guest, not a landlord. "
                      "Include practical details (capacity, amenities) "
                      "and emotional appeal (atmosphere, experience)."
}}

Guidelines:
- Be specific, not generic. "Floor-to-ceiling windows overlooking a private garden" beats "nice view".
- Highlight amenities the host mentioned.
- Match the tone to the property style (modern space = sleek copy, cosy cottage = warm copy).
- The title should be searchable but not keyword-stuffed.
- Do NOT fabricate amenities or features not mentioned in the facts or visible in the photos."""


def generate_listing(
    manual_data: Dict[str, Any],
    vision_features: List[VisionFeatures],
) -> ListingResult:
    """
    Combine manual inputs and vision features into a complete listing
    using the writer LLM.
    """
    # Build manual facts string
    manual_lines = []
    for key, value in manual_data.items():
        if value is not None and value != "":
            label = key.replace("_", " ").replace("-", " ").title()
            manual_lines.append(f"- {label}: {value}")
    manual_facts = "\n".join(manual_lines) if manual_lines else "(none provided)"

    # Build vision summary
    vision_lines = []
    for vf in vision_features:
        usps = ", ".join(vf.unique_selling_points) if vf.unique_selling_points else "none noted"
        vision_lines.append(
            f"- [{vf.filename}] Room: {vf.room_type} | Lighting: {vf.lighting} | "
            f"Style: {vf.furniture_style} | Colours: {vf.colour_palette} | "
            f"Highlights: {usps} | {vf.description}"
        )
    vision_summary = "\n".join(vision_lines) if vision_lines else "(no photos analysed)"

    if not API_KEY:
        # Offline fallback — generate a basic listing from the facts
        return _fallback_listing(manual_data, vision_features)

    prompt = WRITER_PROMPT.format(
        manual_facts=manual_facts,
        vision_summary=vision_summary,
    )

    try:
        raw = _call_llm(
            messages=[{"role": "user", "content": prompt}],
            model=WRITER_MODEL,
            temperature=0.6,
        )

        text = raw.strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1] if "\n" in text else text[3:]
            if text.endswith("```"):
                text = text[:-3]
            text = text.strip()

        listing = json.loads(text)
    except Exception as e:
        logger.error(f"Writer LLM failed: {e}")
        return _fallback_listing(manual_data, vision_features, error=str(e))

    return ListingResult(
        title=listing.get("title", "Untitled Listing"),
        highlights=listing.get("highlights", []),
        full_description=listing.get("full_description", ""),
        photo_verdicts=[],  # filled by caller
        vision_features=[vars(vf) for vf in vision_features],
    )


def _fallback_listing(
    manual_data: Dict[str, Any],
    vision_features: List[VisionFeatures],
    error: str = "",
) -> ListingResult:
    """Generate a basic listing without the LLM (offline/error fallback)."""
    location = manual_data.get("location", manual_data.get("address", "this location"))
    prop_type = manual_data.get("property_type", "property")
    bedrooms = manual_data.get("bedrooms", "?")
    guests = manual_data.get("capacity_guests", manual_data.get("accommodates", "?"))

    amenities = manual_data.get("amenities", [])
    if isinstance(amenities, str):
        amenities = [a.strip() for a in amenities.split(",") if a.strip()]

    amenity_str = ", ".join(amenities[:5]) if amenities else "essential amenities"

    highlights = [
        f"Located in {location}",
        f"Comfortable {prop_type} for up to {guests} guests",
        f"{bedrooms} bedroom(s)" if bedrooms != "?" else "Cosy sleeping arrangements",
    ]
    for a in amenities[:4]:
        highlights.append(f"Features {a}")

    title = f"Charming {prop_type.title()} in {location}" if location != "this location" else f"Charming {prop_type.title()} Getaway"

    description_parts = [
        f"Welcome to this wonderful {prop_type} in {location}.",
        f"Accommodating up to {guests} guests, it's perfect for a memorable stay.",
    ]
    if amenities:
        description_parts.append(f"Enjoy {amenity_str} and more during your visit.")
    description_parts.append("Book now for an unforgettable experience!")

    if error:
        description_parts.append(f"\n[Generated offline — {error}]")

    return ListingResult(
        title=title,
        highlights=highlights,
        full_description="\n\n".join(description_parts),
        photo_verdicts=[],
        vision_features=[vars(vf) for vf in vision_features],
    )


# ---------------------------------------------------------------------------
# Full pipeline
# ---------------------------------------------------------------------------
def run_pipeline(
    image_paths: List[str],
    manual_data: Dict[str, Any],
) -> ListingResult:
    """
    Execute the full three-stage pipeline.

    1. Run photo QC on all uploaded images.
    2. Extract vision features from good-quality images only.
    3. Generate the listing text using manual facts + vision features.
    """
    # Stage 1: Photo QC
    logger.info(f"Stage 1: Running photo QC on {len(image_paths)} images")
    verdicts = run_photo_qc(image_paths)
    for v in verdicts:
        logger.info(f"  {v.filename}: quality={v.quality_score}, blur={v.blur_score}, good={v.is_good}")

    # Filter to good images for vision extraction
    good_paths = [path for path, v in zip(image_paths, verdicts) if v.is_good]
    good_names = [v.filename for v in verdicts if v.is_good]
    logger.info(f"Stage 2: Extracting vision features from {len(good_paths)} good images")

    # Stage 2: Vision extraction
    vision_features = extract_vision_features(good_paths, good_names)

    # Stage 3: Generate listing
    logger.info("Stage 3: Generating listing text")
    result = generate_listing(manual_data, vision_features)

    # Attach photo verdicts
    result.photo_verdicts = [
        {
            "filename": v.filename,
            "quality_score": v.quality_score,
            "blur_score": v.blur_score,
            "is_good": v.is_good,
            "flags": v.flags,
        }
        for v in verdicts
    ]
    result.vision_features = [
        {
            "filename": vf.filename,
            "room_type": vf.room_type,
            "lighting": vf.lighting,
            "furniture_style": vf.furniture_style,
            "colour_palette": vf.colour_palette,
            "unique_selling_points": vf.unique_selling_points,
            "description": vf.description,
        }
        for vf in vision_features
    ]

    logger.info("Pipeline complete")
    return result
