-- Phase 1: reintroduce `additionalPrice` for variants while keeping `sellPrice`
-- to allow verification before removing the legacy column.

ALTER TABLE "product_variants"
  ADD COLUMN "additionalPrice" DECIMAL(12,2) NOT NULL DEFAULT 0;

UPDATE "product_variants" pv
SET "additionalPrice" = CASE
  WHEN pv."sellPrice" IS NULL THEN 0
  WHEN p."sellPrice" IS NULL THEN pv."sellPrice"
  ELSE pv."sellPrice" - p."sellPrice"
END
FROM "products" p
WHERE pv."productId" = p."id";
