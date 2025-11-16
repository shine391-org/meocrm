import { RequestContextService } from './request-context.service';

describe('RequestContextService', () => {
  let service: RequestContextService;

  beforeEach(() => {
    service = new RequestContextService();
  });

  it('ignores setContext when store not initialized', () => {
    expect(() => service.setContext({ userId: 'user_1' })).not.toThrow();
    expect(service.getContext()).toBeUndefined();
  });

  it('stores and retrieves context values within run scope', async () => {
    const result = await service.withOrganizationContext('org_1', async () => {
      expect(service.organizationId).toBe('org_1');
      service.setContext({ userId: 'user_1', roles: ['OWNER'] });
      return service.getContext();
    });

    expect(result).toEqual(
      expect.objectContaining({
        userId: 'user_1',
        organizationId: 'org_1',
        roles: ['OWNER'],
      }),
    );
  });
});
