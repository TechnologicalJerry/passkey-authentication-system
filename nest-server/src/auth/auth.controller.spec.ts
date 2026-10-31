import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthController } from './auth.controller.js';
import type { AuthService } from './auth.service.js';

describe('AuthController', () => {
  let controller: AuthController;
  let mockAuthService: {
    generateRegistrationOptions: ReturnType<typeof vi.fn>;
    verifyRegistration: ReturnType<typeof vi.fn>;
    generateAuthenticationOptions: ReturnType<typeof vi.fn>;
    verifyAuthentication: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockAuthService = {
      generateRegistrationOptions: vi.fn(),
      verifyRegistration: vi.fn(),
      generateAuthenticationOptions: vi.fn(),
      verifyAuthentication: vi.fn(),
    };

    controller = new AuthController(mockAuthService as unknown as AuthService);
  });

  it('should delegate getRegistrationOptions to authService', async () => {
    const dto = { email: 'user@example.com', displayName: 'User' };
    const expected = { challengeId: 'c-1', options: {} as any };
    mockAuthService.generateRegistrationOptions.mockResolvedValue(expected);

    const result = await controller.getRegistrationOptions(dto);
    expect(result).toBe(expected);
    expect(mockAuthService.generateRegistrationOptions).toHaveBeenCalledWith(dto);
  });

  it('should delegate verifyRegistration to authService', async () => {
    const dto = { challengeId: 'c-1', response: {} as any, label: 'MacBook' };
    const expected = { verified: true, user: {} as any };
    mockAuthService.verifyRegistration.mockResolvedValue(expected);

    const result = await controller.verifyRegistration(dto);
    expect(result).toBe(expected);
    expect(mockAuthService.verifyRegistration).toHaveBeenCalledWith(dto);
  });

  it('should delegate getAuthenticationOptions to authService', async () => {
    const dto = { email: 'user@example.com' };
    const expected = { challengeId: 'c-2', options: {} as any };
    mockAuthService.generateAuthenticationOptions.mockResolvedValue(expected);

    const result = await controller.getAuthenticationOptions(dto);
    expect(result).toBe(expected);
    expect(mockAuthService.generateAuthenticationOptions).toHaveBeenCalledWith(dto);
  });

  it('should delegate verifyAuthentication to authService', async () => {
    const dto = { challengeId: 'c-2', response: {} as any };
    const expected = { verified: true, user: {} as any };
    mockAuthService.verifyAuthentication.mockResolvedValue(expected);

    const result = await controller.verifyAuthentication(dto);
    expect(result).toBe(expected);
    expect(mockAuthService.verifyAuthentication).toHaveBeenCalledWith(dto);
  });
});

