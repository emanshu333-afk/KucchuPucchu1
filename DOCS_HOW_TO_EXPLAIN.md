# How to Explain This to Someone

## The 30-Second Elevator Pitch
> "PrepPilot is a **personalized exam-prep OS**. Students pick their target exam (JEE, NEET, boards, etc.), and the system builds a **day-by-day study plan** that adapts when they fall behind. It has a **private vault** for PDFs/links they collect, and an **on-screen AI assistant** that answers *only* from their own syllabus, vault, and shared community resources — no hallucinations. Everything runs in Docker with Postgres + Redis, deployed via a single `docker-compose up`."

---

## For a Fellow Developer (5 min)

### "It's Django + DRF + Celery, but the interesting parts are:"

1. **Custom User + Domain Models**
   - Email-auth, UUID PK, study prefs (hours/day JSON, schedule), AI assistance level
   - 15 models: Exam → Subject → Topic → Resource → StudyPlan/Block → MockTest → Performance → Readiness → WhatIf → Recovery → Notification → Vault → AssistantConversation

2. **7 Intelligence Engines** (pure Python classes, no ML deps)
   - **Priority**: Weighted score (importance 35%, weakness 30%, weightage 15%, difficulty 10%, time 10%) → MUST/SHOULD/IF_TIME
   - **TimeBudget**: Remaining days × hours/day → allocates by subject priority & difficulty
   - **ResourceMatcher**: Recommends sequences (theory→examples→practice→revision) filtered by student level
   - **DailyPlan**: Generates typed blocks per day, interleaves subjects, inserts mocks
   - **Readiness**: 7-factor score (syllabus, mastery, accuracy, mocks, revision, weak-penalty, time-pressure) + explanation + recs
   - **WhatIf**: 5 scenario types (hours, skip, focus, deadline, custom) → re-runs engines → persists
   - **Recovery**: Detects delay → proposes keep/postpone/drop → regenerates plan for remaining days
   - **Assistant**: **Grounded** — tokenizes question, scores against user's topics + vault (private + published), returns deterministic answer with citations; optional LLM polish

3. **API Surface**
   - JWT auth (rotation + blacklist)
   - Nested REST: `/exams/{pk}/subjects/`, `/subjects/{pk}/topics/`
   - Actions: `generate_plan`, `calculate_priorities`, `check_recovery`, `time_budget`, `simulate_hours`, `publish` (vault), `ask` (assistant)
   - Swagger/Redoc at `/api/docs/`, `/api/redoc/`

4. **Docker-First**
   - Multi-stage Dockerfile (builder → runtime, non-root)
   - Compose: db, redis, web (gunicorn), celery-worker, celery-beat, nginx
   - Health checks, dependency ordering, env-driven settings

5. **Tests & Quality**
   - 46 passing tests (pytest-django, fixtures for user/exam/subjects/topics/resources)
   - Signal recursion fixed with `update()` in post_save
   - `python manage.py check` clean

---

## For a Product Manager (3 min)

### What the Student Experiences
1. **Onboarding**: Pick exam → system knows syllabus (CBSE/ICSE/JEE/NEET topics pre-seeded or imported)
2. **Dashboard**: See "30 days left", "Readiness 62%", today's 5 blocks (Learn Electrostatics 60m → Practice 45m → Mock 180m)
3. **Vault**: Drag PDF of handwritten notes → auto-tags to "Electrostatics" → click **Publish** → now classmates see it
4. **Assistant Chat**: "How do I improve Electrostatics?" → cites your topic (level 20/100, MUST DO), your vault PDF, 2 published community links → "Do 25-min theory block on your PDF, then 10 practice Qs"
5. **What-If**: "What if I study 3 hrs/day instead of 5?" → simulates → "Readiness drops to 48%, you'd need to drop 3 IF_TIME topics"
6. **Recovery**: Missed 3 days → banner "You're 8 hrs behind" → click **Fix** → new plan keeps MUST DO, postpones SHOULD DO, drops IF TIME

