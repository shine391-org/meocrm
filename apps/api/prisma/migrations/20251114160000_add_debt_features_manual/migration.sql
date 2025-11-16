-- This file contains manual migration steps that could not be handled by Prisma Migrate.
-- Please apply these changes to the database manually.

-- 1. Add a unique constraint to prevent duplicate debt snapshots for the same customer on the same day.
-- This uses an index on an expression, which is a PostgreSQL feature.
CREATE UNIQUE INDEX "customer_debt_snapshots_unique_daily_idx"
ON "customer_debt_snapshots" ("organizationId", "customerId", (("capturedAt" AT TIME ZONE 'UTC')::date));

-- 2. Create a view for calculating runtime customer debt.
-- This view simplifies querying for real-time debt information.
CREATE OR REPLACE VIEW "vw_customer_debt_runtime" AS
SELECT
  "o"."organizationId",
  "o"."customerId",
  SUM(COALESCE("o"."total", 0) - COALESCE("o"."paidAmount", 0)) AS "debtValue"
FROM
  "orders" "o"
WHERE
  "o"."status" <> 'CANCELLED'
  AND "o"."deletedAt" IS NULL
  AND "o"."customerId" IS NOT NULL
GROUP BY
  "o"."organizationId",
  "o"."customerId";

-- AlterTable
ALTER TABLE "orders" ADD COLUMN "paidAt" TIMESTAMP(3);
