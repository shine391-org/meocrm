import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * OrganizationGuard ensures that the authenticated user has an organizationId
 * and makes it available in the request context.
 *
 * This guard should be used after JwtAuthGuard to verify that the user
 * belongs to an organization.
 *
 * Usage:
 * @UseGuards(JwtAuthGuard, OrganizationGuard)
 */
@Injectable()
export class OrganizationGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    if (!user.organizationId) {
      throw new ForbiddenException('User does not belong to an organization');
    }

    // Make organizationId easily accessible in request
    request.organizationId = user.organizationId;

    return true;
  }
}
