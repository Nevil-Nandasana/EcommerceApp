---
name: production-fastapi-zero-crash-deploy
description: >-
  Containerize, configure, and deploy FastAPI applications and microservices to cloud platforms
  (Render, Fly.io, Railway, Supabase, AWS App Runner). Enforce zero-crash boot patterns, asyncpg
  URL normalization, probe separation, and non-fatal startup migrations.
---

# Production FastAPI Zero-Crash Deployment

A hardened engineering guide and operational runbook for containerizing and deploying FastAPI applications with PostgreSQL, Redis, and external authentication without unexpected container halts, crash-loops, or 503 deployment rollbacks.

## Core Anti-Crash Rules

1. **AsyncPG Driver Auto-Normalization:**
   - Cloud databases (Render Postgres, Supabase, Neon, AWS RDS, Heroku) inject connection strings starting with `postgres://` or `postgresql://`.
   - Passing these directly to SQLAlchemy 2.0 async engine will fail with: `The asyncio extension requires an async driver to be used. The loaded 'psycopg2' is not async.`
   - Always normalize in Pydantic settings before engine instantiation:
     ```python
     @field_validator("DATABASE_URL", mode="before")
     @classmethod
     def normalize_database_url(cls, v: str) -> str:
         if not v or not isinstance(v, str):
             return v
         v = v.strip()
         if v.startswith("postgres://"):
             return "postgresql+asyncpg://" + v[len("postgres://"):]
         if v.startswith("postgresql://") and not v.startswith("postgresql+asyncpg://"):
             return "postgresql+asyncpg://" + v[len("postgresql://"):]
         return v
     ```

2. **Ephemeral Secret Boot Guard:**
   - In production, missing or default placeholder secrets (`APP_SECRET_KEY`) must never crash the container during startup with unhandled exceptions.
   - If missing or `< 32` characters, auto-generate an ephemeral 64-character key (`secrets.token_hex(32)`) and log a warning so the process can boot and serve liveness probes.
   - In `render.yaml`, specify `generateValue: true` for permanent key generation.

3. **Orchestrator Probe Separation (Liveness vs. Readiness):**
   - **Never** configure orchestrator deployment health checks (e.g. Render `healthCheckPath`) to a deep readiness check that queries databases or caches.
   - Route orchestrator deployment checks to `/health/live` (lightweight process existence returning 200 OK).
   - Use `/health/ready` or `/health` for internal traffic routing and monitoring.

4. **Non-Fatal Container Migration:**
   - In Docker `CMD`, never use strict `alembic upgrade head && uvicorn ...` because any transient cold-start database delay will kill the container before `uvicorn` can bind.
   - Use: `CMD ["sh", "-c", "(alembic upgrade head || echo 'Migration skipped') && uvicorn app.main:app ..."]`
   - Pair with idempotent DDL (`CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`) in application lifespan startup.

5. **Headless Firebase / Supabase Auth (Public-Key Fallback):**
   - When running on cloud platforms without private service account files, initialize auth clients with public key verification fallbacks.

---

## Detailed Reference
For deployment blueprints (`render.yaml`, `Dockerfile`), zero-downtime checklists, and troubleshooting commands, refer to:
- [Deployment Checklist & Blueprints](./references/deployment_checklist.md)
