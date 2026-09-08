# FusionPath

FusionPath is a personalized learning platform for moving from a learner's current skills and career goal to a practical learning path. It is the Fusion Solids project for the HCL Amplify 2026 hackathon.

## Implemented Now

The existing personalization pipeline remains the source of truth:

```text
Profile -> Skill Gap -> Recommendations -> Learning Path
                                           |
              Practice / Roadmap / Projects / Career / AI Tutor
```

The current additive phase also includes:

- Passwordless email OTP sign-up and sign-in with JWT access tokens and rotated, revoked refresh tokens in an httpOnly cookie.
- In-database OTP rate limiting, hashed OTP storage, expiry, single-use verification, and optional linking to an existing anonymous learner.
- Readiness-aware job recommendations from curated SQLite listings for the existing five-role taxonomy.
- Authenticated domain-based community posts, replies, and basic report flags.
- A Community route, an authenticated Jobs route, and a Recommended Jobs preview added to the existing Career view.

No external LLM, job-board API, moderation service, SMS provider, or hosted database is required.

## Existing Product Flow

Landing and onboarding remain available without authentication. Existing anonymous learner persistence continues through localStorage and the existing learner APIs. After onboarding, the learner can use profile analysis, skill-gap analysis, recommendations, learning path, dashboard, roadmap, practice, mistake tracking, skills, career, and AI Tutor.

Authenticated users can link the local learner ID during OTP verification. Existing learner columns and endpoint contracts are preserved.

## Supported Domains

The existing backend taxonomy is reused everywhere:

- Generative AI Engineer
- Data Analyst
- Frontend Developer
- Backend Developer
- Cloud/DevOps Engineer

## API Endpoints

Existing endpoints remain available:

- `POST /api/profile/analyze`
- `POST /api/skills/gap`
- `POST /api/recommendations`
- `POST /api/learning-path`
- `GET /api/adaptive/context/{learner_id}`
- Existing adaptive state, tutor, practice, progress, graph, and mistake endpoints

New endpoints:

- `POST /api/auth/otp/request`
- `POST /api/auth/otp/verify`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/jobs/recommendations/{learner_id}`
- `GET /api/community/domains`
- `GET /api/community/posts?domain=`
- `POST /api/community/posts`
- `GET /api/community/posts/{id}/replies`
- `POST /api/community/posts/{id}/replies`
- `POST /api/community/posts/{id}/report`
- `POST /api/community/replies/{id}/report`

Community reads and writes require a verified access token. Refresh tokens are never returned in JSON or stored in localStorage.
Job recommendations also require a verified access token and the requested learner to be linked to that account.

## Database

SQLite is used locally and in the existing backend deployment approach. Alembic manages every schema change.

Existing tables remain intact:

- `learners`
- `roadmap_states`
- `mistake_events`
- `practice_attempts`
- `skill_graph_nodes`
- `skill_graph_edges`

New additive tables:

- `users`
- `otp_codes`
- `refresh_tokens`
- `job_listings`
- `community_posts`
- `community_replies`

The only existing-table change is a nullable `learners.user_id` foreign key. It does not remove or rename any learner column or change anonymous learner behavior.

## Environment Variables

Frontend `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Backend `.env`:

```env
FRONTEND_URL=http://localhost:3000
DATABASE_URL=sqlite:///./fusionpath.db
JWT_SECRET=replace-with-a-long-random-secret
JWT_ALGORITHM=HS256
ACCESS_TOKEN_MINUTES=15
REFRESH_TOKEN_DAYS=30
COOKIE_SECURE=false
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USERNAME=your-smtp-user
SMTP_PASSWORD=your-smtp-password
SMTP_FROM_EMAIL=no-reply@example.com
SMTP_USE_TLS=true
```

Copy `backend/.env.example` to `backend/.env` and set real values. `SMTP_HOST` and `SMTP_FROM_EMAIL` are required. Set both `SMTP_USERNAME` and `SMTP_PASSWORD` for authenticated SMTP, or leave both blank when the SMTP server permits unauthenticated sending. `SMTP_USE_TLS=true` enables STARTTLS. Gmail users should use an App Password where supported, never their normal account password. OTP requests fail safely when SMTP is missing; the frontend shows a generic availability message while detailed configuration errors stay in server logs. The application never returns or stores a plaintext OTP. Set `COOKIE_SECURE=true` when serving over HTTPS.

## Local Setup

Prerequisites: Node.js 20+, npm, Python 3.11+, and pip.

From the project root:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

In a second terminal:

```powershell
npm install
npm run dev
```

Open `http://localhost:3000`. Use `/onboarding` for the existing anonymous flow, `/sign-up` or `/sign-in` for OTP authentication, `/jobs` for authenticated personalized jobs, and `/community` for the authenticated community.

## Testing and Migration

Frontend:

```powershell
npm run typecheck
npm run lint
npm run build
```

Backend, from `backend`:

```powershell
python -m compileall app
python -m pytest
alembic upgrade head
```

The new migration is `20260908_03_auth_jobs_community`. It is additive and supports upgrading both a clean database and the existing development database without deleting learner data. Curated job rows are seeded lazily into SQLite when job recommendations are first requested.

## Architecture

The Next.js frontend uses the existing app routes, Tailwind design system, API client, local learner store, and learner context provider. Authenticated access tokens live in session storage only; refresh tokens are httpOnly cookies. The FastAPI backend adds auth, jobs, and community routers beside the existing profile, skill, recommendation, learning-path, and adaptive routers. SQLAlchemy models are registered through the existing Alembic metadata.

The job service exposes a provider-shaped `get_job_recommendations` boundary while using SQLite today. A future live provider could replace the seeded provider without changing the frontend response contract.

## Future Extensions

- Replace curated SQLite jobs with an approved live provider while keeping the same job response contract.
- Add richer moderation workflows beyond the current boolean report flags.
- Add account settings and explicit profile-link management.

No existing FusionPath feature was intentionally removed or replaced.
