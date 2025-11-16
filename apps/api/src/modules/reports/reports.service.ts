import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestContextService } from '../../common/context/request-context.service';
import { Prisma } from '@prisma/client';

export interface GetDebtReportQuery {
  groupBy: 'day' | 'month';
  fromDate?: Date;
  toDate?: Date;
  customerId?: string;
}

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly requestContextService: RequestContextService,
  ) {}

  private getOrganizationId(): string {
    const organizationId = this.requestContextService.organizationId;
    if (!organizationId) {
      throw new UnauthorizedException('Organization context is not set.');
    }
    return organizationId;
  }

  async getDebtReport(query: GetDebtReportQuery) {
    const organizationId = this.getOrganizationId();
    const { groupBy, fromDate, toDate, customerId } = query;

    const whereConditions = [
      Prisma.sql`"organizationId" = ${organizationId}`,
    ];

    if (customerId) {
      whereConditions.push(Prisma.sql`"customerId" = ${customerId}`);
    }
    if (fromDate) {
      whereConditions.push(Prisma.sql`"capturedAt" >= ${fromDate}`);
    }
    if (toDate) {
      whereConditions.push(Prisma.sql`"capturedAt" <= ${toDate}`);
    }

    let dateTrunc;
    if (groupBy === 'day') {
      dateTrunc = 'day';
    } else if (groupBy === 'month') {
      dateTrunc = 'month';
    } else {
      throw new BadRequestException('Invalid groupBy value. Must be "day" or "month".');
    }

    const queryRaw = Prisma.sql`
      SELECT
        DATE_TRUNC(${dateTrunc}, "capturedAt") as period,
        MAX("capturedAt") as "capturedAt",
        "customerId",
        (array_agg("debtValue" ORDER BY "capturedAt" DESC))[1] as "closingDebt"
      FROM
        "customer_debt_snapshots"
      WHERE
        ${Prisma.join(whereConditions, ' AND ')}
      GROUP BY
        period,
        "customerId"
      ORDER BY
        period DESC;
    `;

    return this.prisma.$queryRaw(queryRaw);
  }
}
