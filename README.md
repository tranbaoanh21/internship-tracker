# Internship Application Tracker

A learning-focused full-stack portfolio project for tracking internship applications from wishlist to offer.

## Stack

- React 19, Vite, Tailwind CSS v4
- Node.js 24, Express, mysql2, raw SQL
- MySQL 8.4
- Vitest, Testing Library, Supertest, Playwright
- Docker Compose, Nginx, GitHub Actions, GHCR

## Quick start with Docker

Prerequisites: Docker Desktop with Compose v2.

```bash
docker compose up --build -d
curl http://localhost:8080/api/health
```

Open <http://localhost:8080>. The backend applies migrations during startup. Add sample data with:

```bash
docker compose exec backend node backend/scripts/seed.js
```

Stop containers without deleting data:

```bash
docker compose down
```

## Local development

```bash
nvm use
cp .env.example .env
npm install
docker compose up -d db
npm run db:migrate
npm run db:seed
npm run dev
```

- Frontend: <http://localhost:5173>
- API: <http://localhost:3000/api/health>
- MySQL: `127.0.0.1:3308` (container-internal port remains `3306`)

This repository includes `.nvmrc` for Node `24.19.0`. The machine used during development also had a stale `/usr/local/bin/node` v16 and a broken Homebrew line in `~/.zprofile`; run `nvm use` if `node --version` does not report Node 24.

Vite proxies `/api` to Express, so local browser requests stay same-origin from the frontend's perspective.

## Tests and quality gates

Start the disposable test database first:

```bash
docker compose --profile test up -d db-test
npm run lint
npm run test:unit
npm test
npm run build
```

For E2E, run the full Docker application and install Chromium once:

```bash
npx playwright install chromium
docker compose up --build -d
npm run test:e2e
```

## API

Interactive Swagger UI is available at <http://localhost:3000/api/docs> during local development and at <http://localhost:8080/api/docs> through Docker. The machine-readable OpenAPI 3.1 contract is served from `/api/openapi.json` and stored in `backend/openapi.json`.

Treat the OpenAPI document as the public API contract: update it together with routes, validation, response shapes, and tests whenever API behavior changes. The backend contract tests call the real Express routes and validate their JSON responses against this document.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/docs` | Interactive Swagger UI |
| GET | `/api/openapi.json` | Machine-readable OpenAPI contract |
| GET | `/api/health` | API and database health |
| GET | `/api/applications` | Search, filter, and paginate |
| GET | `/api/applications/stats` | Counts for every status |
| GET | `/api/applications/:id` | Read one application |
| POST | `/api/applications` | Create an application |
| PATCH | `/api/applications/:id` | Update supplied fields |
| DELETE | `/api/applications/:id` | Permanently delete |

List query parameters: `q`, `status`, `page`, and `limit` (maximum `100`). API responses use camelCase while MySQL uses snake_case.

## Container publishing

Pushes to `main` publish:

- `ghcr.io/tranbaoanh21/internship-application-tracker-backend`
- `ghcr.io/tranbaoanh21/internship-application-tracker-frontend`

GHCR publishing is artifact delivery, not a hosted runtime deployment. The frontend image expects a Docker network alias named `backend`; use `docker-compose.release.yml` when running the published pair.

The publish workflow creates matched `linux/amd64` and `linux/arm64` images. After the first publish, open each package on GitHub and change its visibility to public once. To run one immutable release:

```bash
cp .env.release.example .env.release
# Replace every placeholder. Use the same full commit SHA shown by GitHub Actions.
docker compose --env-file .env.release -f docker-compose.release.yml pull
docker compose --env-file .env.release -f docker-compose.release.yml up -d
curl --fail http://127.0.0.1:8080/api/health
```

Both images use the same `sha-<full-commit-sha>` tag, which prevents a cached `latest` tag or a partially published release from mixing frontend and backend versions. Never commit `.env.release`.

## Learning documentation

- [Workflow](docs/WORKFLOW.md)
- [Technical decisions](docs/DECISIONS.md)
- [UI redesign audit](docs/ui-audit.md)
- [Local completion and GitHub handoff](docs/HANDOFF.md)
