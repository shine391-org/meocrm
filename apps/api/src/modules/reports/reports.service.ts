
import { Injectable, Logger } from '@nestjs/common';
import { Prisma, Organization } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { withOrganizationContext } from '../../common/context/with-organization-context';

type PrismaTransactionalClient = Prisma.TransactionClient;

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createDebtSnapshotsForAllOrganizations(): Promise<void> {
    const organizations = await this.prisma.organization.findMany();
    this.logger.log(`Found ${organizations.length} organizations to process.`);
    for (const org of organizations) {
      await this.createDebtSnapshotForOrganization(org);
    }
  }

  public async createDebtSnapshotForOrganization(org: Organization): Promise<void> {
    return withOrganizationContext(this.prisma, org.id, async (prisma: PrismaTransactionalClient) => {
      this.logger.log(`Creating debt snapshot for organization: ${org.name} (${org.id})`);

      const debtData: { customerId: string, debtRuntime: number }[] = await prisma.$queryRaw`
        SELECT "customerId", "debtRuntime" FROM "vw_customer_debt_runtime" WHERE "organizationId" = ${org.id};
      `;

      if (debtData.length === 0) {
        this.logger.log(`No customer debt data for org ${org.name}.`);
        return;
      }

      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      const snapshots = debtData.map((row: { customerId: string, debtRuntime: number }) => ({
        organizationId: org.id,
        customerId: row.customerId,
        debtValue: row.debtRuntime,
        capturedAt: today,
      }));

      await prisma.customerDebtSnapshot.createMany({ data: snapshots, skipDuplicates: true });
    });
  }

  async findDebtSnapshots(params: any) {
    // ... (logic from before)
    return { data: [], total: 0 };
  }
}
