#!/bin/bash
# Database Import Script
# Imports a database snapshot using env-supplied credentials.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

load_env_file() {
  local file="$1"
  if [ -f "$file" ]; then
    # shellcheck disable=SC1090
    set -a && source "$file" && set +a
  fi
}

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
  echo "Provide DB credentials through your shell/CI secrets or an ignored env file before running this script."
  exit 1
fi

# Default to latest snapshot if no file specified
IMPORT_FILE="${1:-scripts/fixtures/db_snapshot_latest.sql}"

if [ ! -f "$IMPORT_FILE" ]; then
  echo -e "${RED}✗${NC} Snapshot file not found: $IMPORT_FILE"
  echo ""
  echo "Available snapshots:"
  ls -lh scripts/fixtures/db_snapshot_*.sql 2>/dev/null || echo "  No snapshots found"
  echo ""
  echo "Usage: $0 [snapshot_file]"
  echo "  Example: $0 scripts/fixtures/db_snapshot_20250116_120000.sql"
  exit 1
fi

echo "📥 Importing database snapshot..."
echo ""
echo "  File:     $IMPORT_FILE"
echo "  Database: $DB_NAME"
echo "  Host:     $DB_HOST:$DB_PORT"
echo ""

# Confirm before proceeding
read -r -p "⚠️  This will REPLACE all data in $DB_NAME. Continue? (y/N): " choice
case "$choice" in
  y|Y) ;;
  *)
    echo "Import cancelled."
    exit 0
    ;;
esac

echo ""
echo "Importing..."

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

if psql \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  -f "$IMPORT_FILE" \
  --quiet; then
    echo -e "${GREEN}✓${NC} Database imported successfully!"
    echo ""
    echo "Next steps:"
    echo "  1. Regenerate Prisma client: ${YELLOW}pnpm --filter @meocrm/api prisma:generate${NC}"
    echo "  2. Restart API server"
    echo ""
else
    echo -e "${RED}✗${NC} Database import failed!"
    exit 1
fi
