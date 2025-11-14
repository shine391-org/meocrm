-- Customers enrichment: add birthday/creator + tenant uniques

-- Drop legacy global unique constraint on customer code
DROP INDEX IF EXISTS "customers_code_key";

-- Add optional profile fields
ALTER TABLE "customers"
  ADD COLUMN "birthday" TIMESTAMP(3),
  ADD COLUMN "creatorId" TEXT;

-- Ensure codes are unique per organization and allow multi-tenant scoped updates
CREATE UNIQUE INDEX "customers_organizationId_code_key" ON "customers"("organizationId", "code");
CREATE UNIQUE INDEX "customers_organizationId_id_key" ON "customers"("organizationId", "id");

-- Speed up queries filtering by creator
CREATE INDEX "customers_creatorId_idx" ON "customers"("creatorId");

-- Link customers to their creator user (soft relation)
ALTER TABLE "customers"
  ADD CONSTRAINT "customers_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
