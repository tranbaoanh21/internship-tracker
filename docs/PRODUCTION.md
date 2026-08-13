# Production runbook

This runbook targets one Linux VPS, one owner and one domain. Caddy terminates HTTPS, Nginx serves the React app, Express/MySQL implement the product, Redis/BullMQ runs reminders, and Prometheus observes the backend.

## 1. Host and DNS prerequisites

- A current Linux VPS with Docker Engine and Compose v2.
- DNS `A`/`AAAA` for the chosen domain points to the VPS.
- Inbound TCP 80 and 443, plus UDP 443, are allowed. Do not expose MySQL, Redis, Express or Prometheus publicly.
- Enough disk for images, database growth, logs and backup staging; configure OS security updates and SSH keys.

## 2. Prepare configuration and secrets

```bash
cp .env.production.example .env.production
mkdir -p deploy/secrets
openssl rand -base64 48 > deploy/secrets/mysql_root_password
openssl rand -base64 48 > deploy/secrets/mysql_password
openssl rand -base64 48 > deploy/secrets/owner_password
chmod 600 .env.production deploy/secrets/*
```

Set `APP_DOMAIN`, `ACME_EMAIL`, `OWNER_EMAIL` and the exact `RELEASE_TAG=sha-<full-commit-sha>`. The three files are ignored by Git. Keep a protected copy in a password manager; losing the owner password requires an explicit reset procedure.

## 3. Pull and start the immutable release

```bash
docker login ghcr.io
docker compose --env-file .env.production \
  -f docker-compose.release.yml \
  -f docker-compose.production.yml \
  -f docker-compose.monitoring.yml config --quiet

docker compose --env-file .env.production \
  -f docker-compose.release.yml \
  -f docker-compose.production.yml pull

docker compose --env-file .env.production \
  -f docker-compose.release.yml \
  -f docker-compose.production.yml \
  -f docker-compose.monitoring.yml up -d --wait
```

Caddy requests and renews certificates automatically after DNS and ports are correct. Verify:

```bash
curl --fail --show-error https://tracker.example.com/api/health
docker compose --env-file .env.production \
  -f docker-compose.release.yml -f docker-compose.production.yml \
  -f docker-compose.monitoring.yml ps
docker compose --env-file .env.production \
  -f docker-compose.release.yml -f docker-compose.production.yml logs --tail=200
```

Replace the example hostname. Sign in through the browser, create a disposable record, edit it, archive/restore it and remove it. Record the deployed Git SHA and image digests.

## 4. Metrics and alerts

Prometheus listens on VPS loopback `127.0.0.1:9090`; reach it through an SSH tunnel, not a public firewall rule. Confirm target `backend:3000/metrics` is up and both `ApiDown` and `HighErrorRate` rules load. Connect Alertmanager or another monitored receiver before relying on alerts; a rule without a human receiver is not an operational alert.

Structured backend logs include request IDs. Search by request ID while investigating API errors. Docker JSON logs rotate at 10 MB with three files per service.

## 5. Backup policy and restore drill

Initial objectives: **RPO 24 hours**, **RTO 2 hours**. Schedule one encrypted dump daily and copy the `.enc` and `.sha256` files to encrypted off-host storage with retention (for example 7 daily, 4 weekly, 6 monthly).

```bash
export COMPOSE_FILE=docker-compose.release.yml:docker-compose.production.yml
export COMPOSE_ENV_FILES=.env.production
export BACKUP_PASSPHRASE='read-from-a-secret-manager'
BACKUP_DIRECTORY=/protected/staging npm run db:backup
# Upload the resulting .enc and .sha256, then remove local staging copies by policy.
```

Every month and before a risky migration:

```bash
export COMPOSE_FILE=docker-compose.release.yml:docker-compose.production.yml
export COMPOSE_ENV_FILES=.env.production
npm run db:restore:drill
```

For an actual restore, stop write traffic, preserve the damaged volume, create a fresh database target, verify the checksum, then explicitly run:

```bash
export BACKUP_PASSPHRASE='read-from-a-secret-manager'
CONFIRM_RESTORE=RESTORE scripts/restore-db.sh /path/to/backup.sql.gz.enc
```

Do not restore blindly over the only copy. Verify migration count, owner login, application count and a CRUD flow before reopening traffic.

## 6. Upgrade and rollback

1. Record current SHA, database counts and health.
2. Produce and verify an encrypted backup.
3. Pull the next matched SHA pair.
4. Start it; migrations are forward-only and must be backward-compatible for at least one release.
5. Run authenticated smoke tests and watch error rate/logs.

For an application regression, set `RELEASE_TAG` back to the recorded previous SHA and recreate backend, worker and frontend. Do not edit or remove applied migrations. For destructive/schema corruption, stop writes and restore the verified pre-release backup into a new database volume.

The first authenticated release is a security cutover: never roll a public service back to an older anonymous image. Establish the first safe rollback baseline only between authenticated releases; fix-forward or restore behind maintenance mode during the initial cutover.

## 7. External completion checklist

- HTTPS certificate valid and HTTP redirects to HTTPS.
- Login cookie has `Secure`, `HttpOnly`, `SameSite=Strict` and `__Host-` prefix.
- MySQL, Redis, Express and Prometheus are not public.
- Daily off-host encrypted backup job and retention are observable.
- Monthly restore test has dated evidence.
- Alert rules reach a human-owned receiver.
- Previous image SHA and rollback command are recorded.
