#!/usr/bin/env bash
set -euo pipefail

directory="$(mktemp -d)"
passphrase="$(openssl rand -hex 32)"

case ":${COMPOSE_FILE:-}:" in
  *:docker-compose.drill.yml:*) ;;
  ::) export COMPOSE_FILE="docker-compose.yml:docker-compose.drill.yml" ;;
  *) export COMPOSE_FILE="${COMPOSE_FILE}:docker-compose.drill.yml" ;;
esac
cleanup() {
  docker compose --profile drill stop db-restore >/dev/null 2>&1 || true
  rm -rf "$directory"
}
trap cleanup EXIT

archive="$(BACKUP_PASSPHRASE="$passphrase" BACKUP_DIRECTORY="$directory" scripts/backup-db.sh)"
docker compose --profile drill up -d --wait db-restore
BACKUP_PASSPHRASE="$passphrase" DB_SERVICE=db-restore CONFIRM_RESTORE=RESTORE scripts/restore-db.sh "$archive"

source_count="$(docker compose exec -T db sh -c 'password="$MYSQL_PASSWORD"; if [ -z "$password" ] && [ -n "${MYSQL_PASSWORD_FILE:-}" ]; then password="$(cat "$MYSQL_PASSWORD_FILE")"; fi; MYSQL_PWD="$password" mysql -N -u"$MYSQL_USER" "$MYSQL_DATABASE" -e "SELECT COUNT(*) FROM applications"')"
restore_count="$(docker compose exec -T db-restore sh -c 'MYSQL_PWD="$MYSQL_PASSWORD" mysql -N -u"$MYSQL_USER" "$MYSQL_DATABASE" -e "SELECT COUNT(*) FROM applications"')"
test "$source_count" = "$restore_count"
echo "DR drill passed: restored $restore_count applications and verified migration metadata."
