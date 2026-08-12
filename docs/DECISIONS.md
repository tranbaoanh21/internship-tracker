# Technical decisions

## Raw SQL and mysql2

The project intentionally avoids an ORM so the learning surface includes schema design, parameterized queries, result mapping, indexes, and migration behavior.

## Numbered migrations

Migration filenames and SHA-256 checksums are stored in `schema_migrations` after successful execution. A MySQL advisory lock serializes runners. MySQL DDL can implicitly commit, so migrations use idempotent recovery where possible and the runner does not promise transactional rollback. Applied migrations are append-only.

## Status as VARCHAR plus CHECK

The database enforces the five MVP statuses without MySQL `ENUM`. This keeps the value constraint visible while allowing a future migration to modify the set more directly.

## Same-origin API in both environments

Vite proxies `/api` during development and Nginx proxies `/api` in the production image. The backend therefore does not need permissive CORS configuration.

## Bounded database startup retry

Compose health dependencies order normal startup, but a manual `docker compose restart` can restart services concurrently. The backend entrypoint retries transient MySQL connection failures for up to one minute before failing, while migration checksum or SQL errors still fail immediately.

## Server-side URL state

Search, status, attention, sort, lifecycle view, and page live in URL query parameters. A refresh or shared URL retains the current dashboard view without adding React Router.

## Follow-up as the next product slice

`next_action` and `follow_up_at` make the tracker actionable rather than a passive CRUD list. MySQL performs filtering and sorting so pagination remains correct. The backend computes date boundaries in the configured `APP_TIMEZONE`; clients send and receive calendar dates as `YYYY-MM-DD`.

## Transactional status history

Creating or changing an application and recording its status history happen in one database transaction. If either write fails, both are rolled back. No-op edits do not create duplicate history entries, and the initial history row makes every timeline complete from creation.

## Archive before permanent delete

Normal removal is reversible: active records are archived, can be restored, and are hidden from the default view. Permanent DELETE is allowed only for an already archived record and still requires confirmation. This keeps the MVP simple while protecting users from an accidental destructive click.

## Optimistic concurrency with HTTP preconditions

Every application carries an integer `version`. PATCH, archive, restore, and DELETE require the current value as a quoted `If-Match` header. A successful mutation increments the version; a stale client receives `409 STALE_APPLICATION` instead of silently overwriting newer data. This avoids holding database locks during a user's editing session.

## Contextual statistics

Status totals follow the active/archived lifecycle view and search query, but deliberately ignore the selected status filter. The five cards therefore remain a useful pipeline overview and navigation control instead of collapsing to one non-zero card.

## Separate test database

Local integration tests use the disposable `db-test` service on port `3307`. CI exposes its MySQL service on the same port. Tests migrate and clear this database independently of development data.

## GHCR as the CD target

Merges to `main` publish matched multi-platform (`linux/amd64`, `linux/arm64`) images with full immutable SHA tags and a moving `latest` tag. Release Compose requires one shared immutable tag for both images so cached tags and partial matrix publishes cannot create frontend/backend version skew. This demonstrates artifact delivery without pretending that a registry is a running production deployment.

## Independent review gates

Backend correctness, frontend accessibility, and Docker/CI readiness receive separate read-only subagent reviews. The main agent owns all edits. The first full review hardened unsigned BIGINT validation, field-level PATCH errors, modal focus lifecycle, screen-reader result announcements, multi-platform publishing, workflow permissions, immutable release selection, and runtime image contents.
