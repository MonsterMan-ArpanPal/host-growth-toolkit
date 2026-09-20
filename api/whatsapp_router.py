import os
import json
import uuid
from datetime import datetime
from fastapi import APIRouter, Request, Form, HTTPException
from fastapi.responses import Response, JSONResponse
from twilio.twiml.messaging_response import MessagingResponse
from groq import Groq

router = APIRouter()

# In-memory storage for unified bookings queue
LIVE_BOOKINGS = []

# Initialize Groq client (requires GROQ_API_KEY env var)
# If not present, we will fallback to a mock response
groq_client = None
try:
    if os.environ.get("GROQ_API_KEY"):
        groq_client = Groq()
except Exception as e:
    print(f"Warning: Could not initialize Groq client: {e}")

LLM_SYSTEM_PROMPT = """
You are an AI assistant for a short-term rental host. 
Extract the booking details from the user's message and return ONLY a valid JSON object.
The JSON object must have these exact keys:
- "intent": string (e.g., "book", "inquiry", "other")
- "guestName": string (extract from message if available, else "Unknown Guest")
- "checkIn": string (YYYY-MM-DD format if dates provided, else null)
- "checkOut": string (YYYY-MM-DD format if dates provided, else null)
- "guestCount": integer (if provided, else 1)
- "offeredPrice": number (if provided in message, else 0)
- "replyMessage": string (A polite, short reply from the host acknowledging the request or asking for more details)
"""

@router.post("/api/whatsapp/webhook")
async def whatsapp_webhook(
    Body: str = Form(...),
    From: str = Form(...),
):
    """
    Twilio Webhook endpoint for incoming WhatsApp messages.
    """
    global LIVE_BOOKINGS
    
    print(f"Received WhatsApp message from {From}: {Body}")
    
    # 1. Analyze message with LLM
    extracted_data = {
        "intent": "inquiry",
        "guestName": From,
        "checkIn": None,
        "checkOut": None,
        "guestCount": 1,
        "offeredPrice": 0,
        "replyMessage": "Thank you for your message! Our host will get back to you shortly."
    }
    
    if groq_client:
        try:
            chat_completion = groq_client.chat.completions.create(
                messages=[
                    {"role": "system", "content": LLM_SYSTEM_PROMPT},
                    {"role": "user", "content": Body},
                ],
                model="qwen/qwen3.8-27b",
                response_format={"type": "json_object"},
            )
            response_content = chat_completion.choices[0].message.content
            parsed = json.loads(response_content)
            extracted_data.update(parsed)
            # Ensure safe fallbacks
            if not extracted_data.get("guestName") or extracted_data["guestName"] == "Unknown Guest":
                extracted_data["guestName"] = From
        except Exception as e:
            print(f"Error calling Groq: {e}")
            extracted_data["replyMessage"] = "We received your request but are currently experiencing high volume. We'll reply soon!"
    else:
        # Fallback if no Groq API Key
        print("No GROQ_API_KEY found, using mock extraction.")
        if "book" in Body.lower() or "stay" in Body.lower():
            extracted_data["intent"] = "book"
        extracted_data["replyMessage"] = "Thank you! I have received your booking request and will check availability."

    # 2. Add to Dashboard State (LIVE_BOOKINGS)
    new_booking = {
        "id": f"wa_{uuid.uuid4().hex[:8]}",
        "guestName": extracted_data.get("guestName"),
        "propertyName": "Demo Property", # Default
        "checkIn": extracted_data.get("checkIn") or datetime.now().strftime("%Y-%m-%d"),
        "checkOut": extracted_data.get("checkOut") or datetime.now().strftime("%Y-%m-%d"),
        "nights": 1, # Default mock
        "guestCount": extracted_data.get("guestCount") or 1,
        "source": "whatsapp",
        "totalPrice": extracted_data.get("offeredPrice") or 0,
        "status": "pending",
        "phone": From,
        "intent": extracted_data.get("intent")
    }
    LIVE_BOOKINGS.append(new_booking)
    
    # 3. Return TwiML Response
    resp = MessagingResponse()
    resp.message(extracted_data["replyMessage"])
    
    return Response(content=str(resp), media_type="application/xml")

@router.get("/api/bookings")
def get_bookings():
    """
    Endpoint for frontend to fetch all unified bookings
    """
    return JSONResponse(content={"bookings": LIVE_BOOKINGS})
