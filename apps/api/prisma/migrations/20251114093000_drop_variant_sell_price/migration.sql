-- Phase 2: drop the legacy sellPrice column after verifying additionalPrice migration
-- has completed successfully. Rollback requires re-adding sellPrice and copying the data
-- back from product + variant values, so ensure you have a database backup prior to running.

ALTER TABLE "product_variants"
  DROP COLUMN IF EXISTS "sellPrice";
