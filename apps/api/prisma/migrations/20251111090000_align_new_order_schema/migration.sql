-- Align schema with new order/product/auth requirements

-- Organization code for tenant onboarding
ALTER TABLE "organizations" ADD COLUMN "code" TEXT;
UPDATE "organizations" SET "code" = "slug" WHERE "code" IS NULL;
ALTER TABLE "organizations" ALTER COLUMN "code" SET NOT NULL;
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_code_key" UNIQUE ("code");

-- Soft delete for customers
ALTER TABLE "customers" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- Optional product description
ALTER TABLE "products" ADD COLUMN "description" TEXT;

-- Extend product variants for pricing + tenancy
ALTER TABLE "product_variants"
  ADD COLUMN "organizationId" TEXT,
  ADD COLUMN "sellPrice" DECIMAL(12,2),
  ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "attributes" JSONB,
  ADD COLUMN "deletedAt" TIMESTAMP(3);

UPDATE "product_variants" pv
SET "organizationId" = p."organizationId",
    "sellPrice" = p."sellPrice" + COALESCE(pv."additionalPrice", 0)
FROM "products" p
WHERE pv."productId" = p."id";

ALTER TABLE "product_variants"
  ALTER COLUMN "organizationId" SET NOT NULL,
  ALTER COLUMN "sellPrice" SET NOT NULL;

ALTER TABLE "product_variants"
  ADD CONSTRAINT "product_variants_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE;

ALTER TABLE "product_variants" DROP COLUMN "additionalPrice";
CREATE INDEX "product_variants_organizationId_idx" ON "product_variants"("organizationId");

-- Order financial columns + soft delete
ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "tax" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "shipping" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "notes" TEXT,
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

-- Expand order status enum
DO $$
DECLARE
  order_status_type oid := to_regtype('"OrderStatus"');
BEGIN
  IF order_status_type IS NULL THEN
    RAISE EXCEPTION 'OrderStatus enum is missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'CONFIRMED' AND enumtypid = order_status_type) THEN
    ALTER TYPE "OrderStatus" ADD VALUE 'CONFIRMED';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'SHIPPED' AND enumtypid = order_status_type) THEN
    ALTER TYPE "OrderStatus" ADD VALUE 'SHIPPED';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'DELIVERED' AND enumtypid = order_status_type) THEN
    ALTER TYPE "OrderStatus" ADD VALUE 'DELIVERED';
  END IF;
END
$$;

-- Rebuild order items structure
ALTER TABLE "order_items"
  ADD COLUMN "organizationId" TEXT,
  ADD COLUMN "variantId" TEXT,
  ADD COLUMN "unitPrice" DECIMAL(12,2),
  ADD COLUMN "subtotal" DECIMAL(12,2);

UPDATE "order_items" oi
SET "organizationId" = o."organizationId"
FROM "orders" o
WHERE oi."orderId" = o."id";

UPDATE "order_items"
SET "unitPrice" = COALESCE("price", 0),
    "subtotal" = COALESCE("lineTotal", 0);

ALTER TABLE "order_items"
  ALTER COLUMN "organizationId" SET NOT NULL,
  ALTER COLUMN "unitPrice" SET NOT NULL,
  ALTER COLUMN "subtotal" SET NOT NULL;

ALTER TABLE "order_items"
  ADD CONSTRAINT "order_items_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE;

ALTER TABLE "order_items"
  ADD CONSTRAINT "order_items_variantId_fkey"
    FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE SET NULL;

ALTER TABLE "order_items"
  DROP COLUMN "discount",
  DROP COLUMN "lineTotal",
  DROP COLUMN "price";

CREATE INDEX "order_items_organizationId_idx" ON "order_items"("organizationId");
CREATE INDEX "order_items_variantId_idx" ON "order_items"("variantId");

-- Refresh tokens table for auth
CREATE TABLE "refresh_tokens" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");
