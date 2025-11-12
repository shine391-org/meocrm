import { Injectable, BadRequestException } from '@nestjs/common';
import { AuditAction, Prisma, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

interface AuditLogPayload {
  user: Pick<User, 'id' | 'organizationId'>;
  entity: string;
  entityId: string;
  action: string;
  auditAction?: AuditAction;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async log({
    user,
    entity,
    entityId,
    action,
    auditAction = AuditAction.UPDATE,
    oldValues,
    newValues,
    ipAddress,
    userAgent,
  }: AuditLogPayload) {
    if (!user.organizationId) {
      throw new Error('Audit logs require organization context');
    }

    const normalizedNewValues: Prisma.InputJsonValue = {
      event: action,
      ...(newValues ?? {}),
    };
    const canonicalAuditAction = this.ensureValidAuditAction(auditAction);

    return this.prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        userId: user.id,
        entity,
        entityId,
        action: canonicalAuditAction,
        oldValues: (oldValues ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        newValues: normalizedNewValues,
        ipAddress,
        userAgent,
      },
    });
  }

  private ensureValidAuditAction(action: AuditAction): AuditAction {
    const allowedActions = Object.values(AuditAction) as string[];
    if (!allowedActions.includes(action)) {
      throw new BadRequestException(`Invalid audit action: ${action}`);
    }
    return action;
  }
}