### Key Differentiators
| Feature | Typical Apps | PrepPilot |
|---------|--------------|-----------|
| Study plan | Static calendar | **Regenerates automatically** when behind |
| AI chat | Generic LLM | **Grounded in YOUR syllabus + vault** |
| Resources | Fixed library | **Your PDFs + community publish** |
| Priority | Manual drag-drop | **Calculated from weakness + exam weight** |
| What-if | Not available | **5 scenario types, persisted** |

---

## For a DevOps Engineer (2 min)

### Deploy in 3 Commands
```bash
git clone https://github.com/emanshu333-afk/KucchuPucchu1.git
cd KucchuPucchu1
cp .env.example .env   # edit SECRET_KEY, DB_PASSWORD, AI_API_KEY
docker-compose up -d --build
```
- **Services**: web (8000), db (5432), redis (6379), nginx (80/443)
- **Health**: `docker-compose ps` → all `healthy`
- **Logs**: `docker-compose logs -f web`
- **Migrations**: auto-run on web startup (`manage.py migrate --noinput`)
- **Static**: collected at build time (`collectstatic --noinput`)
- **Scaling**: `docker-compose up -d --scale web=3 --scale celery-worker=2`

### Environment Variables (`.env`)
| Var | Dev Default | Prod Required |
|-----|-------------|---------------|
| `SECRET_KEY` | auto-generated | **Yes** (50+ chars) |
| `DEBUG` | `True` | `False` |
| `USE_SQLITE` | `True` | `False` |
| `DB_NAME/USER/PASSWORD/HOST/PORT` | sqlite / postgres | **Yes** |
| `REDIS_URL` | `redis://localhost:6379/0` | **Yes** |
| `AI_API_KEY` | empty | Optional (enables LLM polish) |
| `FRONTEND_URL` | `http://localhost:3000` | **Yes** |
| `ALLOWED_HOSTS` | `localhost,127.0.0.1` | **Yes** |

---

## For a QA Engineer (2 min)

### Test Commands
```bash
# Unit + integration
pytest PrepPilot/tests/ -v

# With coverage
pytest --cov=PrepPilot --cov-report=html

# Lint
black --check .
flake8 .
isort --check-only .

# Django system check
python manage.py check --deploy
```

### Key Test Scenarios
| Area | Coverage |
|------|----------|
| Models | CRUD, constraints, `__str__`, priority calc, accuracy updates |
| Engines | Priority thresholds, time allocation, resource sequences, plan generation, readiness components, what-if sims, recovery actions |
| Signals | User defaults, topic priority auto-calc, plan progress, performance mastery, mock percentage |
| API | Auth flow, nested CRUD, custom actions, vault publish/unpublish, assistant ask |

### Manual Smoke Test
1. `docker-compose up -d`
2. `curl http://localhost:8000/api/docs/` → Swagger UI loads
3. `POST /api/v1/auth/register/` → 201 + user
4. `POST /api/v1/auth/token/` → 200 + access/refresh
5. `POST /api/v1/exams/` (with JWT) → 201 + exam
6. `POST /api/v1/exams/{pk}/generate_plan/` → 200 + 30 plans
7. `POST /api/v1/vault/` (PDF upload) → 201
8. `POST /api/v1/vault/assistant/ask/` → 200 + grounded answer with sources

---

## For a New Contributor (Onboarding Checklist)
1. Read `DOCS_WHAT_IS_DONE.md` and `DOCS_ARCHITECTURE.md`
2. `cp .env.example .env` → edit `SECRET_KEY`
3. `python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt`
4. `python manage.py migrate && python manage.py runserver`
5. Visit `http://localhost:8000/api/docs/`
6. Run `pytest PrepPilot/tests/ -v` → all green
7. Pick a `good first issue` label on GitHub

---

## One-Sentence Descriptions for Stakeholders
- **CEO**: "An adaptive study planner with a hallucination-free AI that only knows what the student uploaded."
- **CTO**: "Django microservice-ready monolith; engines are pure functions, trivial to extract later."
- **Investor**: "Duolingo for competitive exams — but the schedule rewrites itself when life happens."
- **Student**: "It tells me exactly what to study today, and the chat bot actually knows my notes."