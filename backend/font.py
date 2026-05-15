from sqlalchemy import Column, String, Float, Integer, DateTime, JSON, Text, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
import enum
from database import Base


class JobStatus(str, enum.Enum):
    pending = "pending"
    processing = "processing"
    completed = "completed"
    failed = "failed"


class DetectionJob(Base):
    """Tracks every font detection request (image upload or URL scan)."""
    __tablename__ = "detection_jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    status = Column(Enum(JobStatus), default=JobStatus.pending, nullable=False)
    job_type = Column(String(20), nullable=False)  # "image" or "url"

    # Input
    image_url = Column(String(500), nullable=True)   # Cloudinary URL
    target_url = Column(String(500), nullable=True)  # URL to scan

    # Output
    results = Column(JSON, nullable=True)            # list of detected fonts + scores
    error_message = Column(Text, nullable=True)

    # Meta
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    processing_time_ms = Column(Integer, nullable=True)


class Font(Base):
    """Font metadata catalogue — populated from Google Fonts + manual entries."""
    __tablename__ = "fonts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(200), nullable=False, index=True)
    family = Column(String(200), nullable=True)
    category = Column(String(100), nullable=True)  # serif, sans-serif, monospace, etc.
    designer = Column(String(200), nullable=True)
    foundry = Column(String(200), nullable=True)

    # Availability & licensing
    google_fonts_id = Column(String(200), nullable=True)
    license_type = Column(String(100), nullable=True)  # OFL, commercial, etc.
    download_url = Column(String(500), nullable=True)
    price_usd = Column(Float, nullable=True)           # None = free

    # Descriptive metadata (used for AI context)
    tags = Column(JSON, nullable=True)                 # ["geometric", "humanist", ...]
    description = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())