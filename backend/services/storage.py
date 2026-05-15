import time
import uuid
from celery import Celery
from config import get_settings
from database import SessionLocal
from font import DetectionJob, JobStatus

settings = get_settings()

celery_app = Celery(
    "font_detector",
    broker=settings.redis_url,
    backend=settings.redis_url,
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    task_track_started=True,
)


@celery_app.task(bind=True, max_retries=2)
def process_image_detection(self, job_id: str, image_bytes_hex: str):
    """
    Background task: run font detection on an uploaded image.
    job_id is the UUID of the DetectionJob row to update.
    image_bytes_hex is the raw image encoded as hex string (JSON-safe).
    """
    db = SessionLocal()
    start = time.time()

    try:
        job = db.query(DetectionJob).filter_by(id=uuid.UUID(job_id)).first()
        if not job:
            return

        job.status = JobStatus.processing
        db.commit()

        # Import here to avoid circular imports at module level
        from detector import detect_fonts

        image_bytes = bytes.fromhex(image_bytes_hex)
        matches = detect_fonts(image_bytes)

        job.results = [m.model_dump() for m in matches]
        job.status = JobStatus.completed
        job.processing_time_ms = int((time.time() - start) * 1000)
        db.commit()

    except Exception as exc:
        job = db.query(DetectionJob).filter_by(id=uuid.UUID(job_id)).first()
        if job:
            job.status = JobStatus.failed
            job.error_message = str(exc)
            db.commit()
        raise self.retry(exc=exc, countdown=5)

    finally:
        db.close()


@celery_app.task(bind=True, max_retries=2)
def process_url_scan(self, job_id: str, target_url: str):
    """
    Background task: scan a URL and extract all fonts from it.
    """
    import asyncio

    db = SessionLocal()
    start = time.time()

    try:
        job = db.query(DetectionJob).filter_by(id=uuid.UUID(job_id)).first()
        if not job:
            return

        job.status = JobStatus.processing
        db.commit()

        from url_scanner import scan_url_for_fonts

        # Celery tasks are sync — run the async scanner in a new event loop
        fonts = asyncio.run(scan_url_for_fonts(target_url))

        job.results = [f.model_dump() for f in fonts]
        job.status = JobStatus.completed
        job.processing_time_ms = int((time.time() - start) * 1000)
        db.commit()

    except Exception as exc:
        job = db.query(DetectionJob).filter_by(id=uuid.UUID(job_id)).first()
        if job:
            job.status = JobStatus.failed
            job.error_message = str(exc)
            db.commit()
        raise self.retry(exc=exc, countdown=5)

    finally:
        db.close()