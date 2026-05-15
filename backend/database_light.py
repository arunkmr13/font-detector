from sqlalchemy import create_engine, Column, String, Integer, DateTime, JSON, Text, Enum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import uuid
import enum
from datetime import datetime

# SQLite — no Docker, no config, just a local file
engine = create_engine(
    "sqlite:///./fontdetector.db",
    connect_args={"check_same_thread": False},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class JobStatus(str, enum.Enum):
    pending = "pending"
    processing = "processing"
    completed = "completed"
    failed = "failed"


class DetectionJob(Base):
    __tablename__ = "detection_jobs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    status = Column(String, default="completed")
    job_type = Column(String, nullable=False)
    target_url = Column(String, nullable=True)
    results = Column(JSON, nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(String, default=lambda: datetime.utcnow().isoformat())
    processing_time_ms = Column(Integer, nullable=True)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    Base.metadata.create_all(bind=engine)
