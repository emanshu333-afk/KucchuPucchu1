# App Architecture — Code Flux (PrepPilot Backend)

## High-Level Diagram
```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (React/HTML)                       │
│  Liquid-glass UI  │  Dashboard  │  Vault  │  Assistant Chat    │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS / REST + JWT
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      NGINX (reverse proxy)                       │
│  Static files  │  Rate limit  │  SSL termination  │  /api/*     │
└──────────────────────────┬──────────────────────────────────────┘
                           │
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
    ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
    │   WEB xN    │ │  CELERY     │ │ CELERY BEAT │
    │  (gunicorn) │ │  WORKER xM  │ │  (scheduler)│
    └──────┬──────┘ └──────┬──────┘ └──────┬──────┘
           │               │               │
           └───────────────┼───────────────┘
                           ▼
        ┌────────────────────────────────┐
        │     POSTGRESQL 15 (primary)    │
        │  + REDIS 7 (cache/broker)      │
        └────────────────────────────────┘
```

---

## Django Project Layout
```
KucchuPucchu1/                          # repo root
├── .env                                # secrets (gitignored)
├── .env.example                        # template
├── manage.py                           # entry point
├── requirements.txt                    # pinned deps
├── pytest.ini                          # test config
├── Dockerfile                          # multi-stage
├── docker-compose.yml                  # 6 services
├── nginx.conf                          # reverse proxy
├── code_flux/                          # Django project package
│   ├── __init__.py                     # exposes celery app
│   ├── celery.py                       # Celery config
│   ├── asgi.py / wsgi.py               # entry points
│   ├── urls.py                         # root URLconf
│   └── settings/
│       ├── __init__.py
│       ├── base.py                     # shared config
│       ├── development.py              # DEBUG, SQLite, toolbar
│       └── production.py               # Postgres, WhiteNoise, TLS
├── PrepPilot/                          # main app
│   ├── __init__.py
│   ├── apps.py                         # AppConfig + signals
│   ├── models.py                       # 15 models
│   ├── admin.py                        # admin customization
│   ├── views.py                        # template views (dashboard_3d)
│   ├── signals.py                      # post_save handlers
│   ├── engines/                        # 7 intelligence engines
│   │   ├── __init__.py
│   │   ├── topic_priority.py
│   │   ├── time_budget.py
│   │   ├── resource_matcher.py
│   │   ├── daily_plan.py
│   │   ├── readiness.py
│   │   ├── whatif.py
│   │   ├── recovery.py
│   │   └── assistant.py                # grounded AI
│   ├── api/
│   │   ├── __init__.py
│   │   ├── views.py                    # 10 ViewSets + AssistantChatViewSet
│   │   ├── serializers.py              # 16 serializers
│   │   ├── auth_urls.py                # JWT + registration
│   │   ├── exam_urls.py                # nested exams/subjects/topics
│   │   ├── study_urls.py               # plans/mocks
│   │   ├── analytics_urls.py           # readiness/whatif/recovery/notifs
│   │   └── vault_urls.py               # vault + assistant
│   ├── tests/
│   │   ├── conftest.py                 # shared fixtures
│   │   ├── test_models.py              # 23 model tests
│   │   └── test_engines.py             # 23 engine tests
│   └── migrations/
└── templates/                          # Django templates
    ├── base.html
    ├── base_3d.html
    ├── dashboard.html
    └── dashboard_3d.html
```

---

## Data Flow — Key Paths

### 1. Study Plan Generation
```
POST /api/v1/exams/{exam_pk}/generate_plan/
    → ExamViewSet.generate_plan()
    → DailyPlanEngine(exam).generate_full_plan()
    → TimeBudgetEngine.allocate_subject_hours()
    → TopicPriorityEngine.get_must_do/should_do/if_time()
    → ResourceMatcherEngine.get_recommended_sequence()
    → StudyPlan + StudyBlock bulk_create()
    → 201 { plans: [...] }
```

