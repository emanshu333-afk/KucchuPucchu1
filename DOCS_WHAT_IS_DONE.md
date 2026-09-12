# What Is Done So Far (and Why)

## Project Overview
This Django backend ("code_flux") powers the PrepPilot liquid-glass educational frontend. It provides a full-featured exam preparation API with intelligent study planning, progress tracking, and an on-screen AI assistant.

---

## Core Architecture Decisions

### 1. Django Project Structure (`code_flux/`)
- **Why**: Clean separation of configuration (`code_flux/`) from business logic (`PrepPilot/` app).
- **Settings split**: `base.py` (shared), `development.py` (SQLite, debug toolbar, eager Celery), `production.py` (PostgreSQL, WhiteNoise, secure cookies, file logging).
- **Environment-driven**: All secrets via `django-environ` reading `.env` — never committed.

### 2. Custom User Model (`PrepPilot.models.User`)
- **Why**: Email-based auth, UUID PK, study preferences (hours/day, schedule JSON), AI assistance level, onboarding flag.
- **Extends** `AbstractUser` — future-proof for any auth changes.

### 3. Domain Models (15 models)
| Model | Purpose |
|-------|---------|
| `Exam` | Target exam with date, type, scoring rules |
| `Subject` | Per-exam subjects with weightage & importance |
| `Topic` | Granular topics with difficulty, priority (MUST/SHOULD/IF_TIME), current level |
| `Resource` | Books, videos, practice sets linked to topics |
| `StudyPlan` / `StudyBlock` | Day-by-day schedule with typed blocks (learn/practice/test/analyze/revise/mock) |
| `MockTest` | Scheduled/completed mock exams with analytics |
| `TopicPerformance` | Per-topic practice accuracy & mastery |
| `ReadinessScore` | Multi-factor readiness % (syllabus, mastery, accuracy, mocks, revision, weak-area penalty, time pressure) |
| `WhatIfScenario` | Simulate hours-change, topic-skip, subject-focus, deadline-change |
| `RecoveryPlan` | Auto-replanning when behind schedule |
| `Notification` | Study reminders, plan updates, mock alerts |
| `StudyResourceVault` | **Private PDF/link vault** + one-click publish to shared pool |
| `AssistantConversation` | Persisted AI chat history with citations |

### 4. Intelligence Engines (7 engines)
| Engine | Key Capability |
|--------|----------------|
| `TopicPriorityEngine` | Classifies every topic by weighted score (importance, weakness, weightage, difficulty, time) |
| `TimeBudgetEngine` | Allocates total study hours across subjects by priority & difficulty |
| `ResourceMatcherEngine` | Recommends resource sequences (theory → examples → practice → revision) matched to student level |
| `DailyPlanEngine` | Generates day-by-day plans with typed blocks; interleaves subjects; schedules mocks |
| `ReadinessEngine` | Computes 7-component readiness score with explanation & recommendations |
| `WhatIfEngine` | Simulates 5 scenario types; persists scenarios for comparison |
| `RecoveryEngine` | Detects delay; proposes keep/postpone/remove actions; generates new schedule |
| `StudyAssistantEngine` | **Grounded AI** — answers only from user's topics, vault items, and published resources; cites sources; optional LLM polish |

### 5. API Layer (DRF + JWT)
- **Auth**: JWT (access 60 min, refresh 7 days, rotation + blacklist), registration, `/me` profile, onboarding endpoint
- **Exams CRUD** + nested subjects/topics + `generate_plan`, `calculate_priorities`, `calculate_readiness`, `check_recovery`, `time_budget`
- **Study Plans** + `start_block`, `complete_block`, `today`
- **Mock Tests** + `start`, `submit`
- **Analytics**: readiness trend, what-if simulations, recovery plans, notifications
- **Vault**: CRUD + `publish`/`unpublish` actions
- **Assistant**: `POST /assistant/ask/` — grounded answer with citations
- **Docs**: drf-spectacular Swagger/Redoc at `/api/docs/`, `/api/redoc/`

### 6. Background Processing
- **Celery** + Redis broker/result backend
- **Beat scheduler** (django-celery-beat) for periodic tasks (daily readiness, notifications)
- **Eager mode** in development for instant testing

### 7. Frontend Integration
- Static files collected from `static/`, `css/`, `js/`, `assets/`
- Templates served from `templates/` (base, dashboard_3d)
- Media uploads to `media/` (vault PDFs, avatars)
- CORS configured for `localhost:3000`

### 8. Dockerization
- **Multi-stage Dockerfile** (builder → runtime, non-root user)
- **docker-compose.yml** with 6 services: `db` (PostgreSQL 15), `redis`, `web` (gunicorn), `celery-worker`, `celery-beat`, `nginx`
- Health checks on db/redis; dependent service startup ordering
- Production settings via env vars; `collectstatic` at build time

---

## Test Coverage
- **46 tests passing** (models + engines)
- Fixtures for user, exam, subjects, topics, resources
- Signal recursion fixed (update() instead of save() in post_save)
- Priority thresholds aligned across model & engine

---

## Why These Choices Matter
1. **Grounded AI** — no hallucinations; every answer cites user's own data
2. **Vault + Publish** — students own their resources; one click shares to community
3. **Priority Engine** — objective, auditable study ordering (not "feel")
4. **Recovery Engine** — automatic replanning prevents schedule collapse
5. **What-If** — risk-free scenario planning before committing changes
6. **Docker-first** — identical dev/staging/prod environments
7. **Environment config** — zero secrets in code; 12-factor compliant