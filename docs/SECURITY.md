# Security model

## Protected assets and trust boundaries

The application protects owner credentials, session tokens, application data, MySQL backups and deployment secrets. The public browser can reach only Caddy/Nginx and `/api`; MySQL, Redis, backend metrics and Prometheus stay on private Docker/loopback networks.

## Controls implemented

- One bootstrap owner; no anonymous application access and no public registration.
- Argon2id password hashing with OWASP-recommended minimum memory/time parameters.
- Cryptographically random opaque sessions; only token hashes stored in MySQL.
- Production host-only cookie with `HttpOnly`, `Secure` and `SameSite=Strict`.
- CSRF token on state-changing requests; parameterized SQL and ownership scope on every application/notification query.
- Login and API rate limits, bounded input, Helmet and edge security headers.
- Request IDs, structured redacted logs, graceful shutdown and server timeouts.
- Docker secret files for database/owner passwords; API docs off by default in production.
- Dependency audit, CodeQL, pinned Actions, image scanning, SBOM and provenance attestations.

## Operator responsibilities

- Replace every example/default password; keep `.env.production` and `deploy/secrets` mode `600` and out of Git/backups/logs.
- Restrict SSH and firewall; expose only 80/443.
- Patch the host and refresh base images/dependencies through reviewed pull requests.
- Review authentication failures, 5xx rate, disk space, backup age and certificate renewal.
- Configure GitHub branch rules for `CI / quality-gates` and `CodeQL`, secret scanning and reviewed dependency updates.
- Disable or protect Swagger in production; never paste production credentials into interactive docs.

## Known boundary

This is appropriate for a personal single-owner service, not a regulated or multi-tenant platform. It does not provide MFA, password recovery, audit-grade immutable logs, tenant isolation, abuse moderation or compliance controls. Those require separate design and tests.

References: [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html), [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html), [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html).
