# Project Structure — Code Flux (PrepPilot Backend)

```
KucchuPucchu1/                          # Repository root
├── .env                                # Local secrets (gitignored)
├── .env.example                        # Template for .env
├── .gitignore
├── manage.py                           # Django CLI entry point
├── requirements.txt                    # Pinned Python dependencies
├── pytest.ini                          # Pytest configuration
├── Dockerfile                          # Multi-stage build (builder -> runtime)
├── docker-compose.yml                  # 6-service stack (db, redis, web, worker, beat, nginx)
├── nginx.conf                          # Reverse proxy config
├── server.py                           # Dev server helper
├── README.md
│
├── code_flux/                          # Django project package (settings + wsgi/asgi + celery)
│   ├── __init__.py                     # Exposes celery_app
│   ├── asgi.py                         # ASGI application
│   ├── celery.py                       # Celery configuration
│   ├── wsgi.py                         # WSGI application
│   ├── urls.py                         # Root URLconf (includes API + admin + docs)
│   └── settings/
│       ├── __init__.py
│       ├── base.py                     # Shared config (env, apps, middleware, DB, static, REST, JWT, CORS, Celery, logging)
│       ├── development.py              # DEBUG=True, SQLite, debug toolbar, eager Celery, permissive CORS
│       └── production.py               # DEBUG=False, Postgres, WhiteNoise, secure cookies, file logging, HSTS
│
├── PrepPilot/                          # Main Django app (business logic)
│   ├── __init__.py
│   ├── apps.py                         # AppConfig with signals auto-import
│   ├── admin.py                        # Custom admin for all 15 models
│   ├── models.py                       # 15 domain models (User, Exam, Subject, Topic, Resource, StudyPlan, StudyBlock, MockTest, TopicPerformance, ReadinessScore, WhatIfScenario, RecoveryPlan, Notification, StudyResourceVault, AssistantConversation)
│   ├── signals.py                      # post_save handlers (user defaults, topic priority, plan progress, performance mastery, mock percentage)
│   ├── views.py                        # Template views (dashboard_3d)
│   ├── engines/                        # 7 pure-Python intelligence engines
│   │   ├── __init__.py                 # Exports all engines
│   │   ├── assistant.py                # StudyAssistantEngine (grounded AI with citations)
│   │   ├── daily_plan.py               # DailyPlanEngine (day-by-day typed blocks)
│   │   ├── readiness.py                # ReadinessEngine (7-factor score + explanation + recs)
│   │   ├── recovery.py                 # RecoveryEngine (delay detection + replanning)
│   │   ├── resource_matcher.py         # ResourceMatcherEngine (level-matched sequences)
│   │   ├── time_budget.py              # TimeBudgetEngine (hours allocation by priority)
│   │   ├── topic_priority.py           # TopicPriorityEngine (MUST/SHOULD/IF_TIME classification)
│   │   └── whatif.py                   # WhatIfEngine (5 scenario simulations)
│   ├── management/
│   │   └── commands/                   # Custom management commands
│   │       ├── calculate_priorities.py
│   │       ├── calculate_readiness.py
│   │       ├── check_recovery.py
│   │       ├── generate_study_plans.py
│   │       └── send_notifications.py
│   ├── migrations/                     # Django migrations (3 applied)
│   │   ├── 0001_initial.py
│   │   ├── 0002_alter_user_avatar.py
│   │   ├── 0003_assistantconversation_studyresourcevault.py
│   │   └── __init__.py
│   ├── tests/                          # 46 passing tests
│   │   ├── __init__.py
│   │   ├── conftest.py                 # Shared fixtures (user, exam, subjects, topics, resources)
│   │   ├── test_models.py              # 23 model tests
│   │   └── test_engines.py             # 23 engine tests
│   └── api/                            # DRF API layer
│       ├── __init__.py
│       ├── views.py                    # 10 ViewSets + AssistantChatViewSet
│       ├── serializers/
│       │   └── __init__.py             # 16 serializers (incl. StudyResourceVaultSerializer, AssistantChatSerializer)
│       ├── auth_urls.py                # JWT (token, refresh, verify) + registration
│       ├── exam_urls.py                # Nested exams/subjects/topics + custom actions
│       ├── study_urls.py               # Study plans + mock tests
│       ├── analytics_urls.py           # Readiness, WhatIf, Recovery, Notifications, Dashboard
│       └── vault_urls.py               # Vault CRUD + publish/unpublish + Assistant ask
│
├── templates/                          # Django templates (served by dashboard_3d view)
│   ├── base.html
│   ├── base_3d.html
│   ├── dashboard.html
│   └── dashboard_3d.html
│
├── static/                             # Collected static files (WhiteNoise in prod)
│   ├── css/
│   │   ├── style.css
│   │   └── style_3d.css
│   └── js/
│       ├── app.js
│       └── app_3d.js
│
├── css/                                # Frontend CSS (also in STATICFILES_DIRS)
│   ├── conductor-theme.css
│   ├── copilot-chat.css
│   ├── dashboard.css
│   ├── download-kit.css
│   ├── login.css
│   ├── onboarding.css
│   ├── pilot-planner.css
│   └── styles.css
│
├── js/                                 # Frontend JS (also in STATICFILES_DIRS)
│   ├── account-manager.js
│   ├── auth-portal.js
│   ├── class_syllabus_registry.js
│   ├── conductor-footer.js
│   ├── copilot-chat.js
│   ├── cursor.js
│   ├── dashboard.js
│   ├── download-kit.js
│   ├── kid-interactive.js
│   ├── liquid-canvas.js
│   ├── login.js
│   ├── motion.js
│   ├── nav-course-selector.js
│   ├── onboarding.js
│   └── pilot-planner.js
│
├── assets/                             # Images (logo, mascot) — also in STATICFILES_DIRS
│   ├── logo.jpg
│   ├── logo.png
│   ├── mascot.jpg
│   └── mascot.png
│
├── logs/                               # Runtime logs (gitignored, created at runtime)
│   └── .gitkeep
│
├── media/                              # User uploads (vault PDFs, avatars) — gitignored
│   └── .gitkeep
│
└── DOCS_*.md                           # Documentation
    ├── DOCS_WHAT_IS_DONE.md            # What was built and why
    ├── DOCS_ARCHITECTURE.md            # Technical architecture (diagram, data flows, security, scaling)
    ├── DOCS_HOW_TO_EXPLAIN.md          # Talking points for devs, PMs, DevOps, QA, investors
    └── STRUCTURE.md                    # This file
```

