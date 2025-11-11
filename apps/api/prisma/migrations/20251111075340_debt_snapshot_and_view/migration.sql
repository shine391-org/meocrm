-- Create Customer Debt Snapshot Table
CREATE TABLE "customer_debt_snapshots" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "debtValue" DECIMAL(18, 2) NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_debt_snapshots_pkey" PRIMARY KEY ("id")
);

-- Create Customer Debt Runtime View
CREATE VIEW "vw_customer_debt_runtime" AS
SELECT
    "c"."id" AS "customerId",
    "c"."organizationId",
    COALESCE(SUM("o"."total" - "o"."paidAmount"), 0) AS "debtRuntime"
FROM
    "customers" "c"
LEFT JOIN
    "orders" "o" ON "c"."id" = "o"."customerId" AND "o"."status" <> 'CANCELLED'
GROUP BY
    "c"."id", "c"."organizationId";

-- Create Indexes for Customer Debt Snapshot Table
CREATE INDEX "customer_debt_snapshots_organizationId_capturedAt_idx" ON "customer_debt_snapshots"("organizationId", "capturedAt");
CREATE UNIQUE INDEX "customer_debt_snapshots_organizationId_customerId_capturedAt_key" ON "customer_debt_snapshots"("organizationId", "customerId", "capturedAt");
