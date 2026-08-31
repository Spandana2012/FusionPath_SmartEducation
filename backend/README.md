# FusionPath Backend

Backend services for the FusionPath personalized learning platform.

## Prerequisites

- Python 3.11+
- pip

## Virtual Environment Setup

```bash
cd backend
python -m venv .venv
.\.venv\Scripts\activate
```

## Install Dependencies

```bash
pip install -r requirements.txt
```

## Environment Configuration

Create a local `.env` file from the example:

```bash
copy .env.example .env
```

Local development setting:

```env
FRONTEND_URL=http://localhost:3000
```

For production, set `FRONTEND_URL` to the deployed Vercel frontend origin:

```env
FRONTEND_URL=https://your-frontend-domain.vercel.app
```

If you need to allow more than one deployed frontend origin, provide a comma-separated list. Local origins for `http://localhost:3000` and `http://127.0.0.1:3000` are always supported for development.

## Local Run Command

```bash
uvicorn app.main:app --reload --port 8000
```

## Production Deployment

Deploy this directory as the backend service.

Root directory:

```text
backend
```

Build/install command:

```bash
pip install -r requirements.txt
```

Start command:

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

Required production environment variable:

```env
FRONTEND_URL=https://YOUR-VERCEL-DOMAIN
```

For Render, Railway, Fly.io, or similar Python web service hosts, use the platform-provided `PORT` environment variable in the start command. Do not hardcode port `8000` for production.

## Deployment Checks

Health:

```text
GET /health
```

Swagger:

```text
GET /docs
```

Root status:

```text
GET /
```

## API Endpoint

Available production endpoints:

- `POST /api/profile/analyze`
- `POST /api/skills/gap`
- `POST /api/recommendations`
- `POST /api/learning-path`

`POST /api/profile/analyze`

Receives learner onboarding information, validates it, normalizes the profile, creates a temporary learner ID, and returns the normalized learner profile.

## Example Request

```json
{
  "goal": "Generative AI Engineer",
  "experience_level": "intermediate",
  "skills": ["Python", "SQL", "Machine Learning"],
  "completed_courses": [
    {
      "name": "Machine Learning Fundamentals",
      "skills": ["Machine Learning"]
    }
  ],
  "weekly_hours": 10,
  "learning_preference": "project_based",
  "timeline_months": 6
}
```

## Example Response

```json
{
  "learner_id": "uuid-string",
  "profile": {
    "goal": "Generative AI Engineer",
    "experience_level": "intermediate",
    "skills": ["Python", "SQL", "Machine Learning"],
    "completed_courses": [
      {
        "name": "Machine Learning Fundamentals",
        "skills": ["Machine Learning"]
      }
    ],
    "weekly_hours": 10,
    "learning_preference": "project_based",
    "timeline_months": 6
  },
  "message": "Learner profile created successfully"
}
```

## Health Check

`GET /health`

```json
{
  "status": "ok"
}
```

## Testing

```bash
python -m pytest
```
