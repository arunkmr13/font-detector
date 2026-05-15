# Font Detector — Typography Intelligence Platform

Identify fonts from images or URLs, with AI-powered pairing suggestions.

## Stack
- **Backend**: FastAPI, Python 3.13, PostgreSQL, OpenCV
- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **AI**: Google Gemini API (free tier)
- **Infrastructure**: Docker (PostgreSQL + Redis)

## Running locally

### Backend
```bash
cd backend
source ../venv/bin/activate
python -m uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend-app
npm install
npm run dev
```

### Infrastructure
```bash
docker compose up -d
```

## API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/detect` | Detect font from image |
| POST | `/api/scan-url` | Extract fonts from URL |
| GET | `/api/jobs/{id}` | Get job status |
| POST | `/api/pairings` | AI font pairing suggestions |
