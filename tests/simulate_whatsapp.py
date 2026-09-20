"""
Wayzyy WhatsApp Listing Simulator
=================================
Simulate WhatsApp conversations locally without needing a Twilio webhook
or live phone number.

Usage:
  # Automated simulated conversation:
  uv run python tests/simulate_whatsapp.py --auto

  # Interactive terminal chat:
  uv run python tests/simulate_whatsapp.py
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

# Ensure api and src are in path
TEST_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = TEST_DIR.parent
API_DIR = PROJECT_ROOT / "api"
SRC_DIR = PROJECT_ROOT / "src"
for p in (SRC_DIR, API_DIR):
    if str(p) not in sys.path:
        sys.path.insert(0, str(p))

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

import main as backend_main
from whatsapp_actions import action_handler
from whatsapp_service import authenticate_user_by_phone, normalize_phone_number
from whatsapp_state import session_manager


def run_simulation(auto: bool = False):
    phone = "+447123456789"
    email = "sakshamu0610@gmail.com"

    # Ensure demo user exists with this phone
    if email in backend_main.USERS:
        backend_main.USERS[email]["phone"] = phone
    else:
        backend_main.USERS[email] = {
            "first_name": "Saksham",
            "last_name": "Upadhyay",
            "email": email,
            "password": "password123",
            "phone": phone,
            "property_id": None,
        }

    user = authenticate_user_by_phone(phone)
    if not user:
        print(f"Error: User with phone {phone} not found.")
        return

    session_manager.reset_session(phone, user)

    print("=" * 65)
    print("   WAYZYY WHATSAPP PROPERTY LISTING SIMULATOR")
    print(f"   Authenticated Host: {user['first_name']} ({user['email']})")
    print(f"   Phone: {phone}")
    print("=" * 65)
    print("Type your message below. Type 'exit' to quit.\n")

    auto_script = [
        "Hi, I want to list my apartment",
        "1",                    # Apartment
        "Camden",               # Location
        "4",                    # 4 guests
        "2",                    # 2 bedrooms
        "1.5",                  # 1.5 bathrooms
        "1, 2, 4, 5",           # Wifi, Kitchen, AC, Parking
        "skip",                 # Skip photos for fast simulation
        "YES",                  # Confirm draft
    ]

    script_idx = 0

    while True:
        if auto:
            if script_idx >= len(auto_script):
                print("\n[Simulator] Automated script completed successfully!")
                break
            user_msg = auto_script[script_idx]
            script_idx += 1
            print(f"\n[Host]: {user_msg}")
        else:
            try:
                user_msg = input("\n[Host]: ")
            except (KeyboardInterrupt, EOFError):
                break
            if user_msg.strip().lower() in ["exit", "quit"]:
                break

        reply = action_handler.process_message(
            user=user,
            phone=phone,
            message_body=user_msg,
        )

        print("\n[Wayzyy Bot]:")
        for line in reply.split("\n"):
            print(f"  {line}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Wayzyy WhatsApp Simulator")
    parser.add_argument("--auto", action="store_true", help="Run automated script")
    args = parser.parse_args()
    run_simulation(auto=args.auto)
