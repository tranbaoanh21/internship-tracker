# Internship Application Tracker

A production-oriented learning project for managing internship applications, follow-ups, status history, and reminders.

## Architecture

```text
Browser
  -> Caddy (production TLS) -> Nginx (React + /api proxy)
  -> Express -> MySQL 8.4
             -> Redis 8 -> BullMQ reminder worker -> SSE notifications
             -> Prometheus metrics + structured JSON logs
```

- React 19, Vite, Tailwind CSS v4
- Node.js 24, Express 5, `mysql2`, raw SQL
- MySQL 8.4, Redis 8, BullMQ
- Vitest, Testing Library, Supertest, Playwright
- Docker Compose, Nginx, Caddy, Prometheus
- GitHub Actions, GHCR, SBOM, provenance attestations and image scanning

The public deployment target is a secure **single-owner application**, not a multi-tenant SaaS. There is no public registration. Every application is owned and every query is scoped to the bootstrapped owner.

## Quick start with Docker

Prerequisite: Docker Desktop with Compose v2.

```bash
docker compose up --build -d --wait
curl --fail http://127.0.0.1:8080/api/health
```

Open <http://127.0.0.1:8080> and sign in with the local-only defaults:

```text
owner@example.com
change-this-local-password
```

Override them through `OWNER_EMAIL` and `OWNER_PASSWORD`. Never reuse these defaults outside local development. The backend applies append-only migrations and bootstraps the owner during startup.

```bash
docker compose exec backend node backend/scripts/seed.js
docker compose down                 # preserves MySQL and Redis volumes
```

Do not run `docker compose down -v` unless deleting local data is intentional.

## Local development

```bash
nvm use
cp .env.example .env
npm install
docker compose up -d db redis
npm run db:migrate
npm run dev
```

- Frontend: <http://127.0.0.1:5173>
- API: <http://127.0.0.1:3000/api/health>
- Swagger UI: <http://127.0.0.1:3000/api/docs/>
- MySQL: `127.0.0.1:3308`
- Redis: `127.0.0.1:6379`

Use Node `24.19.0` from `.nvmrc`. Vite proxies `/api` to Express, preserving the same-origin cookie model.

## API and authentication

The OpenAPI 3.1 source of truth is `backend/openapi.json`. It documents session auth, CSRF, applications, status history, archives, notifications, and SSE. Update contract, validation, implementation and tests together.

- The login response sets an opaque session cookie and returns a CSRF token.
- Production uses `HttpOnly`, `Secure`, `SameSite=Strict`, `__Host-` cookies.
- Mutating API calls require `X-CSRF-Token`.
- Application mutations also require the current quoted `version` in `If-Match`.
- Passwords are hashed with Argon2id; only a SHA-256 session-token hash is stored.
- Swagger is disabled by default in production and protected when explicitly enabled.

Main endpoints:

| Area | Endpoints |
| --- | --- |
| Health | `GET /api/health` |
| Auth | `GET /api/auth/session`, `POST /api/auth/login`, `POST /api/auth/logout` |
| Applications | list, stats, detail, history, create, patch, archive, restore and permanent delete under `/api/applications` |
| Notifications | list, mark read, mark all read and SSE events under `/api/notifications` |
| Contract | `/api/docs/`, `/api/openapi.json` when enabled |
| Metrics | `/metrics` on the internal backend network only |

## Quality gates

```bash
docker compose --profile test up -d db-test
npm run lint
npm test
npm run build
docker compose up --build -d --wait
npm run test:e2e
npm run db:restore:drill
```

The restore drill automatically adds `docker-compose.drill.yml` and restores into tmpfs. In production, export the release/production `COMPOSE_FILE` and `.env.production` through `COMPOSE_ENV_FILES` first, as shown in the runbook.

CI repeats these gates, audits npm dependencies, scans both images for fixable high/critical vulnerabilities, then publishes only after success.

## Immutable release and production deployment

Pushes to `main` publish matching multi-architecture images:

- `ghcr.io/tranbaoanh21/internship-application-tracker-backend`
- `ghcr.io/tranbaoanh21/internship-application-tracker-frontend`

Use the same immutable `sha-<full-commit-sha>` tag for both. The publish workflow verifies signed provenance, pulls the published pair, boots it, and performs authenticated CRUD.

`docker-compose.release.yml` is for artifact verification. Because production cookies are `Secure`, interactive login must run behind the HTTPS Caddy overlay. Follow [Production runbook](docs/PRODUCTION.md) for a real VPS.

## Operations and learning documents

- [Production deployment, backup and rollback runbook](docs/PRODUCTION.md)
- [Security model and checklist](docs/SECURITY.md)
- [Reusable workflow](docs/WORKFLOW.md)
- [Technical decisions](docs/DECISIONS.md)
- [UI redesign audit](docs/ui-audit.md)
- [Current handoff and evidence](docs/HANDOFF.md)
