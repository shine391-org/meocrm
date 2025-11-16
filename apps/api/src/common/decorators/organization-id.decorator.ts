import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorator to extract organizationId from the authenticated user in the request.
 *
 * This should be used with JwtAuthGuard and OrganizationGuard to ensure
 * the user is authenticated and belongs to an organization.
 *
 * Usage:
 * @Get()
 * @UseGuards(JwtAuthGuard, OrganizationGuard)
 * async findAll(@OrganizationId() organizationId: string) {
 *   // ...
 * }
 */
export const OrganizationId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.organizationId || request.organizationId;
  },
);
