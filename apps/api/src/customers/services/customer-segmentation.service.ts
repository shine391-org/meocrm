import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SettingsService } from '../../modules/settings/settings.service';

type SegmentField = 'totalSpent' | 'totalOrders' | 'daysSinceLastOrder' | 'daysSinceCreated';
type SegmentOperator = '>' | '>=' | '<' | '<=' | '==' | '!=';

interface SegmentCondition {
  field: SegmentField;
  operator: SegmentOperator;
  value: number;
}

interface SegmentConfig {
  id: string;
  name: string;
  autoApply: boolean;
  priority?: number;
  conditions: SegmentCondition[];
}

export interface CustomerSegmentationSettings {
  enabled: boolean;
  fallback?: string;
  segments: SegmentConfig[];
}

type CustomerSnapshot = {
  id: string;
  organizationId: string;
  totalSpent: Prisma.Decimal | number | null;
  totalOrders: number | null;
  lastOrderAt: Date | null;
  createdAt: Date;
  segment: string | null;
};

export const DEFAULT_SEGMENTATION_SETTINGS: CustomerSegmentationSettings = {
  enabled: true,
  fallback: 'Regular',
  segments: [
    {
      id: 'VIP',
      name: 'VIP',
      autoApply: true,
      priority: 1,
      conditions: [{ field: 'totalSpent', operator: '>=', value: 10_000_000 }],
    },
    {
      id: 'Loyal',
      name: 'Loyal',
      autoApply: true,
      priority: 2,
      conditions: [{ field: 'totalOrders', operator: '>=', value: 10 }],
    },
    {
      id: 'Active',
      name: 'Active',
      autoApply: true,
      priority: 3,
      conditions: [{ field: 'daysSinceLastOrder', operator: '<=', value: 30 }],
    },
    {
      id: 'Inactive',
      name: 'Inactive',
      autoApply: true,
      priority: 4,
      conditions: [{ field: 'daysSinceLastOrder', operator: '>=', value: 90 }],
    },
  ],
};

@Injectable()
export class CustomerSegmentationService {
  private readonly logger = new Logger(CustomerSegmentationService.name);

  constructor(
    private prisma: PrismaService,
    private settingsService: SettingsService,
  ) {}

  async updateSegment(customerId: string, organizationIdHint?: string): Promise<string | null> {
    const customer = await this.prisma.customer.findFirst({
      where: {
        id: customerId,
        deletedAt: null,
        ...(organizationIdHint ? { organizationId: organizationIdHint } : {}),
      },
      select: {
        id: true,
        organizationId: true,
        totalSpent: true,
        totalOrders: true,
        lastOrderAt: true,
        createdAt: true,
        segment: true,
      },
    });

    if (!customer) {
      return null;
    }

    const segmentation =
      (await this.settingsService.getForOrganization<CustomerSegmentationSettings>(
        customer.organizationId,
        'customerSegmentation',
        DEFAULT_SEGMENTATION_SETTINGS,
      )) ?? DEFAULT_SEGMENTATION_SETTINGS;

    if (!segmentation.enabled) {
      return customer.segment;
    }

    const segment = this.determineSegment(customer, segmentation);

    if (!segment || segment === customer.segment) {
      return customer.segment ?? segment;
    }

    await this.prisma.customer.update({
      where: {
        organizationId_id: {
          id: customer.id,
          organizationId: customer.organizationId,
        },
      },
      data: { segment },
    });

    return segment;
  }

  async updateAllSegments(organizationId: string): Promise<void> {
    const customers = await this.prisma.customer.findMany({
      where: { organizationId, deletedAt: null },
      select: { id: true },
    });

    for (const customer of customers) {
      await this.updateSegment(customer.id, organizationId);
    }
  }

  private determineSegment(customer: CustomerSnapshot, config: CustomerSegmentationSettings): string {
    const orderedSegments = [...config.segments].sort(
      (a, b) => (a.priority ?? Number.MAX_SAFE_INTEGER) - (b.priority ?? Number.MAX_SAFE_INTEGER),
    );

    for (const segment of orderedSegments) {
      if (!segment.autoApply) {
        continue;
      }

      const matches = segment.conditions.every((condition) => this.evaluateCondition(customer, condition));
      if (matches) {
        return segment.name ?? segment.id;
      }
    }

    return config.fallback ?? 'Regular';
  }

  private evaluateCondition(customer: CustomerSnapshot, condition: SegmentCondition): boolean {
    const metric = this.getMetric(customer, condition.field);

    if (metric === null || metric === undefined) {
      return false;
    }

    switch (condition.operator) {
      case '>':
        return metric > condition.value;
      case '>=':
        return metric >= condition.value;
      case '<':
        return metric < condition.value;
      case '<=':
        return metric <= condition.value;
      case '==':
        return metric === condition.value;
      case '!=':
        return metric !== condition.value;
      default:
        return false;
    }
  }

  private getMetric(customer: CustomerSnapshot, field: SegmentField): number | null {
    switch (field) {
      case 'totalSpent':
        return Number(customer.totalSpent ?? 0);
      case 'totalOrders':
        return customer.totalOrders ?? 0;
      case 'daysSinceLastOrder':
        return customer.lastOrderAt ? this.daysBetween(customer.lastOrderAt, new Date()) : null;
      case 'daysSinceCreated':
        return this.daysBetween(customer.createdAt, new Date());
      default:
        return null;
    }
  }

  private daysBetween(date1: Date, date2: Date): number {
    const diff = Math.abs(date2.getTime() - date1.getTime());
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }
}
