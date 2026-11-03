import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UsersController } from './users.controller.js';
import type { UsersService } from './users.service.js';
import type { AuditService } from './audit.service.js';
import type { ConfigService } from '@nestjs/config';
import type { AuthenticatedUser } from '../common/types/index.js';
import { UserStatus } from './entities/user.entity.js';

describe('UsersController', () => {
  let controller: UsersController;
  let mockUsersService: {
    getProfile: ReturnType<typeof vi.fn>;
    updateProfile: ReturnType<typeof vi.fn>;
    deactivateAccount: ReturnType<typeof vi.fn>;
    deleteAccount: ReturnType<typeof vi.fn>;
  };
  let mockAuditService: {
    getLogsForUser: ReturnType<typeof vi.fn>;
  };
  let mockConfigService: {
    getOrThrow: ReturnType<typeof vi.fn>;
  };

  const authUser: AuthenticatedUser = {
    id: 'user-uuid-1',
    email: 'user@example.com',
    sessionId: 'session-uuid-1',
    tokenId: 'jti-uuid-1',
  };

  beforeEach(() => {
    mockUsersService = {
      getProfile: vi.fn().mockResolvedValue({
        id: 'user-uuid-1',
        email: 'user@example.com',
        displayName: 'Alice',
        status: UserStatus.ACTIVE,
        emailVerified: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      }),
      updateProfile: vi.fn().mockResolvedValue({
        id: 'user-uuid-1',
        email: 'user@example.com',
        displayName: 'Alice Updated',
        status: UserStatus.ACTIVE,
        emailVerified: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      }),
      deactivateAccount: vi.fn().mockResolvedValue(undefined),
      deleteAccount: vi.fn().mockResolvedValue({
        success: true,
        message: 'Account deleted',
      }),
    };

    mockAuditService = {
      getLogsForUser: vi.fn().mockResolvedValue({
        items: [],
        total: 0,
        limit: 20,
        offset: 0,
        hasMore: false,
      }),
    };

    mockConfigService = {
      getOrThrow: vi.fn().mockReturnValue({
        cookieName: 'refresh_token',
        cookieSecure: false,
        cookieSameSite: 'lax',
      }),
    };

    controller = new UsersController(
      mockUsersService as unknown as UsersService,
      mockAuditService as unknown as AuditService,
      mockConfigService as unknown as ConfigService,
    );
  });

  it('GET /me returns user profile', async () => {
    const result = await controller.getProfile(authUser);
    expect(result.id).toBe('user-uuid-1');
    expect(mockUsersService.getProfile).toHaveBeenCalledWith('user-uuid-1');
  });

  it('PATCH /me updates permitted profile fields', async () => {
    const result = await controller.updateProfile(authUser, { displayName: 'Alice Updated' });
    expect(result.displayName).toBe('Alice Updated');
    expect(mockUsersService.updateProfile).toHaveBeenCalledWith('user-uuid-1', {
      displayName: 'Alice Updated',
    });
  });

  it('POST /me/deactivate suspends account and clears cookie', async () => {
    const mockRes = { clearCookie: vi.fn() } as any;
    const result = await controller.deactivateAccount(authUser, mockRes);
    expect(result.success).toBe(true);
    expect(mockUsersService.deactivateAccount).toHaveBeenCalledWith('user-uuid-1');
    expect(mockRes.clearCookie).toHaveBeenCalled();
  });

  it('DELETE /me executes deletion policy and clears cookie', async () => {
    const mockRes = { clearCookie: vi.fn() } as any;
    const result = await controller.deleteAccount(authUser, mockRes);
    expect(result.success).toBe(true);
    expect(mockUsersService.deleteAccount).toHaveBeenCalledWith('user-uuid-1');
    expect(mockRes.clearCookie).toHaveBeenCalled();
  });
});

