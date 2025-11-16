-- CreateEnum
CREATE TYPE "CommissionSource" AS ENUM ('POS', 'COD');

-- CreateEnum
CREATE TYPE "LeadPriority" AS ENUM ('HIGH', 'MEDIUM', 'LOW', 'INACTIVE');

-- AlterEnum
BEGIN;
CREATE TYPE "CommissionStatus_new" AS ENUM ('PENDING', 'APPROVED', 'PAID');
ALTER TABLE "public"."commissions" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "commissions" ALTER COLUMN "status" TYPE "CommissionStatus_new" USING ("status"::text::"CommissionStatus_new");
ALTER TYPE "CommissionStatus" RENAME TO "CommissionStatus_old";
ALTER TYPE "CommissionStatus_new" RENAME TO "CommissionStatus";
DROP TYPE "public"."CommissionStatus_old";
ALTER TABLE "commissions" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "CommissionType_new" AS ENUM ('FLAT', 'TIERED', 'BONUS');
ALTER TABLE "commission_rules" ALTER COLUMN "type" TYPE "CommissionType_new" USING ("type"::text::"CommissionType_new");
ALTER TYPE "CommissionType" RENAME TO "CommissionType_old";
ALTER TYPE "CommissionType_new" RENAME TO "CommissionType";
DROP TYPE "public"."CommissionType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "commissions" DROP CONSTRAINT "commissions_ruleId_fkey";

-- DropForeignKey
ALTER TABLE "commissions" DROP CONSTRAINT "commissions_userId_fkey";

-- DropIndex
DROP INDEX "commissions_orderId_idx";

-- DropIndex
DROP INDEX "commissions_ruleId_idx";

-- DropIndex
DROP INDEX "commissions_userId_idx";

-- AlterTable
ALTER TABLE "commission_rules" DROP COLUMN "applicableCategories",
DROP COLUMN "description",
DROP COLUMN "fixedAmount",
DROP COLUMN "minOrderValue",
DROP COLUMN "rate",
ADD COLUMN     "code" TEXT NOT NULL,
ADD COLUMN     "config" JSONB NOT NULL;

-- AlterTable
ALTER TABLE "commissions" DROP COLUMN "orderValue",
DROP COLUMN "rate",
DROP COLUMN "userId",
ADD COLUMN     "adjustsCommissionId" TEXT,
ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'VND',
ADD COLUMN     "customerId" TEXT,
ADD COLUMN     "isAdjustment" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "organizationId" TEXT NOT NULL DEFAULT 'UNKNOWN',
ADD COLUMN     "periodMonth" TEXT NOT NULL,
ADD COLUMN     "ratePercent" DECIMAL(5,2) NOT NULL,
ADD COLUMN     "source" "CommissionSource" NOT NULL,
ADD COLUMN     "split" JSONB NOT NULL,
ADD COLUMN     "traceId" TEXT,
ADD COLUMN     "valueGross" DECIMAL(18,2) NOT NULL,
ADD COLUMN     "valueNet" DECIMAL(18,2) NOT NULL,
ALTER COLUMN "ruleId" DROP NOT NULL,
ALTER COLUMN "amount" SET DATA TYPE DECIMAL(18,2);

-- Backfill organizationId for existing commissions
UPDATE "commissions" c SET "organizationId" = o."organizationId"
FROM "orders" o
WHERE c."orderId" = o.id AND c."organizationId" = 'UNKNOWN';

-- AlterTable
ALTER TABLE "commissions" ALTER COLUMN "organizationId" DROP DEFAULT;

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "code" TEXT,
    "priorityAuto" "LeadPriority" NOT NULL DEFAULT 'HIGH',
    "priorityManual" "LeadPriority",
    "priorityUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedToId" TEXT,
    "assignmentStrategy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "leads_organizationId_idx" ON "leads"("organizationId");

-- CreateIndex
CREATE INDEX "leads_organizationId_assignedToId_idx" ON "leads"("organizationId", "assignedToId");

-- CreateIndex
CREATE INDEX "leads_organizationId_priorityAuto_idx" ON "leads"("organizationId", "priorityAuto");

-- CreateIndex
CREATE UNIQUE INDEX "leads_organizationId_code_key" ON "leads"("organizationId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "commission_rules_organizationId_code_key" ON "commission_rules"("organizationId", "code");

-- CreateIndex
CREATE INDEX "commissions_organizationId_periodMonth_idx" ON "commissions"("organizationId", "periodMonth");

-- CreateIndex
CREATE INDEX "commissions_organizationId_orderId_idx" ON "commissions"("organizationId", "orderId");

-- CreateIndex
CREATE INDEX "commissions_organizationId_status_idx" ON "commissions"("organizationId", "status");

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "commission_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_adjustsCommissionId_fkey" FOREIGN KEY ("adjustsCommissionId") REFERENCES "commissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
