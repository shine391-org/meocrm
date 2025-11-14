// customers/services/customer-segmentation.service.ts

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface SegmentationRules {
  vip: { minSpent: number };  // 10,000,000 VNĐ
  loyal: { minOrders: number };  // 10 orders
  active: { maxDaysSinceOrder: number };  // 30 days
  inactive: { minDaysSinceOrder: number };  // 90 days
}

@Injectable()
export class CustomerSegmentationService {
  constructor(private prisma: PrismaService) {}

  private readonly rules: SegmentationRules = {
    vip: { minSpent: 10_000_000 },
    loyal: { minOrders: 10 },
    active: { maxDaysSinceOrder: 30 },
    inactive: { minDaysSinceOrder: 90 },
  };

  async updateSegment(customerId: string): Promise<string | null> {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        totalSpent: true,
        totalOrders: true,
        lastOrderAt: true,
      },
    });

    if (!customer) return null;

    const segment = this.calculateSegment(
      Number(customer.totalSpent),
      customer.totalOrders,
      customer.lastOrderAt
    );

    await this.prisma.customer.update({
      where: { id: customerId },
      data: { segment },
    });

    return segment;
  }

  private calculateSegment(
    totalSpent: number,
    totalOrders: number,
    lastOrderAt: Date | null
  ): string {
    // 1. Check VIP (highest priority)
    if (totalSpent >= this.rules.vip.minSpent) {
      return 'VIP';
    }

    // 2. Check Loyal
    if (totalOrders >= this.rules.loyal.minOrders) {
      return 'Loyal';
    }

    // 3. Check Active/Inactive based on last order
    if (lastOrderAt) {
      const daysSinceOrder = this.daysBetween(lastOrderAt, new Date());

      if (daysSinceOrder <= this.rules.active.maxDaysSinceOrder) {
        return 'Active';
      }

      if (daysSinceOrder >= this.rules.inactive.minDaysSinceOrder) {
        return 'Inactive';
      }
    }

    // Default: Regular
    return 'Regular';
  }

  private daysBetween(date1: Date, date2: Date): number {
    const diff = Math.abs(date2.getTime() - date1.getTime());
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  // Batch update all customers (for cron job)
  async updateAllSegments(organizationId: string): Promise<void> {
    const customers = await this.prisma.customer.findMany({
      where: { organizationId, deletedAt: null },
      select: { id: true },
    });

    for (const customer of customers) {
      await this.updateSegment(customer.id);
    }
  }
}
