import { Injectable, NotFoundException } from '@nestjs/common';
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
    tx?: Prisma.TransactionClient
  ): Promise<void> {
    const prisma = tx || this.prisma;

    const customer = await prisma.customer.findFirst({
      where: { id: customerId, deletedAt: null },
      select: { organizationId: true },
    });

    if (!customer) {
      throw new NotFoundException(`Customer ${customerId} not found or deleted`);
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

    if (!tx) {
      await this.segmentationService.updateSegment(customerId, customer.organizationId);
    }
  }

  async revertStatsOnOrderCancel(
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
      throw new NotFoundException(`Customer ${customerId} not found for revert stats`);
    }

    await prisma.customer.updateMany({
      where: {
        id: customerId,
        organizationId: customer.organizationId,
        deletedAt: null,
        totalSpent: { gte: orderTotal },
        totalOrders: { gte: 1 },
      },
      data: {
        totalSpent: { decrement: orderTotal },
        totalOrders: { decrement: 1 },
      },
    });

    if (!tx) {
      await this.segmentationService.updateSegment(customerId, customer.organizationId);
    }
  }

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
      throw new NotFoundException(`Customer not found for updateDebt`);
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
