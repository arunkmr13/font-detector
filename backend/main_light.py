from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
from contextlib import asynccontextmanager
from pydantic import BaseModel
import time
import os
import sys

# Add backend directory to path so services can be imported
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database_light import init_db, get_db, DetectionJob

# ── Schemas (inline, no separate file needed) ─────────────────────────────

class URLScanRequest(BaseModel):
    url: str

class PairingRequest(BaseModel):
    font_name: str
    use_case: str | None = None

# ── App setup ─────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    print("✅ SQLite database ready (fontdetector.db)")
    yield

app = FastAPI(
    title="Font Detector API",
    description="Identify fonts from images or URLs, with AI-powered pairing suggestions.",
    version="0.2.0-light",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_IMAGE_SIZE_MB = 10
HTML_PATH = os.path.join(os.path.dirname(__file__), "templates", "index.html")


# ── Frontend ──────────────────────────────────────────────────────────────

@app.get("/", response_class=HTMLResponse)
async def serve_frontend():
    with open(HTML_PATH, "r") as f:
        return HTMLResponse(content=f.read())


# ── Health ────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "version": "0.2.0-light", "db": "sqlite"}


# ── Detect font from image ────────────────────────────────────────────────

@app.post("/api/detect")
async def detect_font(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(400, f"Unsupported file type: {file.content_type}")

    image_bytes = await file.read()

    if len(image_bytes) > MAX_IMAGE_SIZE_MB * 1024 * 1024:
        raise HTTPException(400, f"File too large. Max {MAX_IMAGE_SIZE_MB}MB.")

    start = time.time()

    from services.detector import detect_fonts
    matches = detect_fonts(image_bytes)

    processing_ms = int((time.time() - start) * 1000)

    job = DetectionJob(
        job_type="image",
        status="completed",
        results=[m.model_dump() for m in matches],
        processing_time_ms=processing_ms,
    )
    db.add(job)
    db.commit()

    return {
        "job_id": job.id,
        "status": "completed",
        "matches": [m.model_dump() for m in matches],
        "processing_time_ms": processing_ms,
    }


# ── Scan URL for fonts ────────────────────────────────────────────────────

@app.post("/api/scan-url")
async def scan_url(
    body: URLScanRequest,
    db: Session = Depends(get_db),
):
    start = time.time()

    from services.url_scanner import scan_url_for_fonts
    try:
        fonts = await scan_url_for_fonts(str(body.url))
    except ValueError as e:
        raise HTTPException(400, str(e))

    processing_ms = int((time.time() - start) * 1000)

    job = DetectionJob(
        job_type="url",
        target_url=str(body.url),
        status="completed",
        results=[f.model_dump() for f in fonts],
        processing_time_ms=processing_ms,
    )
    db.add(job)
    db.commit()

    return {
        "job_id": job.id,
        "status": "completed",
        "target_url": str(body.url),
        "fonts": [f.model_dump() for f in fonts],
    }


# ── Get job status ────────────────────────────────────────────────────────

@app.get("/api/jobs/{job_id}")
def get_job_status(job_id: str, db: Session = Depends(get_db)):
    job = db.query(DetectionJob).filter_by(id=job_id).first()
    if not job:
        raise HTTPException(404, "Job not found")
    return {
        "job_id": job.id,
        "status": job.status,
        "result": job.results,
        "error": job.error_message,
        "created_at": job.created_at,
        "processing_time_ms": job.processing_time_ms,
    }


# ── AI font pairings ──────────────────────────────────────────────────────

@app.post("/api/pairings")
async def get_pairings(body: PairingRequest):
    from services.ai_enrichment import get_font_pairings
    try:
        result = await get_font_pairings(body.font_name, body.use_case)
        return result
    except ValueError as e:
        raise HTTPException(422, str(e))
    except RuntimeError as e:
        raise HTTPException(503, str(e))