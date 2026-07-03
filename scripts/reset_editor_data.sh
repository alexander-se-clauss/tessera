#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT_DIR/backend/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing env file: $ENV_FILE" >&2
  exit 1
fi

# Load backend/local Postgres settings from backend/.env.
set -a
source "$ENV_FILE"
set +a

CONTAINER_NAME="${POSTGRES_CONTAINER_NAME:-tile-postgres}"
DB_NAME="${POSTGRES_DB:?POSTGRES_DB is required in backend/.env}"
DB_USER="${POSTGRES_USER:?POSTGRES_USER is required in backend/.env}"

if ! docker ps --format '{{.Names}}' | grep -Fxq "$CONTAINER_NAME"; then
  echo "Postgres container '$CONTAINER_NAME' is not running." >&2
  exit 1
fi

echo "Deleting editor/project data from database '$DB_NAME' in container '$CONTAINER_NAME'..."
docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" <<'SQL'
BEGIN;
TRUNCATE TABLE project RESTART IDENTITY CASCADE;
COMMIT;
SQL

ASSET_IMPORTS_DIR="$ROOT_DIR/backend/data/assets/imports"
if [[ -d "$ASSET_IMPORTS_DIR" ]]; then
  echo "Deleting imported asset files under $ASSET_IMPORTS_DIR..."
  find "$ASSET_IMPORTS_DIR" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
fi

echo "Done. User accounts were preserved."
