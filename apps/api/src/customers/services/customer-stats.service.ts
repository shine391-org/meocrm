import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CustomerSegmentationService } from './customer-segmentation.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class CustomerStatsService {
  constructor(
    private prisma: PrismaService,
    private segmentationService: CustomerSegmentationService,
  ) {}

  async updateStatsOnOrderComplete(
    customerId: string,
    orderTotal: number,
    tx?: Prisma.TransactionClient,
    organizationId?: string,
  ): Promise<void> {
    const prisma = tx || this.prisma;

    const baseWhere: Prisma.CustomerWhereInput = {
      id: customerId,
      deletedAt: null,
    };
    if (organizationId) {
      baseWhere.organizationId = organizationId;
    }

    const customer = await prisma.customer.findFirst({
      where: baseWhere,
      select: { organizationId: true },
    });

    if (!customer) {
      throw new NotFoundException(`Customer ${customerId} not found or deleted`);
    }

    const result = await prisma.customer.updateMany({
      where: baseWhere,
      data: {
        totalSpent: { increment: orderTotal },
        totalOrders: { increment: 1 },
        lastOrderAt: new Date(),
      },
    });

    if (result.count === 0) {
      throw new BadRequestException('Customer stats not updated due to guard conditions');
    }

    if (!tx) {
      await this.segmentationService.updateSegment(customerId, customer.organizationId);
    }
  }

  async revertStatsOnOrderCancel(
    customerId: string,
    orderTotal: number,
    tx?: Prisma.TransactionClient,
    organizationId?: string,
  ): Promise<void> {
    const prisma = tx || this.prisma;

    const baseWhere: Prisma.CustomerWhereInput = {
      id: customerId,
      deletedAt: null,
    };
    if (organizationId) {
      baseWhere.organizationId = organizationId;
    }

    const customer = await prisma.customer.findFirst({
      where: baseWhere,
      select: { organizationId: true, totalSpent: true, totalOrders: true },
    });

    if (!customer) {
      throw new NotFoundException(`Customer ${customerId} not found for revert stats`);
    }

    // Try decrement with guards first
    const result = await prisma.customer.updateMany({
      where: {
        ...baseWhere,
        totalSpent: { gte: orderTotal },
        totalOrders: { gte: 1 },
      },
      data: {
        totalSpent: { decrement: orderTotal },
        totalOrders: { decrement: 1 },
      },
    });

    // If guards fail, use safe fallback to prevent negative values
    if (result.count === 0) {
      const safeSpent = Math.max(0, Number(customer.totalSpent ?? 0) - orderTotal);
      const safeOrders = Math.max(0, (customer.totalOrders ?? 0) - 1);

      await prisma.customer.updateMany({
        where: baseWhere,
        data: {
          totalSpent: safeSpent,
          totalOrders: safeOrders,
        },
      });
    }

    if (!tx) {
      await this.segmentationService.updateSegment(customerId, customer.organizationId);
    }
  }

  async updateDebt(
    customerId: string,
    amount: number,
    tx?: Prisma.TransactionClient,
    organizationId?: string,
  ): Promise<void> {
    const prisma = tx || this.prisma;

    const baseWhere: Prisma.CustomerWhereInput = {
      id: customerId,
      deletedAt: null,
    };
    if (organizationId) {
      baseWhere.organizationId = organizationId;
    }

    const customer = await prisma.customer.findFirst({
      where: baseWhere,
      select: { organizationId: true },
    });

    if (!customer) {
      throw new NotFoundException(`Customer not found for updateDebt`);
    }

    try {
      await prisma.customer.updateMany({
        where: baseWhere,
        data: {
          debt: { increment: amount },
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to update customer debt: ${message}`);
    }
  }
}
