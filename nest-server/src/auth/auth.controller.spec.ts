import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthController } from './auth.controller.js';
import type { AuthService } from './auth.service.js';
import type { ConfigService } from '@nestjs/config';

describe('AuthController', () => {
  let controller: AuthController;
  let mockAuthService: {
    generateRegistrationOptions: ReturnType<typeof vi.fn>;
    verifyRegistration: ReturnType<typeof vi.fn>;
    generateAuthenticationOptions: ReturnType<typeof vi.fn>;
    verifyAuthentication: ReturnType<typeof vi.fn>;
  };
  let mockConfigService: {
    getOrThrow: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockAuthService = {
      generateRegistrationOptions: vi.fn(),
      verifyRegistration: vi.fn(),
      generateAuthenticationOptions: vi.fn(),
      verifyAuthentication: vi.fn(),
    };

    mockConfigService = {
      getOrThrow: vi.fn().mockReturnValue({
        refreshTokenTtlDays: 7,
        cookieName: 'refresh_token',
        cookieSecure: false,
        cookieSameSite: 'lax',
      }),
    };

    controller = new AuthController(
      mockAuthService as unknown as AuthService,
      mockConfigService as unknown as ConfigService,
    );
  });

  it('should delegate getRegistrationOptions to authService', async () => {
    const dto = { email: 'user@example.com', displayName: 'User' };
    const expected = { challengeId: 'c-1', options: {} as any };
    mockAuthService.generateRegistrationOptions.mockResolvedValue(expected);

    const result = await controller.getRegistrationOptions(dto);
    expect(result).toBe(expected);
    expect(mockAuthService.generateRegistrationOptions).toHaveBeenCalledWith(
      dto,
    );
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
    expect(mockAuthService.generateAuthenticationOptions).toHaveBeenCalledWith(
      dto,
    );
  });

  it('should delegate verifyAuthentication to authService', async () => {
    const dto = { challengeId: 'c-2', response: {} as any };
    const expected = { verified: true, user: {} as any };
    mockAuthService.verifyAuthentication.mockResolvedValue(expected);

    const mockReq = {
      ip: '127.0.0.1',
      headers: { 'user-agent': 'test-agent' },
    };
    const mockRes = { cookie: vi.fn() };

    const result = await controller.verifyAuthentication(
      dto,
      mockReq as any,
      mockRes as any,
    );
    expect(result).toBe(expected);
    expect(mockAuthService.verifyAuthentication).toHaveBeenCalledWith(dto, {
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent',
    });
  });
});
