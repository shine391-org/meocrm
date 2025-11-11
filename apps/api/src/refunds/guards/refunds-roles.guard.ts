import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { User } from '@prisma/client';
import { SettingsService } from '../../modules/settings/settings.service';

@Injectable()
export class RefundsRolesGuard implements CanActivate {
  constructor(private readonly settingsService: SettingsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as User;

    if (!user || !user.role) {
      throw new ForbiddenException({
        code: 'USER_ROLE_NOT_FOUND',
        message: 'User role could not be determined.',
      });
    }

    const allowedRoles = await this.settingsService.get('refund.approvals', {
      // tenantId: user.organizationId,
      role: user.role,
    });

    if (!Array.isArray(allowedRoles) || !allowedRoles.includes(user.role)) {
      throw new ForbiddenException({
        code: 'REFUND_APPROVAL_REQUIRED',
        message:
          'You do not have the required permissions to approve or reject refunds.',
      });
    }

    return true;
  }
}
