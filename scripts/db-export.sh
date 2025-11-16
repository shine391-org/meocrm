#!/bin/bash
# Database Export Script
# Exports the current database to a snapshot file

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Database connection details
DB_HOST="localhost"
DB_PORT="2001"
DB_NAME="meocrm_dev"
DB_USER="meocrm_user"
DB_PASSWORD="meocrm_dev_password"

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
PGPASSWORD="$DB_PASSWORD" pg_dump \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  --format=plain \
  --file="$EXPORT_FILE"

if [ $? -eq 0 ]; then
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
else
    echo -e "${RED}✗${NC} Database export failed!"
    exit 1
fi
