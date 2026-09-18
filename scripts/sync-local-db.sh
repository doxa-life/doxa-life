#!/usr/bin/env bash
#
# sync-local-db.sh — Refresh the local dev Postgres database with a copy of the
# live database.
#
# Why it runs the tools inside Docker:
#   The host's system pg_dump/pg_restore are v16, but the live server is Postgres
#   18.4 and the local server is 18.3 — pg_dump refuses to talk to a newer server.
#   The `doxa-life-postgres` container ships v18 client tools that match both, so
#   we exec into it for every pg_* invocation. The container can also reach the
#   live host directly (verified), so no host networking is needed.
#
# Credentials:
#   The live connection string lives in .env as LIVE_DATABASE_URL (.env is
#   gitignored). The local target comes from DATABASE_URL in the same file.
#
# Usage:
#   scripts/sync-local-db.sh                # dump live, then drop+recreate+restore local
#   scripts/sync-local-db.sh --dump-only    # only download a fresh dump file
#   scripts/sync-local-db.sh --restore-only # restore the existing dump into local
#   scripts/sync-local-db.sh -y             # skip the "this wipes your local DB" prompt
#
# Env overrides:
#   LIVE_DATABASE_URL   source (live) connection string          [from .env]
#   DATABASE_URL        target (local) connection string         [from .env]
#   PG_CONTAINER        docker container with the pg tools        [doxa-life-postgres]
#   DUMP_FILE           path to the dump artifact                 [./live.dump]

set -euo pipefail

# ---------------------------------------------------------------------------
# Locate the repo root and load .env (gitignored) for the connection strings.
# ---------------------------------------------------------------------------
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Read a single KEY=value from .env without sourcing it (values there may contain
# spaces/quotes that would break `source`). Returns the last match, unquoted.
env_get() {
  local key="$1" line
  [ -f "$ROOT_DIR/.env" ] || return 0
  line="$(grep -E "^${key}=" "$ROOT_DIR/.env" | tail -n1)" || return 0
  line="${line#"${key}"=}"
  line="${line%\"}"; line="${line#\"}"   # strip optional surrounding double quotes
  line="${line%\'}"; line="${line#\'}"   # strip optional surrounding single quotes
  printf '%s' "$line"
}

CONTAINER="${PG_CONTAINER:-doxa-life-postgres}"
DUMP_FILE="${DUMP_FILE:-$ROOT_DIR/live.dump}"
LOCAL_URL="${DATABASE_URL:-$(env_get DATABASE_URL)}"
LOCAL_URL="${LOCAL_URL:-postgresql://postgres:postgres@localhost:5432/doxalife}"
LIVE_URL="${LIVE_DATABASE_URL:-$(env_get LIVE_DATABASE_URL)}"

# ---------------------------------------------------------------------------
# Parse flags.
# ---------------------------------------------------------------------------
DO_DUMP=true
DO_RESTORE=true
ASSUME_YES=false

for arg in "$@"; do
  case "$arg" in
    --dump-only)    DO_RESTORE=false ;;
    --restore-only) DO_DUMP=false ;;
    -y|--yes)       ASSUME_YES=true ;;
    -h|--help)      grep '^#' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "Unknown argument: $arg" >&2; exit 2 ;;
  esac
done

# ---------------------------------------------------------------------------
# Derive the local database name and an admin connection (to the maintenance
# 'postgres' DB) so we can drop/recreate the target database.
# ---------------------------------------------------------------------------
LOCAL_NO_QUERY="${LOCAL_URL%%\?*}"          # strip any ?sslmode=... query
LOCAL_DB="${LOCAL_NO_QUERY##*/}"            # trailing path segment = db name
LOCAL_BASE="${LOCAL_NO_QUERY%/*}"           # everything before the db name
ADMIN_URL="$LOCAL_BASE/postgres"            # connect here to drop/create $LOCAL_DB

# ---------------------------------------------------------------------------
# Preflight checks.
# ---------------------------------------------------------------------------
if ! docker inspect -f '{{.State.Running}}' "$CONTAINER" >/dev/null 2>&1; then
  echo "ERROR: container '$CONTAINER' is not running. Start your local Postgres first." >&2
  exit 1
fi

if $DO_DUMP && [ -z "$LIVE_URL" ]; then
  echo "ERROR: LIVE_DATABASE_URL is not set (expected in .env)." >&2
  exit 1
fi

echo "Container : $CONTAINER"
echo "Local DB  : $LOCAL_DB  (target — will be WIPED)"
$DO_DUMP    && echo "Dump      : downloading fresh dump -> $DUMP_FILE"
$DO_RESTORE && echo "Restore   : drop + recreate '$LOCAL_DB' from dump"
echo

if $DO_RESTORE && ! $ASSUME_YES; then
  read -r -p "This will DROP and overwrite your local '$LOCAL_DB' database. Continue? [y/N] " reply
  case "$reply" in
    y|Y|yes|YES) ;;
    *) echo "Aborted."; exit 0 ;;
  esac
fi

# ---------------------------------------------------------------------------
# 1. Dump the live database (custom format, ownership/ACLs stripped so it
#    restores cleanly onto the local 'postgres' superuser).
# ---------------------------------------------------------------------------
if $DO_DUMP; then
  echo "==> Dumping live database ..."
  docker exec "$CONTAINER" pg_dump \
    --format=custom \
    --no-owner \
    --no-privileges \
    --no-tablespaces \
    --verbose \
    "$LIVE_URL" > "$DUMP_FILE"
  echo "    Wrote $(du -h "$DUMP_FILE" | cut -f1) to $DUMP_FILE"
fi

# ---------------------------------------------------------------------------
# 2. Drop and recreate the local database, then restore.
# ---------------------------------------------------------------------------
if $DO_RESTORE; then
  if [ ! -s "$DUMP_FILE" ]; then
    echo "ERROR: dump file '$DUMP_FILE' is missing or empty." >&2
    exit 1
  fi

  echo "==> Recreating local database '$LOCAL_DB' ..."
  docker exec -i "$CONTAINER" psql --quiet "$ADMIN_URL" <<SQL
DROP DATABASE IF EXISTS "$LOCAL_DB" WITH (FORCE);
CREATE DATABASE "$LOCAL_DB";
SQL

  echo "==> Restoring dump into '$LOCAL_DB' ..."
  # Stream the host dump file into the container's pg_restore over stdin.
  # --no-owner/--no-privileges again in case the dump predates those flags.
  docker exec -i "$CONTAINER" pg_restore \
    --no-owner \
    --no-privileges \
    --no-tablespaces \
    --dbname "$LOCAL_BASE/$LOCAL_DB" \
    < "$DUMP_FILE"

  echo "==> Verifying ..."
  docker exec "$CONTAINER" psql --quiet --tuples-only "$LOCAL_BASE/$LOCAL_DB" \
    -c "select 'tables: ' || count(*) from pg_tables where schemaname='public';"
fi

echo "Done."
