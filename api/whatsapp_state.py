"""
Wayzyy WhatsApp Conversation State Manager
==========================================
Manages multi-message state per phone number.
Remembers:
- Active conversation state and current field step
- Accumulated property parameters
- Uploaded photo paths
- Generated pricing recommendation & draft
- Conversation history

Thread-safe in-memory caching with atomic disk persistence to
RUNTIME_DATA_DIR / "whatsapp_sessions.json".
"""

from __future__ import annotations

import json
import logging
import os
import sys
import tempfile
import time
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from threading import RLock
from typing import Any, Dict, List, Optional

logger = logging.getLogger("whatsapp_state")

_THIS_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = _THIS_DIR.parent
SRC_DIR = PROJECT_ROOT / "src"
for _p in (SRC_DIR, _THIS_DIR):
    if str(_p) not in sys.path:
        sys.path.insert(0, str(_p))

from whatsapp_service import WhatsAppStateError

DEFAULT_RUNTIME_DATA_DIR = Path(
    os.getenv("LOCALAPPDATA")
    or os.getenv("XDG_STATE_HOME")
    or (Path.home() / ".local" / "state")
) / "Wayzyy"
RUNTIME_DATA_DIR = Path(os.getenv("WAYZYY_DATA_DIR", str(DEFAULT_RUNTIME_DATA_DIR)))
SESSIONS_FILE_PATH = RUNTIME_DATA_DIR / "whatsapp_sessions.json"

STATE_LOCK = RLock()


@dataclass
class WhatsAppSession:
    phone: str
    user_email: str
    user_name: str = "Host"
    status: str = "IDLE"  # "IDLE", "IN_PROGRESS", "AWAITING_PHOTOS", "AWAITING_CONFIRMATION"
    current_step: Optional[str] = None
    data: Dict[str, Any] = field(default_factory=dict)
    photos: List[str] = field(default_factory=list)
    pricing_recommendation: Optional[Dict[str, Any]] = None
    listing_draft: Optional[Dict[str, Any]] = None
    history: List[Dict[str, str]] = field(default_factory=list)
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> WhatsAppSession:
        return cls(**data)


class WhatsAppSessionManager:
    """Thread-safe session storage with persistent disk backing."""

    def __init__(self, sessions_path: Optional[Path] = None):
        self.path = sessions_path or SESSIONS_FILE_PATH
        self._cache: Dict[str, WhatsAppSession] = {}
        self._load_from_disk()

    def _load_from_disk(self):
        with STATE_LOCK:
            if not self.path.exists():
                return
            try:
                content = self.path.read_text(encoding="utf-8")
                if content.strip():
                    raw_data = json.loads(content)
                    for phone, sess_dict in raw_data.items():
                        self._cache[phone] = WhatsAppSession.from_dict(sess_dict)
                logger.info(f"[STAGE: STATE] Loaded {len(self._cache)} sessions from {self.path}")
            except Exception as e:
                logger.warning(f"[STAGE: STATE] Could not load sessions file: {e}")

    def _save_to_disk(self):
        with STATE_LOCK:
            try:
                self.path.parent.mkdir(parents=True, exist_ok=True)
                raw = {phone: sess.to_dict() for phone, sess in self._cache.items()}
                serialized = json.dumps(raw, indent=2)

                # Atomic write
                temp_file = tempfile.NamedTemporaryFile(
                    mode="w",
                    encoding="utf-8",
                    dir=self.path.parent,
                    prefix=".sessions_",
                    suffix=".tmp",
                    delete=False,
                )
                try:
                    temp_file.write(serialized)
                    temp_file.flush()
                    os.fsync(temp_file.fileno())
                    temp_file.close()
                    os.replace(temp_file.name, self.path)
                finally:
                    if os.path.exists(temp_file.name):
                        try:
                            os.unlink(temp_file.name)
                        except OSError:
                            pass
            except Exception as e:
                logger.error(f"[STAGE: STATE] Error saving sessions to disk: {e}")
                raise WhatsAppStateError(f"Session save failed: {e}") from e

    def get_session(self, phone: str) -> Optional[WhatsAppSession]:
        with STATE_LOCK:
            return self._cache.get(phone)

    def get_or_create_session(self, phone: str, user: Dict[str, Any]) -> WhatsAppSession:
        with STATE_LOCK:
            session = self._cache.get(phone)
            if session is None:
                first_name = user.get("first_name", "Host")
                email = user.get("email", "")
                session = WhatsAppSession(
                    phone=phone,
                    user_email=email,
                    user_name=first_name,
                    status="IDLE",
                    current_step=None,
                    data={},
                    photos=[],
                )
                self._cache[phone] = session
                self._save_to_disk()
                logger.info(f"[STAGE: STATE] Created new session for {phone} ({email})")
            return session

    def save_session(self, session: WhatsAppSession):
        with STATE_LOCK:
            session.updated_at = datetime.now(timezone.utc).isoformat()
            self._cache[session.phone] = session
            self._save_to_disk()
            logger.info(f"[STAGE: STATE] Session updated for {session.phone}: step={session.current_step}, status={session.status}")

    def reset_session(self, phone: str, user: Optional[Dict[str, Any]] = None) -> WhatsAppSession:
        with STATE_LOCK:
            existing = self._cache.get(phone)
            email = (user and user.get("email")) or (existing and existing.user_email) or ""
            name = (user and user.get("first_name")) or (existing and existing.user_name) or "Host"
            session = WhatsAppSession(
                phone=phone,
                user_email=email,
                user_name=name,
                status="IDLE",
                current_step=None,
                data={},
                photos=[],
            )
            self._cache[phone] = session
            self._save_to_disk()
            logger.info(f"[STAGE: STATE] Reset session for {phone}")
            return session

    def add_photo_to_session(self, phone: str, photo_path: str):
        with STATE_LOCK:
            session = self._cache.get(phone)
            if session:
                if photo_path not in session.photos:
                    session.photos.append(photo_path)
                    self.save_session(session)
                    logger.info(f"[STAGE: PHOTO] Associated photo {photo_path} with session for {phone} (total: {len(session.photos)})")


# Global singleton instance
session_manager = WhatsAppSessionManager()
