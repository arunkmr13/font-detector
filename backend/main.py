from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from config import get_settings
from database import init_db
from routes.detection import router as detection_router

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        init_db()
        print("✅ Database tables ready")
    except Exception as e:
        print(f"⚠️  DB init skipped (is PostgreSQL running?): {e}")
    yield


app = FastAPI(
    title="Font Detector API",
    description="Identify fonts from images or URLs, with AI-powered pairing suggestions.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(detection_router)


@app.get("/health")
def health():
    return {"status": "ok", "version": "0.1.0"}
