# Production FastAPI Deployment Checklist & Blueprints

## 1. Minimal Zero-Crash `render.yaml` Blueprint

```yaml
services:
  - type: web
    name: my-api-service
    runtime: docker
    dockerfilePath: ./Dockerfile.render
    plan: free
    region: oregon
    healthCheckPath: /health/live    # CRITICAL: Liveness probe, not deep readiness
    autoDeploy: true
    envVars:
      - key: PORT
        value: 10000
      - key: APP_ENV
        value: production
      - key: APP_SECRET_KEY
        generateValue: true         # Generates cryptographically secure key
      - key: TASK_QUEUE_MODE
        value: sync                 # Zero-dependency mode for single containers
      - key: DATABASE_URL
        sync: false
      - key: CORS_ORIGINS
        value: '["https://my-app.web.app"]'
```

---

## 2. Dockerfile CMD Best Practice

```dockerfile
# Multi-stage or single-container runtime
EXPOSE 10000

# Execute migrations safely and start server with proxy headers for reverse proxies (Render / Cloudflare)
CMD ["sh", "-c", "(alembic upgrade head || echo 'Alembic warning: proceeding...') && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-10000} --proxy-headers --forwarded-allow-ips='*' --timeout-keep-alive 65"]
```

---

## 3. Pre-Flight Verification Checklist

Before pushing commits to trigger production deployment:

- [ ] **Liveness Probe:** Verify `/health/live` returns HTTP 200 without querying external databases.
- [ ] **Database String:** Test `Settings(DATABASE_URL="postgres://...")` to confirm it normalizes to `postgresql+asyncpg://`.
- [ ] **Missing Secrets:** Test booting with `APP_ENV=production` without setting `APP_SECRET_KEY` to ensure zero validation exceptions.
- [ ] **CORS Preflight:** Verify `OPTIONS /api/v1/...` returns appropriate `Access-Control-Allow-Origin` and `Access-Control-Allow-Credentials` headers.
- [ ] **Cold-Start Buffer:** Ensure client timeout is configured to $\ge 45$ seconds with at least 1 retry on HTTP 502/503/504 status codes.
