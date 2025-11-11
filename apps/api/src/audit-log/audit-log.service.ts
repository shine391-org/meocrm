import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';

@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async log(
    userId: string,
    action: string,
    targetId: string,
    targetType: string,
    details: object = {},
  ) {
    return this.prisma.auditLog.create({
      data: {
        userId,
        action,
        targetId,
        targetType,
        details,
      },
    });
  }
}
