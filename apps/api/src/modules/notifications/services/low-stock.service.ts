
// ... imports

@Injectable()
export class LowStockService {
  // ... constructor

  private async sendLowStockDigest(orgId: string, botToken: string, chatId: string): Promise<void> {
    const lowStockItems = await this.prisma.$queryRaw`
        SELECT * FROM "products"
        WHERE "organizationId" = ${orgId}
        AND "isActive" = true
        AND "deletedAt" IS NULL
        AND "stock" < "minStock";
    `;

    if (lowStockItems.length === 0) {
      this.logger.log(`No low stock items for organization ${orgId}.`);
      return;
    }

    // ... rest of the function
  }
}
