import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { UsersService } from './users.service.js';
import { User, UserStatus } from './entities/user.entity.js';
import type { SessionsService } from '../sessions/sessions.service.js';
import type { PasskeysService } from '../passkeys/passkeys.service.js';
import type { AuditService } from '../audit/audit.service.js';

describe('UsersService', () => {
  let usersService: UsersService;
  let mockUserRepo: {
    findOne: ReturnType<typeof vi.fn>;
    findOneByOrFail: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  let mockSessionsService: {
    revokeAllUserSessions: ReturnType<typeof vi.fn>;
  };
  let mockPasskeysService: {
    revokeAllUserPasskeys: ReturnType<typeof vi.fn>;
  };
  let mockAuditService: {
    logEvent: ReturnType<typeof vi.fn>;
  };

  const mockUser: User = {
    id: 'user-uuid-1',
    email: 'user@example.com',
    displayName: 'Original Name',
    status: UserStatus.ACTIVE,
    emailVerifiedAt: new Date('2026-01-01T00:00:00Z'),
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    credentials: [],
    challenges: [],
    sessions: [],
  };

  beforeEach(() => {
    mockUserRepo = {
      findOne: vi.fn(),
      findOneByOrFail: vi.fn(),
      save: vi.fn((u) => Promise.resolve({ ...u, updatedAt: new Date() })),
      create: vi.fn((u) => ({ ...u, id: 'created-uuid', createdAt: new Date(), updatedAt: new Date() })),
    };

    mockSessionsService = {
      revokeAllUserSessions: vi.fn().mockResolvedValue(2),
    };

    mockPasskeysService = {
      revokeAllUserPasskeys: vi.fn().mockResolvedValue(1),
    };

    mockAuditService = {
      logEvent: vi.fn().mockResolvedValue(null),
    };

    usersService = new UsersService(
      mockUserRepo as unknown as Repository<User>,
      mockSessionsService as unknown as SessionsService,
      mockPasskeysService as unknown as PasskeysService,
      mockAuditService as unknown as AuditService,
    );
  });

  describe('getProfile', () => {
    it('should return safe user profile when user exists and is active', async () => {
      mockUserRepo.findOne.mockResolvedValueOnce({ ...mockUser });

      const profile = await usersService.getProfile('user-uuid-1');

      expect(profile).toEqual({
        id: 'user-uuid-1',
        email: 'user@example.com',
        displayName: 'Original Name',
        status: UserStatus.ACTIVE,
        emailVerified: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      });
    });

    it('should throw NotFoundException if user does not exist', async () => {
      mockUserRepo.findOne.mockResolvedValueOnce(null);

      await expect(usersService.getProfile('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw UnauthorizedException if user account is suspended', async () => {
      mockUserRepo.findOne.mockResolvedValueOnce({
        ...mockUser,
        status: UserStatus.SUSPENDED,
      });

      await expect(usersService.getProfile('user-uuid-1')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('updateProfile', () => {
    it('should update allowed fields (displayName) and log audit event', async () => {
      mockUserRepo.findOne.mockResolvedValueOnce({ ...mockUser });

      const result = await usersService.updateProfile('user-uuid-1', {
        displayName: 'Updated Name',
      });

      expect(result.displayName).toBe('Updated Name');
      expect(mockUserRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ displayName: 'Updated Name' }),
      );
      expect(mockAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'ACCOUNT_PROFILE_UPDATED',
          actorUserId: 'user-uuid-1',
        }),
      );
    });
  });

  describe('deactivateAccount', () => {
    it('should set status to SUSPENDED, revoke all active sessions, and log audit event', async () => {
      mockUserRepo.findOne.mockResolvedValueOnce({ ...mockUser });

      await usersService.deactivateAccount('user-uuid-1');

      expect(mockUserRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: UserStatus.SUSPENDED }),
      );
      expect(mockSessionsService.revokeAllUserSessions).toHaveBeenCalledWith(
        'user-uuid-1',
        undefined,
        expect.any(String),
      );
      expect(mockAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'ACCOUNT_DEACTIVATED',
          actorUserId: 'user-uuid-1',
        }),
      );
    });
  });

  describe('deleteAccount', () => {
    it('should anonymize user PII, revoke sessions and passkeys, and preserve audit log compliance', async () => {
      mockUserRepo.findOne.mockResolvedValueOnce({ ...mockUser });

      const result = await usersService.deleteAccount('user-uuid-1');

      expect(result.success).toBe(true);
      expect(mockSessionsService.revokeAllUserSessions).toHaveBeenCalled();
      expect(mockPasskeysService.revokeAllUserPasskeys).toHaveBeenCalledWith('user-uuid-1');
      expect(mockUserRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: UserStatus.SUSPENDED,
          email: 'deleted_user-uuid-1@anonymized.local',
          displayName: 'Deleted User',
        }),
      );
      expect(mockAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'ACCOUNT_DELETED',
          actorUserId: 'user-uuid-1',
        }),
      );
    });
  });
});

