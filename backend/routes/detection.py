import uuid
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.orm import Session
from datetime import datetime
import time

from database import get_db
from font import DetectionJob, JobStatus
from schemas import (
    DetectionResult, URLScanRequest, URLScanResult,
    JobStatusResponse, PairingRequest, PairingResponse, DetectedFont, ScannedFont
)

router = APIRouter(prefix="/api", tags=["detection"])

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_IMAGE_SIZE_MB = 10


@router.post("/detect", response_model=DetectionResult)
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

    # Run detection directly — no Celery needed
    from services.detector import detect_fonts
    matches = detect_fonts(image_bytes)

    processing_ms = int((time.time() - start) * 1000)

    # Save to DB
    job = DetectionJob(
        job_type="image",
        status=JobStatus.completed,
        results=[m.model_dump() for m in matches],
        processing_time_ms=processing_ms,
    )
    db.add(job)
    db.commit()

    return DetectionResult(
        job_id=job.id,
        status="completed",
        matches=matches,
        processing_time_ms=processing_ms,
    )


@router.post("/scan-url", response_model=URLScanResult)
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
        status=JobStatus.completed,
        results=[f.model_dump() for f in fonts],
        processing_time_ms=processing_ms,
    )
    db.add(job)
    db.commit()

    return URLScanResult(
        job_id=job.id,
        status="completed",
        target_url=str(body.url),
        fonts=fonts,
    )


@router.get("/jobs/{job_id}", response_model=JobStatusResponse)
def get_job_status(job_id: uuid.UUID, db: Session = Depends(get_db)):
    job = db.query(DetectionJob).filter_by(id=job_id).first()
    if not job:
        raise HTTPException(404, "Job not found")
    return JobStatusResponse(
        job_id=job.id,
        status=job.status.value,
        result=job.results,
        error=job.error_message,
        created_at=job.created_at,
        processing_time_ms=job.processing_time_ms,
    )


@router.post("/pairings", response_model=PairingResponse)
async def get_pairings(body: PairingRequest):
    from services.ai_enrichment import get_font_pairings
    try:
        return await get_font_pairings(body.font_name, body.use_case)
    except ValueError as e:
        raise HTTPException(422, str(e))
    except RuntimeError as e:
        raise HTTPException(503, str(e))
