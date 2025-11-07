import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

export interface RequestWithTenant extends Request {
  tenantId?: string;
}

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: RequestWithTenant, res: Response, next: NextFunction) {
    // Extract tenant from JWT (set by JwtStrategy)
    const user = (req as any).user;
    
    if (user && user.organizationId) {
      req.tenantId = user.organizationId;
    }
    
    // Allow auth endpoints to pass without tenant
    const publicPaths = ['/auth/login', '/auth/register', '/health', '/'];
    const isPublicPath = publicPaths.some(path => req.path.startsWith(path));
    
    if (!isPublicPath && !req.tenantId) {
      // For non-public paths, tenant is required (but will be checked by JwtAuthGuard)
      // This middleware just sets tenantId if user exists
    }
    
    next();
  }
}
