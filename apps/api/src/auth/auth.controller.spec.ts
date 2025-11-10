import 'reflect-metadata';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  beforeEach(() => {
    authService = {
      register: jest.fn(),
      login: jest.fn(),
      refreshAccessToken: jest.fn(),
      logout: jest.fn(),
      getCurrentUser: jest.fn(),
    } as unknown as jest.Mocked<AuthService>;

    controller = new AuthController(authService);
  });

  it('delegates to AuthService when fetching current user', async () => {
    const user = { id: 'user-123' };
    const serviceResponse = {
      id: 'user-123',
      email: 'user@test.com',
      name: 'Test User',
      role: 'OWNER',
      organization: {
        id: 'org-1',
        name: 'Org',
        code: 'ORG',
        email: null,
        phone: null,
        address: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    } as any;
    authService.getCurrentUser.mockResolvedValue(serviceResponse);

    const result = await controller.getCurrentUser(user);

    expect(authService.getCurrentUser).toHaveBeenCalledWith('user-123');
    expect(result).toEqual(serviceResponse);
  });

});
