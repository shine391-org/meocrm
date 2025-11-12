import { Reflector } from '@nestjs/core';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RequestContextService } from '../../common/context/request-context.service';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  const reflector: Partial<Reflector> = {
    getAllAndOverride: jest.fn(),
  };
  const requestContext: Partial<RequestContextService> = {
    setContext: jest.fn(),
  };

  const contextMock = {
    getHandler: jest.fn(),
    getClass: jest.fn(),
  } as unknown as ExecutionContext;

  beforeEach(() => {
    guard = new JwtAuthGuard(reflector as Reflector, requestContext as RequestContextService);
    (reflector.getAllAndOverride as jest.Mock).mockReset();
    (requestContext.setContext as jest.Mock).mockReset();
  });

  it('returns true immediately for public routes', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(true);
    expect(guard.canActivate(contextMock)).toBe(true);
  });

  it('delegates non-public routes to the base AuthGuard', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(false);
    const superProto = Object.getPrototypeOf(JwtAuthGuard.prototype);
    const superSpy = jest.spyOn(superProto, 'canActivate').mockReturnValue(true);

    expect(guard.canActivate(contextMock)).toBe(true);
    expect(superSpy).toHaveBeenCalledWith(contextMock);
    superSpy.mockRestore();
  });

  it('throws UnauthorizedException when request is unauthenticated', () => {
    expect(() => guard.handleRequest(null, null)).toThrow(UnauthorizedException);
  });

  it('sets request context when user is valid', () => {
    const user = { id: 'user_1', organizationId: 'org_1', role: 'OWNER' };

    const result = guard.handleRequest(null, user);

    expect(requestContext.setContext).toHaveBeenCalledWith({
      userId: 'user_1',
      organizationId: 'org_1',
      roles: ['OWNER'],
    });
    expect(result).toBe(user);
  });
});
