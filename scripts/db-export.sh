#!/bin/bash
# Database Export Script
# Exports the current database to a snapshot file using env-supplied credentials.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

load_env_file() {
  local file="$1"
  if [ -f "$file" ]; then
    # shellcheck disable=SC1090
    set -a && source "$file" && set +a
  fi
}

# Allow developers to keep secrets in ignored env files.
load_env_file ".env.local"
load_env_file ".env"

REQUIRED_VARS=(DB_HOST DB_PORT DB_NAME DB_USER DB_PASSWORD)
MISSING=()
for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var:-}" ]; then
    MISSING+=("$var")
  fi
done

if [ "${#MISSING[@]}" -gt 0 ]; then
  echo -e "${RED}✗${NC} Missing required environment variables: ${MISSING[*]}"
  echo "Provide them via your shell, CI secrets, or an env file that is excluded from version control."
  exit 1
fi

create_pgpass_file() {
  local file
  file="$(mktemp)"
  chmod 600 "$file"
  echo "${DB_HOST}:${DB_PORT}:${DB_NAME}:${DB_USER}:${DB_PASSWORD}" > "$file"
  echo "$file"
}

PGPASSFILE="$(create_pgpass_file)"
trap 'rm -f "$PGPASSFILE"' EXIT
export PGPASSFILE

# Export directory
EXPORT_DIR="scripts/fixtures"
mkdir -p "$EXPORT_DIR"

# Generate filename with timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
EXPORT_FILE="$EXPORT_DIR/db_snapshot_${TIMESTAMP}.sql"

echo "📦 Exporting database..."
echo ""
echo "  Database: $DB_NAME"
echo "  Host:     $DB_HOST:$DB_PORT"
echo "  File:     $EXPORT_FILE"
echo ""

# Export database using pg_dump
if pg_dump \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  --format=plain \
  --file="$EXPORT_FILE"; then
    # Get file size
    FILE_SIZE=$(du -h "$EXPORT_FILE" | cut -f1)

    echo -e "${GREEN}✓${NC} Database exported successfully!"
    echo ""
    echo "  File: $EXPORT_FILE"
    echo "  Size: $FILE_SIZE"
    echo ""

    # Create a symlink to latest export
    LATEST_LINK="$EXPORT_DIR/db_snapshot_latest.sql"
    ln -sf "$(basename "$EXPORT_FILE")" "$LATEST_LINK"
    echo -e "${GREEN}✓${NC} Created symlink: $LATEST_LINK"
    echo ""
    echo "To restore this snapshot, run:"
    echo "  ${YELLOW}./scripts/db-import.sh $EXPORT_FILE${NC}"
    echo ""
    echo "Or restore the latest snapshot:"
    echo "  ${YELLOW}./scripts/db-import.sh${NC}"
    echo ""
else
    echo -e "${RED}✗${NC} Database export failed!"
    exit 1
fi
