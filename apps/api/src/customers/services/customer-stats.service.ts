// customers/services/customer-stats.service.ts

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CustomerSegmentationService } from './customer-segmentation.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class CustomerStatsService {
  constructor(
    private prisma: PrismaService,
    private segmentationService: CustomerSegmentationService,
  ) {}

  /**
   * Update customer stats after order completion
   * Called by OrdersService in transaction
   */
  async updateStatsOnOrderComplete(
    customerId: string,
    orderTotal: number,
    tx?: Prisma.TransactionClient
  ): Promise<void> {
    const prisma = tx || this.prisma;

    const customer = await prisma.customer.findFirst({
      where: { id: customerId, deletedAt: null },
      select: { organizationId: true },
    });

    if (!customer) {
      return;
    }

    await prisma.customer.updateMany({
      where: {
        id: customerId,
        organizationId: customer.organizationId,
        deletedAt: null,
      },
      data: {
        totalSpent: { increment: orderTotal },
        totalOrders: { increment: 1 },
        lastOrderAt: new Date(),
      },
    });

    // Update segment (outside transaction to avoid deadlock)
    if (!tx) {
      await this.segmentationService.updateSegment(customerId, customer.organizationId);
    }
  }

  /**
   * Revert customer stats after order cancellation
   * Called by OrdersService in transaction
   */
  async revertStatsOnOrderCancel(
    customerId: string,
    orderTotal: number,
    tx?: Prisma.TransactionClient
  ): Promise<void> {
    const prisma = tx || this.prisma;

    const customer = await prisma.customer.findFirst({
      where: { id: customerId, deletedAt: null },
      select: {
        totalSpent: true,
        totalOrders: true,
        organizationId: true,
      },
    });

    if (!customer) return;

    // Decrement (but not below 0)
    const newTotalSpent = Math.max(0, Number(customer.totalSpent) - orderTotal);
    const newTotalOrders = Math.max(0, customer.totalOrders - 1);

    await prisma.customer.updateMany({
      where: {
        id: customerId,
        organizationId: customer.organizationId,
        deletedAt: null,
      },
      data: {
        totalSpent: newTotalSpent,
        totalOrders: newTotalOrders,
      },
    });

    // Update segment
    if (!tx) {
      await this.segmentationService.updateSegment(customerId, customer.organizationId);
    }
  }

  /**
   * Update debt balance
   */
  async updateDebt(
    customerId: string,
    amount: number,
    tx?: Prisma.TransactionClient
  ): Promise<void> {
    const prisma = tx || this.prisma;

    const customer = await prisma.customer.findFirst({
      where: { id: customerId, deletedAt: null },
      select: { organizationId: true },
    });

    if (!customer) {
      return;
    }

    await prisma.customer.updateMany({
      where: {
        id: customerId,
        organizationId: customer.organizationId,
        deletedAt: null,
      },
      data: {
        debt: { increment: amount },
      },
    });
  }
}