### 2. Grounded Assistant Query
```
POST /api/v1/vault/assistant/ask/  {"question": "How to revise Electrostatics?"}
    → AssistantChatViewSet.create()
    → StudyAssistantEngine(user).answer()
    → tokenize(question) → score against Topic.name/description + Vault.title/description
    → top-3 topics + top-3 vault items (private + published)
    → build_precise_answer() → deterministic template
    → optional LLM polish (if AI_API_KEY set)
    → AssistantConversation.objects.create()
    → 200 { answer, sources: [{kind, topic, ...}], topics: [uuids], vault_items: [uuids] }
```

### 3. What-If Simulation
```
POST /api/v1/analytics/exams/{exam_pk}/whatif/simulate/hours/
    → WhatIfScenarioViewSet.simulate_hours()
    → WhatIfEngine.simulate_hours_change(new_hours)
    → TimeBudgetEngine.recalculate(new_hours)
    → DailyPlanEngine.generate_full_plan()
    → ReadinessEngine.calculate_readiness()
    → WhatIfScenario.objects.create()  # persisted
    → 200 { simulation, saved_scenario }
```

### 4. Recovery Detection
```
GET /api/v1/analytics/exams/{exam_pk}/check_recovery/
    → ExamViewSet.check_recovery()
    → RecoveryEngine.analyze_progress()
    → sums past plans' total_hours vs completed block minutes
    → if hours_behind > 1:
         → _determine_recovery_actions()
         → keep must_do, postpone should_do, drop if_time
         → DailyPlanEngine.generate_full_plan() for remaining days
         → RecoveryPlan.objects.create()
      → 200 { recovery_needed, analysis, recovery_plan, options }
```

---

## Authentication & Authorization
- **JWT** via `djangorestframework-simplejwt`
  - Access: 60 min, Refresh: 7 days, Rotation + blacklist
  - `Authorization: Bearer <access>`
- **Custom User** (`AUTH_USER_MODEL = 'PrepPilot.User'`)
  - `USERNAME_FIELD = 'email'`, UUID PK
- **Permissions**: `IsAuthenticated` on all API views; `get_queryset()` filters to `request.user`
- **CORS**: `localhost:3000` + `FRONTEND_URL` env var

---

## Background Jobs (Celery)
| Task | Schedule | Purpose |
|------|----------|---------|
| `calculate_readiness` | daily 02:00 | Refresh readiness scores for active exams |
| `send_study_reminders` | daily 07:00 | Push notification for today's blocks |
| `check_recovery_all` | daily 03:00 | Detect delays, create recovery plans |
| `cleanup_old_notifications` | weekly | Archive read notifications > 30 days |

---

## Security Checklist
- `SECRET_KEY` from env (min 50 chars in prod)
- `DEBUG=False`, `ALLOWED_HOSTS` strict
- `SECURE_SSL_REDIRECT`, `SESSION_COOKIE_SECURE`, `CSRF_COOKIE_SECURE` in production
- `SECURE_HSTS_SECONDS=31536000`
- Password validators enabled (prod)
- JWT rotation + blacklist
- Non-root Docker user (`appuser`)
- Parameterized queries (ORM only)
- File upload validation (vault: type + size)

---

## Scaling Considerations
- **Web**: Horizontal via `gunicorn --workers N` (N = 2×CPU cores)
- **Celery**: `--concurrency` per worker; add workers for throughput
- **DB**: Connection pooling (`CONN_MAX_AGE=60`), read replicas for analytics
- **Redis**: Cluster mode for high-throughput broker
- **Static**: WhiteNoise + CDN (CloudFront/S3) in prod
- **Search**: Add PostgreSQL full-text or Elasticsearch for vault/resource search

---

## Extension Points
1. **New Engine** → add to `engines/__init__.py`, call from ViewSet action
2. **New Model** → add to `models.py`, create serializer + ViewSet + URLs + migration
3. **New What-If Type** → extend `WhatIfEngine.SCENARIO_TYPES`, add `simulate_*()` method
4. **New Vault Source** → add to `SOURCE_TYPES`, handle in serializer `validate()`
5. **New Notification Channel** → extend `Notification.NOTIFICATION_TYPES`, add Celery task