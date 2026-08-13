#!/usr/bin/env bash
set -euo pipefail

archive="${1:?Usage: CONFIRM_RESTORE=RESTORE scripts/restore-db.sh <backup.sql.gz[.enc]>}"
service="${DB_SERVICE:-db}"

if [[ "${CONFIRM_RESTORE:-}" != "RESTORE" ]]; then
  echo "Restore replaces tables in the target database. Set CONFIRM_RESTORE=RESTORE." >&2
  exit 1
fi

if [[ -f "$archive.sha256" ]]; then
  shasum -a 256 -c "$archive.sha256"
fi

if [[ "$archive" == *.enc ]]; then
  : "${BACKUP_PASSPHRASE:?BACKUP_PASSPHRASE is required for an encrypted backup}"
  openssl enc -d -aes-256-cbc -pbkdf2 -in "$archive" -pass env:BACKUP_PASSPHRASE \
    | gzip -dc \
    | docker compose exec -T "$service" sh -c 'password="$MYSQL_PASSWORD"; if [ -z "$password" ] && [ -n "${MYSQL_PASSWORD_FILE:-}" ]; then password="$(cat "$MYSQL_PASSWORD_FILE")"; fi; exec env MYSQL_PWD="$password" mysql -u"$MYSQL_USER" "$MYSQL_DATABASE"'
else
  gzip -dc "$archive" \
    | docker compose exec -T "$service" sh -c 'password="$MYSQL_PASSWORD"; if [ -z "$password" ] && [ -n "${MYSQL_PASSWORD_FILE:-}" ]; then password="$(cat "$MYSQL_PASSWORD_FILE")"; fi; exec env MYSQL_PWD="$password" mysql -u"$MYSQL_USER" "$MYSQL_DATABASE"'
fi

docker compose exec -T "$service" sh -c \
  'password="$MYSQL_PASSWORD"; if [ -z "$password" ] && [ -n "${MYSQL_PASSWORD_FILE:-}" ]; then password="$(cat "$MYSQL_PASSWORD_FILE")"; fi; MYSQL_PWD="$password" mysql -N -u"$MYSQL_USER" "$MYSQL_DATABASE" -e "SELECT CONCAT(\"migrations=\", COUNT(*)) FROM schema_migrations; SELECT CONCAT(\"applications=\", COUNT(*)) FROM applications;"'
