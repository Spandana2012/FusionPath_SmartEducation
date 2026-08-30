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

Current setting:

```env
FRONTEND_URL=http://localhost:3000
```

## Run Command

```bash
uvicorn app.main:app --reload --port 8000
```

## API Endpoint

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
pytest
```
