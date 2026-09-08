# FusionPath

FusionPath is a personalized learning platform that helps learners move from their current skills and career goals to a structured learning path. It is the Fusion Solids project for the HCL Amplify 2026 hackathon.

## Core Personalization Flow

The existing profile-driven pipeline is the source of truth for every learner-facing experience:

```text
Profile -> Skill Gap -> Recommendations -> Learning Path
                                          |
              Practice / Roadmap / Projects / Career / AI Tutor
```

The dashboard, Skills, Career, Profile, and My Learning views all read the same persisted learner context. My Learning contains Learning Path, Roadmap, Practice, Projects, and Progress views.

## Core APIs

The FastAPI backend exposes the core personalization contracts:

- `POST /api/profile/analyze` normalizes a learner profile and creates or updates the learner record.
- `POST /api/skills/gap` compares the profile with the target role and returns gaps, strengths, priorities, and readiness.
- `POST /api/recommendations` selects resources for the returned skill gaps.
- `POST /api/learning-path` turns the profile, gaps, and recommendations into ordered milestones.

The adaptive endpoints persist the same learner model and provide the connected tutor, practice evaluation, progress, and context views.

## Dynamic AI Tutor

The AI Tutor is a deterministic, context-aware assistant implemented in the application logic. It does not use an external LLM or require an API key.

For each question, it reads the learner's target role, experience, current skills, strengths, skill gaps, critical missing skills, readiness, recommendations, current milestone, full learning path, and persisted progress. Local intent detection supports explanations, relevance questions, next steps, hints, resources, practice guidance, progress, career questions, and general learning questions. Consequently, the same question can produce different guidance for different learners, while different questions from one learner take different response paths.

## Dynamic Practice

Practice is connected to the current learning-path milestone and highest-priority skill gap. It generates a five-question session for the active skill, selecting topic-specific question templates when the skill is known and a contextual fallback set otherwise. Sessions include conceptual, scenario, application, reasoning, and practical question types where appropriate.

Each question can be submitted independently through the existing adaptive practice API. The learner sees correctness and an explanation, then continues through the set. The final result reports attempted questions, correct answers, score, skill practiced, topics to review from incorrect answers, and a dynamic next action. Practice attempts and mistakes remain part of the persisted learner progress.

## Connected Product Experience

- Dashboard: readiness, current focus, path progress, and recommended action.
- My Learning: Learning Path, Roadmap, Practice, Projects, and Progress.
- Skills: shared skill-gap analysis and readiness.
- Career: target role, strengths, critical gaps, and next steps.
- AI Tutor: contextual guidance grounded in the same learner model.
- Profile: the persisted learner profile used by the personalization pipeline.

These are connected views of one learner model rather than unrelated static pages.

## Technology Stack

- Next.js 15, React 19, TypeScript, and Tailwind CSS
- FastAPI, Python 3.11+, Pydantic, SQLAlchemy, and SQLite for the backend prototype
- REST JSON APIs
- Vercel-compatible Next.js frontend deployment

## Running the Project

Prerequisites: Node.js 20+, npm, Python 3.11+, and pip.

Start the backend from the project root:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

In a second terminal, start the frontend from the project root:

```powershell
npm install
npm run dev
```

The frontend runs at `http://localhost:3000`; the backend runs at `http://localhost:8000`. Configure `NEXT_PUBLIC_API_URL` when the frontend needs to use a backend other than the local default. Backend CORS is configured with `FRONTEND_URL`.

## Testing and Validation

Frontend commands:

```powershell
npm run typecheck
npm run lint
npm run build
```

Backend commands, run from `backend`:

```powershell
python -m pytest
python -m compileall app
```

The adaptive-context tests also verify that two different learner profiles receive different skill analysis and tutor responses for the same next-step question.

## Deployment

The frontend can be deployed to Vercel and the FastAPI backend to a Python web-service host such as Render, Railway, or Fly.io. Set `NEXT_PUBLIC_API_URL` to the deployed backend origin and `FRONTEND_URL` to the deployed frontend origin. Do not commit secrets or API keys.
