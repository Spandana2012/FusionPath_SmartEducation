# FusionPath
# Demo: https://fusionpathsmarteducation-r135xucym-rohith-lashettis-projects.vercel.app/
FusionPath is a personalized learning platform for moving from a learner's current skills and career goal to a practical learning path. It is the Fusion Solids project for the HCL Amplify 2026 hackathon.
# Note: FusionPath is actively under development. The deployed version represents the current stable build, while additional features, improvements, and refinements are being continuously added.

## Implemented Now

The existing personalization pipeline remains the source of truth:

```text
Profile -> Skill Gap -> Recommendations -> Learning Path
                                           |
              Practice / Roadmap / Projects / Career / AI Tutor
```

The current additive phase also includes:

- Password authentication with full name, email, phone number, and scrypt-hashed passwords.
- Server-side SQLite sessions with hashed session tokens in an httpOnly cookie, with optional linking to an existing anonymous learner.
- Readiness-aware job recommendations from curated SQLite listings for the existing five-role taxonomy.
- Authenticated domain-based community posts, replies, and basic report flags.
- A Community route, an authenticated Jobs route, and a Recommended Jobs preview added to the existing Career view.

No external LLM, job-board API, moderation service, SMS provider, or hosted database is required.

## Existing Product Flow

Landing and onboarding remain available without authentication. Existing anonymous learner persistence continues through localStorage and the existing learner APIs. After onboarding, the learner can use profile analysis, skill-gap analysis, recommendations, learning path, dashboard, roadmap, practice, mistake tracking, skills, career, and AI Tutor.

Authenticated users can link the local learner ID during signup or login. Existing learner columns and endpoint contracts are preserved.

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

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `GET /api/jobs/recommendations/{learner_id}`
- `GET /api/community/domains`
- `GET /api/community/posts?domain=`
- `POST /api/community/posts`
- `GET /api/community/posts/{id}/replies`
- `POST /api/community/posts/{id}/replies`
- `POST /api/community/posts/{id}/report`
- `POST /api/community/replies/{id}/report`

Community reads and writes require the authenticated SQLite session. Session tokens are never returned in JSON or stored in frontend storage. Job recommendations also require the authenticated session and the requested learner to be linked to that account.

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
- `sessions`
- `job_listings`
- `community_posts`
- `community_replies`

The existing `users` table receives nullable `name`, `phone`, and `password_hash` fields through an additive migration. The legacy `otp_codes` table is retained for migration safety but is no longer used. The existing `learners.user_id` foreign key remains nullable and does not change anonymous learner behavior.

## Environment Variables

Frontend `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Backend `.env`:

```env
FRONTEND_URL=http://localhost:3000
DATABASE_URL=sqlite:///./fusionpath.db
SESSION_COOKIE_NAME=fusionpath_session
SESSION_EXPIRE_DAYS=7
SESSION_COOKIE_SECURE=false
```

Copy `backend/.env.example` to `backend/.env`. No JWT secret, SMTP configuration, or email service is required. Set `SESSION_COOKIE_SECURE=true` when serving over HTTPS.

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

Open `http://localhost:3000`. Use `/onboarding` for the existing anonymous flow, `/sign-up` or `/sign-in` for password authentication, `/jobs` for authenticated personalized jobs, and `/community` for the authenticated community.

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

The migrations `20260908_03_auth_jobs_community`, `20260909_04_password_auth`, and `20260909_05_sqlite_sessions` are additive and preserve existing users and learner data. Curated job rows are seeded lazily into SQLite when job recommendations are first requested.

## Architecture

The Next.js frontend uses the existing app routes, Tailwind design system, API client, local learner store, and learner context provider. Authentication uses a server-side SQLite session: only the raw session cookie exists in the browser, while the database stores its SHA-256 hash. The FastAPI backend adds auth, jobs, and community routers beside the existing profile, skill, recommendation, learning-path, and adaptive routers. SQLAlchemy models are registered through the existing Alembic metadata.

The authentication relationship is `User -> Session -> Learner -> Domain -> Learning + Jobs + Community`. Passwords use salted `hashlib.scrypt` hashes. There is no OTP, SMTP, SMS, JWT, or external authentication provider.

The job service exposes a provider-shaped `get_job_recommendations` boundary while using SQLite today. It receives the authenticated learner's existing domain and readiness context. Community uses the same learner domain taxonomy for its default feed. A future live job provider could replace the seeded provider without changing the frontend response contract.

## Future Extensions

- Replace curated SQLite jobs with an approved live provider while keeping the same job response contract.
- Add richer moderation workflows beyond the current boolean report flags.
- Add account settings and explicit profile-link management.

No existing FusionPath feature was intentionally removed or replaced.
