# FusionPath

FusionPath is a personalized learning path platform built for the HCL Amplified 2026 hackathon. It turns a learner's career goal, current skills, learning history, weekly availability, and learning preferences into a guided career roadmap.

The product flow is:

1. Build a learner profile from onboarding.
2. Analyze skill gaps against the target role.
3. Recommend learning resources for those gaps.
4. Generate a personalized milestone-based learning path.

## Tech Stack

- Frontend: Next.js 15, React 19, TypeScript, Tailwind CSS
- Backend: FastAPI, Python 3.11+
- API style: REST JSON
- State persistence: browser localStorage for the hackathon prototype flow

## Project Structure

```text
.
├── app/                    # Next.js app routes
├── components/             # UI, layout, landing, onboarding components
├── hooks/                  # Shared React hooks
├── lib/
│   ├── api/                # Frontend API client wrappers
│   ├── types/              # Shared TypeScript types
│   └── utils.ts
├── backend/
│   ├── app/
│   │   ├── api/            # FastAPI route modules
│   │   ├── schemas/        # Pydantic request/response schemas
│   │   ├── services/       # Business logic
│   │   ├── knowledge/      # Local role/resource knowledge
│   │   └── main.py         # FastAPI app entrypoint
│   ├── tests/              # Backend tests
│   └── requirements.txt
└── package.json
```

## Features

- Neon landing page and guided onboarding flow
- Learner profile normalization
- Skill gap analysis with readiness score
- Personalized learning resource recommendations
- Learning path generation with milestones, reasoning, assessments, and completion criteria
- Full-page premium loading states for analysis, recommendations, and path generation

## API Endpoints

Backend base URL for local development:

```text
http://localhost:8000
```

Available endpoints:

- `GET /health`
- `POST /api/profile/analyze`
- `POST /api/skills/gap`
- `POST /api/recommendations`
- `POST /api/learning-path`

## Prerequisites

- Node.js 20+
- npm
- Python 3.11+
- pip

## Environment Variables

Create the frontend environment file:

```powershell
copy .env.example .env.local
```

Expected frontend value:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Create the backend environment file:

```powershell
cd backend
copy .env.example .env
```

Expected backend value:

```env
FRONTEND_URL=http://localhost:3000
```

## Run the Backend

From the project root:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Backend health check:

```text
http://localhost:8000/health
```

## Run the Frontend

Open a second terminal from the project root:

```powershell
npm install
npm run dev
```

Frontend URL:

```text
http://localhost:3000
```

## Test and Build

Frontend typecheck:

```powershell
npm run typecheck
```

Frontend production build:

```powershell
npm run build
```

Backend tests:

```powershell
cd backend
.\.venv\Scripts\activate
pytest
```

## Deployment

Recommended split deployment:

- Frontend: Vercel
- Backend: Render, Railway, Fly.io, or another Python web service host

### Backend Deployment

Deploy the `backend` folder as a Python web service.

Build command:

```bash
pip install -r requirements.txt
```

Start command:

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

Set this backend environment variable after the frontend is deployed:

```env
FRONTEND_URL=https://your-frontend-domain.vercel.app
```

### Frontend Deployment

Deploy the repository root as a Next.js app.

Build command:

```bash
npm run build
```

Set this frontend environment variable:

```env
NEXT_PUBLIC_API_URL=https://your-backend-domain.onrender.com
```

After both services are live, update the backend `FRONTEND_URL` to the final frontend domain so CORS allows browser requests.

## Notes

- `.env.local`, backend `.env`, `node_modules`, `.next`, and Python cache files are ignored by Git.
- The frontend uses `lib/api/client.ts` for API calls. React pages should not hardcode backend URLs.
- The prototype stores successful profile, skill gap, recommendation, and learning path responses in localStorage so users can navigate between screens without repeating onboarding.

