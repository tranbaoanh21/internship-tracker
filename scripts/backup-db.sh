#!/usr/bin/env bash
set -euo pipefail

service="${DB_SERVICE:-db}"
directory="${BACKUP_DIRECTORY:-backups}"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$directory"
plain="$directory/internship-tracker-$timestamp.sql.gz"

docker compose exec -T "$service" sh -c \
  'password="$MYSQL_PASSWORD"; if [ -z "$password" ] && [ -n "${MYSQL_PASSWORD_FILE:-}" ]; then password="$(cat "$MYSQL_PASSWORD_FILE")"; fi; exec env MYSQL_PWD="$password" mysqldump --single-transaction --quick --routines --triggers --no-tablespaces --set-gtid-purged=OFF -u"$MYSQL_USER" "$MYSQL_DATABASE"' \
  | gzip -9 > "$plain"

if [[ -n "${BACKUP_PASSPHRASE:-}" ]]; then
  encrypted="$plain.enc"
  openssl enc -aes-256-cbc -pbkdf2 -salt -in "$plain" -out "$encrypted" -pass env:BACKUP_PASSPHRASE
  rm -f "$plain"
  shasum -a 256 "$encrypted" > "$encrypted.sha256"
  echo "$encrypted"
elif [[ "${ALLOW_UNENCRYPTED_BACKUP:-false}" == "true" ]]; then
  shasum -a 256 "$plain" > "$plain.sha256"
  echo "$plain"
else
  rm -f "$plain"
  echo "Set BACKUP_PASSPHRASE, or ALLOW_UNENCRYPTED_BACKUP=true only for a local restore drill." >&2
  exit 1
fi
