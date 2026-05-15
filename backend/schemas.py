from pydantic import BaseModel, HttpUrl
from typing import Optional
from uuid import UUID
from datetime import datetime


# ── Detection ──────────────────────────────────────────────────────────────

class DetectedFont(BaseModel):
    """A single font match returned by the detection model."""
    name: str
    confidence: float          # 0.0 – 1.0
    category: str | None
    google_fonts_id: str | None
    download_url: str | None
    license_type: str | None
    price_usd: float | None    # None = free


class DetectionResult(BaseModel):
    job_id: UUID
    status: str
    matches: list[DetectedFont] = []
    processing_time_ms: int | None = None
    error: str | None = None


# ── URL Scan ───────────────────────────────────────────────────────────────

class URLScanRequest(BaseModel):
    url: str


class ScannedFont(BaseModel):
    """A font extracted from a webpage's computed styles."""
    name: str
    css_value: str             # raw CSS font-family value
    element_count: int         # how many elements use this font
    is_web_font: bool
    source_url: str | None     # CDN/Google Fonts URL if found


class URLScanResult(BaseModel):
    job_id: UUID
    status: str
    target_url: str
    fonts: list[ScannedFont] = []
    error: str | None = None


# ── Job polling ────────────────────────────────────────────────────────────

class JobStatusResponse(BaseModel):
    job_id: UUID
    status: str
    result: dict | None = None
    error: str | None = None
    created_at: datetime
    processing_time_ms: int | None = None


# ── AI Pairings ────────────────────────────────────────────────────────────

class PairingRequest(BaseModel):
    font_name: str
    use_case: str | None = None   # "editorial", "tech product", "luxury brand", etc.


class FontPairing(BaseModel):
    role: str                  # "body", "heading", "accent", "code"
    font_name: str
    rationale: str


class PairingResponse(BaseModel):
    base_font: str
    pairings: list[FontPairing]
    overall_rationale: str