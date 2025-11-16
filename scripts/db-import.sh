#!/bin/bash
# Database Import Script
# Imports a database snapshot

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Database connection details
DB_HOST="localhost"
DB_PORT="2001"
DB_NAME="meocrm_dev"
DB_USER="meocrm_user"
DB_PASSWORD="meocrm_dev_password"

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
read -p "⚠️  This will REPLACE all data in $DB_NAME. Continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Import cancelled."
    exit 0
fi

echo ""
echo "Importing..."

# Import database using psql
PGPASSWORD="$DB_PASSWORD" psql \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  -f "$IMPORT_FILE" \
  --quiet

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Database imported successfully!"
    echo ""
    echo "Next steps:"
    echo "  1. Regenerate Prisma client: ${YELLOW}pnpm db:generate${NC}"
    echo "  2. Restart API server"
    echo ""
else
    echo -e "${RED}✗${NC} Database import failed!"
    exit 1
fi
