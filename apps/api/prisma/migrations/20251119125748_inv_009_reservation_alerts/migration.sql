-- CreateEnum
CREATE TYPE "InventoryReservationAlertStatus" AS ENUM ('OPEN', 'RESOLVED');

-- CreateTable
CREATE TABLE "inventory_reservation_alerts" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "branchId" TEXT,
    "shippingOrderId" TEXT,
    "unresolvedReservations" INTEGER NOT NULL,
    "quantityHeld" INTEGER NOT NULL,
    "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
    "shippingStatus" "ShippingStatus",
    "status" "InventoryReservationAlertStatus" NOT NULL DEFAULT 'OPEN',
    "details" JSONB,
    "resolutionNote" TEXT,
    "lastDetectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_reservation_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "inventory_reservation_alerts_organizationId_idx" ON "inventory_reservation_alerts"("organizationId");

-- CreateIndex
CREATE INDEX "inventory_reservation_alerts_orderId_idx" ON "inventory_reservation_alerts"("orderId");

-- CreateIndex
CREATE INDEX "inventory_reservation_alerts_status_idx" ON "inventory_reservation_alerts"("status");

-- AddForeignKey
ALTER TABLE "inventory_reservation_alerts" ADD CONSTRAINT "inventory_reservation_alerts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_reservation_alerts" ADD CONSTRAINT "inventory_reservation_alerts_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_reservation_alerts" ADD CONSTRAINT "inventory_reservation_alerts_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_reservation_alerts" ADD CONSTRAINT "inventory_reservation_alerts_shippingOrderId_fkey" FOREIGN KEY ("shippingOrderId") REFERENCES "shipping_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
