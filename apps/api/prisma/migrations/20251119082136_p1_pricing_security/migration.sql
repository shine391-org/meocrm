-- CreateEnum
CREATE TYPE "OrderInventoryReservationStatus" AS ENUM ('RESERVED', 'RELEASED', 'RETURNED');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('PERCENT', 'FIXED');

-- DropForeignKey
ALTER TABLE "webhooks" DROP CONSTRAINT "webhooks_organizationId_fkey";

-- DropIndex
DROP INDEX "customers_organizationId_id_key";

-- DropIndex
DROP INDEX "product_variants_sku_key";

-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "discountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "discountType" "DiscountType",
ADD COLUMN     "discountValue" DECIMAL(12,2),
ADD COLUMN     "isTaxExempt" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "netTotal" DECIMAL(12,2) NOT NULL;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "branchId" TEXT,
ADD COLUMN     "taxBreakdown" JSONB,
ADD COLUMN     "taxableSubtotal" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "product_variants" DROP COLUMN "attributes",
DROP COLUMN "isActive";

-- AlterTable
ALTER TABLE "shipping_orders" ADD COLUMN     "distanceKm" INTEGER,
ADD COLUMN     "failedReason" TEXT,
ADD COLUMN     "feeBreakdown" JSONB,
ADD COLUMN     "retryCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "returnReason" TEXT,
ADD COLUMN     "serviceType" TEXT;

-- CreateTable
CREATE TABLE "order_inventory_reservations" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "variantReservedQuantity" INTEGER NOT NULL DEFAULT 0,
    "quantity" INTEGER NOT NULL,
    "status" "OrderInventoryReservationStatus" NOT NULL DEFAULT 'RESERVED',
    "reservationAdjustmentId" TEXT,
    "releaseAdjustmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_inventory_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "order_inventory_reservations_orderId_idx" ON "order_inventory_reservations"("orderId");

-- CreateIndex
CREATE INDEX "order_inventory_reservations_orderItemId_idx" ON "order_inventory_reservations"("orderItemId");

-- CreateIndex
CREATE INDEX "order_inventory_reservations_branchId_idx" ON "order_inventory_reservations"("branchId");

-- CreateIndex
CREATE INDEX "order_inventory_reservations_productId_idx" ON "order_inventory_reservations"("productId");

-- CreateIndex
CREATE INDEX "order_inventory_reservations_variantId_idx" ON "order_inventory_reservations"("variantId");

-- CreateIndex
CREATE INDEX "order_inventory_reservations_organizationId_idx" ON "order_inventory_reservations"("organizationId");

-- CreateIndex
CREATE INDEX "orders_branchId_idx" ON "orders"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_sku_organizationId_key" ON "product_variants"("sku", "organizationId");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_inventory_reservations" ADD CONSTRAINT "order_inventory_reservations_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_inventory_reservations" ADD CONSTRAINT "order_inventory_reservations_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_inventory_reservations" ADD CONSTRAINT "order_inventory_reservations_reservationAdjustmentId_fkey" FOREIGN KEY ("reservationAdjustmentId") REFERENCES "stock_adjustments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_inventory_reservations" ADD CONSTRAINT "order_inventory_reservations_releaseAdjustmentId_fkey" FOREIGN KEY ("releaseAdjustmentId") REFERENCES "stock_adjustments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "customer_debt_snapshots_organizationId_customerId_capturedAt_ke" RENAME TO "customer_debt_snapshots_organizationId_customerId_capturedA_key";

