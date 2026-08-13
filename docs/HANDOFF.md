# Project handoff

## Current scope

The repository is a production-oriented single-owner tracker with authenticated application ownership, CSRF protection, status history, archive/restore, optimistic concurrency, follow-up reminders, durable notifications and SSE updates. Redis/BullMQ handles reminder work; MySQL remains authoritative.

## Delivery topology

- Development: five healthy services—MySQL, Redis, Express, reminder worker and Nginx/React—at <http://127.0.0.1:8080>.
- Release verification: matched immutable GHCR backend/frontend SHA tags.
- Production package: release Compose plus Caddy secrets/TLS overlay and optional Prometheus overlay.
- Git remote: <https://github.com/tranbaoanh21/internship-tracker>.

## Verification commands

```bash
nvm use
docker compose --profile test up -d db-test
npm run lint
npm test
npm run build
docker compose up --build -d --wait
npm run test:e2e
npm run db:restore:drill
```

Latest local evidence before release: 37 backend integration/contract tests, 34 backend unit tests, 19 frontend component tests and 2 Playwright desktop/mobile flows all passed; npm audit reported zero vulnerabilities. The encrypted restore drill recovered 7 migrations and all 5 preserved development applications. The production-mode release smoke verified the secure `__Host-` cookie, CSRF-authenticated CRUD and disabled production docs.

Swagger/OpenAPI contains authenticated application and notification operations. Production API docs are disabled by default. Metrics remain internal at backend `/metrics`; Prometheus is available locally on `127.0.0.1:9090` when the monitoring overlay runs.

## Data safety

- Never edit applied migrations `001`–`007`; add the next numbered migration.
- Never run test cleanup against a database without `NODE_ENV=test` and an `_test` name.
- Never use `docker compose down -v` unless deletion is intentional.
- Archive first; permanent delete only archived records.
- Back up before migrations and verify the backup by restoring into disposable `db-restore`.

## External production prerequisites

Repository completion cannot create a real VPS/domain by itself. The operator must supply DNS, reachable ports 80/443, three secret files, a GHCR-readable Docker login if packages are private, encrypted off-host backup storage and a human alert receiver. Follow `docs/PRODUCTION.md` and record the deployed SHA plus restore/rollback evidence.
