# Technical decisions

## Product boundary: single owner

The first public production target is one owner on one VPS, not a multi-tenant SaaS. There is one bootstrap account, no public registration, and every application query is scoped by `user_id`. A future SaaS conversion would require tenant lifecycle, authorization roles, email verification, password reset, abuse controls, billing and a separate threat model.

## Server-side cookie sessions

The browser receives an opaque random session ID through an `HttpOnly`, `Secure`, `SameSite=Strict` cookie. Only its SHA-256 hash is stored in MySQL. Passwords use Argon2id. A separate CSRF token protects state-changing requests, login and API rate limits reduce brute-force/abuse, and authentication tokens never enter `localStorage`.

## Raw SQL, migrations and ownership

The project intentionally uses `mysql2` and parameterized raw SQL to expose schema design, mapping, indexes and transactions. Numbered migrations are checksum-protected, serialized with a MySQL advisory lock and append-only after application. MySQL DDL can implicitly commit, so rollback means restoring a tested backup or running a backward-compatible earlier app image—not editing history.

## Actionable application model

`next_action` and `follow_up_at` turn passive CRUD into a workflow. Status changes and status history are written in one transaction. Archive/restore is the ordinary removal path; permanent deletion is allowed only from the archive. Integer versions plus quoted `If-Match` headers reject stale writes with `409`.

## Redis, BullMQ and SSE—not cache or WebSocket

MySQL remains the durable source of truth. A BullMQ worker periodically scans due follow-ups, inserts an idempotent notification in MySQL and publishes a small Redis event. Redis is used for queue coordination and Pub/Sub, not as an unmeasured database cache. SSE is enough for one-way browser notifications and is simpler than WebSocket for this product.

## Same-origin boundaries

Vite proxies `/api` in development; Nginx proxies `/api` and long-lived SSE in containers; Caddy terminates production TLS. This avoids permissive CORS and allows secure host-only cookies. The internal `/metrics` route is not proxied to the public frontend.

## Observability

Pino emits structured JSON logs with request IDs and redaction. Prometheus scrapes backend process/HTTP metrics and evaluates API-down and high-5xx rules. The repository supplies the rules; a real deployment must connect Alertmanager or another receiver to a human-operated channel.

## Immutable supply chain

Pull requests run reusable quality gates with pinned action commits, dependency auditing, CodeQL and fixable high/critical image scanning. A main/tag publish invokes the same reusable gates once before CD publishes the backend/frontend pair with the same immutable full-SHA tag, multi-architecture manifests, SBOM and provenance attestations. Deployment selects exact SHA tags; `latest` is convenience only.

## Backups and recovery

A Docker named volume is durable local storage, not a backup. Production takes encrypted logical dumps, stores checksums and sends copies off-host. The initial operating assumption is RPO 24 hours and RTO 2 hours. A disposable MySQL restore drill verifies application counts and migration metadata without touching production.

## Deliberately deferred

- Kubernetes and microservices: unnecessary for one VPS/one owner.
- RabbitMQ: BullMQ already teaches ACK/retry/backoff/idempotency for the reminder use case; running both adds operations without product value.
- Redis cache: add only after metrics show a MySQL bottleneck.
- Multi-tenant auth, email delivery and mobile push: separate product slices, not hidden inside hardening.
