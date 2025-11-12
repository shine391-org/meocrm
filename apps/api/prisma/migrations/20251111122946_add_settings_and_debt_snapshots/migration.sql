-- DropForeignKey
ALTER TABLE "order_items" DROP CONSTRAINT "order_items_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "order_items" DROP CONSTRAINT "order_items_variantId_fkey";

-- DropForeignKey
ALTER TABLE "product_variants" DROP CONSTRAINT "product_variants_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "refresh_tokens" DROP CONSTRAINT "refresh_tokens_userId_fkey";

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "completedAt" TIMESTAMP(3);

-- Backfill completedAt using updatedAt for completed/delivered orders
UPDATE "orders"
SET "completedAt" = COALESCE("completedAt", "updatedAt")
WHERE "status" IN ('COMPLETED','DELIVERED');

-- CreateTable
CREATE TABLE "settings" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_debt_snapshots" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "debtValue" DECIMAL(14,2) NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_debt_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhooks" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "events" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "secretEncrypted" JSONB,

    CONSTRAINT "webhooks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "settings_organizationId_idx" ON "settings"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "settings_organizationId_key_key" ON "settings"("organizationId", "key");

-- CreateIndex
CREATE INDEX "customer_debt_snapshots_organizationId_customerId_idx" ON "customer_debt_snapshots"("organizationId", "customerId");

-- Keep earliest id, drop duplicates prior to enforcing unique constraint
WITH dups AS (
    SELECT
        "id",
        ROW_NUMBER() OVER (PARTITION BY "organizationId", "customerId", "capturedAt" ORDER BY "id") AS rn
    FROM "customer_debt_snapshots"
)
DELETE FROM "customer_debt_snapshots"
WHERE "id" IN (SELECT "id" FROM dups WHERE rn > 1);

-- CreateIndex
CREATE UNIQUE INDEX "customer_debt_snapshots_organizationId_customerId_capturedAt_key" ON "customer_debt_snapshots"("organizationId", "customerId", "capturedAt");

-- CreateIndex
CREATE INDEX "webhooks_organizationId_idx" ON "webhooks"("organizationId");

-- Encrypt existing webhook secrets into JSONB payloads
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'webhooks' AND column_name = 'secret'
    ) THEN
        EXECUTE 'UPDATE "webhooks"
                 SET "secretEncrypted" = jsonb_build_object(''legacySecret'', "secret")
                 WHERE "secret" IS NOT NULL';
    END IF;
END
$$;

-- Enforce non-null JSON storage and drop plaintext column
ALTER TABLE "webhooks" ALTER COLUMN "secretEncrypted" SET NOT NULL;
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'webhooks' AND column_name = 'secret'
    ) THEN
        EXECUTE 'ALTER TABLE "webhooks" DROP COLUMN "secret"';
    END IF;
END
$$;

-- AddForeignKey
ALTER TABLE "settings" ADD CONSTRAINT "settings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_debt_snapshots" ADD CONSTRAINT "customer_debt_snapshots_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_debt_snapshots" ADD CONSTRAINT "customer_debt_snapshots_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
