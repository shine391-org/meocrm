import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { UserRole } from '@prisma/client';

interface RequestUser {
  id: string;
  email: string;
  organizationId: string;
  role: UserRole;
}

interface RequestWithUser extends Request {
  user?: RequestUser;
}

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user: RequestUser | undefined = request.user;

    if (!user || !user.role) {
      throw new ForbiddenException('User role could not be determined');
    }

    if (user.role !== UserRole.ADMIN && user.role !== UserRole.OWNER) {
      throw new ForbiddenException('Admin access required');
    }

    return true;
  }
}
