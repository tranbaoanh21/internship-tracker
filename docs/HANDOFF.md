# Project handoff

## Repository and delivery state

- Git uses the `main` branch and tracks `origin` at <https://github.com/tranbaoanh21/internship-tracker>.
- GitHub Actions runs quality checks, Playwright E2E, Docker builds, and publishes multi-platform images to GHCR after a successful push to `main`.
- The project-scoped `redesign-existing-projects` skill is pinned under `.agents/skills/redesign-skill/` and its audit evidence is stored in `docs/ui-audit.md` and `docs/ui/`.
- The development stack exposes the application at <http://127.0.0.1:8080>; MySQL and backend traffic remain behind the frontend proxy in the release topology.

## Quality gates

Use Node 24 from the repository `.nvmrc`, then run:

```bash
nvm use
npm run lint
npm test
npm run build
npm run test:e2e
```

Backend integration tests use the disposable `db-test` MySQL service on host port `3307`. Tests delete only their application fixtures and close the connection pool after the suite.

The OpenAPI 3.1 source of truth is `backend/openapi.json`. Swagger UI is served from `/api/docs/`, the JSON document from `/api/openapi.json`, and runtime contract tests validate real Express responses against the documented schemas.

The application API now has ten documented operations: list/stats/detail/history/create/update/archive/restore/permanent-delete plus health. Mutations use the record `version` through `If-Match`; permanent deletion is available only after archive. Follow-up filters and sorting use `APP_TIMEZONE` so calendar-day behavior is consistent across local, Docker, and CI environments.

## Local Docker runtime

```bash
docker compose up --build -d
docker compose ps
curl --fail http://127.0.0.1:8080/api/health
curl --fail http://127.0.0.1:8080/api/openapi.json
docker compose logs --no-color
docker compose down
```

The development database uses host port `3308`. Do not run `docker compose down -v` unless deleting local development data is intentional.

## Release artifacts

Published images:

- `ghcr.io/tranbaoanh21/internship-application-tracker-backend`
- `ghcr.io/tranbaoanh21/internship-application-tracker-frontend`

Copy `.env.release.example` to the ignored `.env.release` and use the same `sha-<full-commit-sha>` tag for both images. A production deployment must additionally provide access control, TLS, off-site backup, restore verification, monitoring, and rollback evidence; the current Compose release is a learning baseline rather than a complete public production platform.

## Rules for future changes

- Keep API JSON camelCase and MySQL columns snake_case.
- Update OpenAPI, validation, implementation, and tests in the same vertical slice.
- Never edit a committed migration; add a numbered migration.
- Never commit `.env`, credentials, dependencies, build output, Playwright reports, or test artifacts.
- Preserve backward-compatible database changes so an earlier application image can be used during rollback.
- Treat archive as the ordinary delete path and reserve permanent deletion for archived records.
- Keep record mutation, version increment, and status-history insertion inside one transaction.
