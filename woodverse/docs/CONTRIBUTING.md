# Contributing to WoodVerse

## Prerequisites

- Node.js 18+
- npm 9+
- Python 3.11+
- PostgreSQL 14+ (optional — app runs in demo mode without a DB)

## Setup

```bash
cd woodverse
npm install
```

For the AI service Python environment:

```bash
cd woodverse
python3 -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r backend/ai-service/requirements.txt
```

## Development

Start all services (frontend + API + AI service):

```bash
npm run dev
```

Or individually:

```bash
npm run dev:web     # Frontend on http://localhost:5173
npm run dev:api    # API on http://localhost:4000
npm run dev:ai     # AI service on http://localhost:8000
```

## Environment Variables

Copy `backend/api/.env.example` to `backend/api/.env` and set at minimum:
- `JWT_SECRET` — any random 32+ character string
- `DATABASE_URL` — PostgreSQL connection string (optional for demo mode)

## Testing

```bash
# All tests (frontend + API)
npm test

# Frontend tests only
npm run test:frontend

# API tests only (requires TEST_DATABASE_URL for integration assertions)
npm run test:api

# AI service tests (requires TEST_DATABASE_URL for integration assertions)
npm run test:ai

# Integration tests (requires running DB and services)
npm run test:checkout:e2e
npm run test:ai:e2e
```

Integration tests require a PostgreSQL database:

```bash
export TEST_DATABASE_URL=postgresql://user:pass@localhost:5432/woodverse_test
npm run test:api
```

## Database

Run migrations (requires DATABASE_URL in environment):

```bash
npm run migrate --workspace=backend/api
```

Seed development data:

```bash
psql $DATABASE_URL < database/seed.sql
```

All seeded accounts use password: `password123`

## Build

```bash
npm run build  # builds the frontend
```
