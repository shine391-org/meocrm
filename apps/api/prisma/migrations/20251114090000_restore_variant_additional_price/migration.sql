-- Restore `additionalPrice` for product variants and remove persisted sellPrice

ALTER TABLE "product_variants"
  ADD COLUMN "additionalPrice" DECIMAL(12,2) NOT NULL DEFAULT 0;

UPDATE "product_variants" pv
SET "additionalPrice" = COALESCE(pv."sellPrice", 0) - COALESCE(p."sellPrice", 0)
FROM "products" p
WHERE pv."productId" = p."id";

ALTER TABLE "product_variants"
  DROP COLUMN "sellPrice";
