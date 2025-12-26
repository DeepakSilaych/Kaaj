# Kaaj - Lender Matching Platform

Equipment finance lender matching system that evaluates loan applications against multiple lender credit policies.

**Live Demo:** https://kaaj.deepaksilaych.me

| Page | URL | Description |
|------|-----|-------------|
| Client Portal | https://kaaj.deepaksilaych.me | Submit loan applications and view matches |
| Admin Portal | https://kaaj.deepaksilaych.me/admin/programs | Manage lender programs and upload PDFs |

Use "Dummy Credentials" button on login page for demo access.

## Quick Start

### Backend

```bash
cd backend
cp .env.example .env  # Add your API keys
uv sync
uv run uvicorn main:app --reload --port 8000
uv run python worker.py  # In separate terminal
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Docker (Production)

```bash
cd backend
docker compose up --build
```

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌──────────────┐
│   React UI  │────▶│  FastAPI    │────▶│  PostgreSQL  │
└─────────────┘     └─────────────┘     └──────────────┘
                          │
                          ▼
                    ┌─────────────┐
                    │   Hatchet   │ (async workflows)
                    │   Worker    │
                    └─────────────┘
                          │
                          ▼
                    ┌─────────────┐
                    │  Gemini AI  │ (PDF parsing)
                    └─────────────┘
```

## API Endpoints

| Method | Endpoint                         | Description          |
| ------ | -------------------------------- | -------------------- |
| POST   | `/api/auth/register`             | Register user        |
| POST   | `/api/auth/login`                | Login                |
| GET    | `/api/programs`                  | List lender programs |
| POST   | `/api/programs`                  | Create program       |
| POST   | `/api/programs/upload-pdf`       | Upload & parse PDF   |
| POST   | `/api/programs/{id}/reparse`     | Re-parse PDF         |
| GET    | `/api/applications`              | List applications    |
| POST   | `/api/applications`              | Create application   |
| POST   | `/api/applications/{id}/match`   | Run matching         |
| GET    | `/api/applications/{id}/results` | Get match results    |

## Environment Variables

```env
DATABASE_URL=postgresql://user:pass@host:port/db
GEMINI_API_KEY=your_gemini_key
HATCHET_CLIENT_TOKEN=your_hatchet_token
USE_HATCHET=1  # Set to 0 for sync processing
```

## Key Features

- **PDF Parsing**: Upload lender PDFs → LLM extracts structured criteria
- **Matching Engine**: Evaluates applications against all programs with fit scores (0-100)
- **Async Workflows**: Hatchet handles PDF parsing and matching in background
- **Detailed Results**: Shows passed/failed criteria with specific reasoning

## Tech Stack

- **Backend**: Python, FastAPI, SQLAlchemy
- **Frontend**: React, TypeScript, TailwindCSS
- **Database**: PostgreSQL
- **Workflows**: Hatchet
- **AI**: Google Gemini (PDF parsing)