## Key Directories at a Glance

| Path | Purpose |
|------|---------|
| `code_flux/` | Django project config (settings, urls, wsgi/asgi, celery) |
| `PrepPilot/` | All business logic (models, engines, API, tests, commands) |
| `PrepPilot/engines/` | 7 intelligence engines — pure functions, no external deps |
| `PrepPilot/api/` | DRF ViewSets, serializers, URL routing |
| `PrepPilot/tests/` | 46 pytest tests (models + engines) |
| `templates/` | Django-rendered HTML (dashboard_3d) |
| `static/` | `collectstatic` output (served by WhiteNoise/nginx) |
| `css/`, `js/`, `assets/` | Frontend source (also served as static in dev) |
| `media/` | User uploads (vault PDFs, avatars) — excluded from git |
| `logs/` | Application logs — excluded from git |

## Docker Services (docker-compose.yml)

| Service | Image | Ports | Depends On |
|---------|-------|-------|------------|
| `db` | postgres:15-alpine | 5432 | — |
| `redis` | redis:7-alpine | 6379 | — |
| `web` | build: . | 8000 | db, redis |
| `celery-worker` | build: . | — | db, redis |
| `celery-beat` | build: . | — | db, redis |
| `nginx` | nginx:alpine | 80, 443 | web |

All services use `restart: unless-stopped` and health checks on db/redis.

## Environment Variables (from .env)

| Variable | Description |
|----------|-------------|
| `SECRET_KEY` | Django secret (min 50 chars in prod) |
| `DEBUG` | True/False |
| `ALLOWED_HOSTS` | Comma-separated hosts |
| `USE_SQLITE` | True=SQLite (dev), False=Postgres (prod) |
| `DB_NAME` | Database name (default: preppilot) |
| `DB_USER` | DB user (default: postgres) |
| `DB_PASSWORD` | DB password (default: Eman@1234) |
| `DB_HOST` | DB host (localhost/dev, db/compose) |
| `DB_PORT` | DB port (5432) |
| `REDIS_URL` | Redis connection string |
| `AI_API_KEY` | OpenAI key (optional, enables LLM polish) |
| `AI_MODEL` | Model name (default: gpt-4) |
| `FRONTEND_URL` | CORS origin (default: http://localhost:3000) |
| `EMAIL_*` | SMTP settings (optional) |

## Test Commands

```bash
# All tests
pytest PrepPilot/tests/ -v

# With coverage
pytest --cov=PrepPilot --cov-report=term-missing

# Lint
black --check . && flake8 . && isort --check-only .

# Django system check
python manage.py check --deploy
```