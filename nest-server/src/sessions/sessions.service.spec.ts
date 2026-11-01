import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { DataSource, Repository } from 'typeorm';
import { SessionsService } from './sessions.service.js';
import { Session, RevocationReason } from './entities/session.entity.js';
import { UserStatus } from '../users/entities/user.entity.js';
import type { TokenService } from '../auth/token.service.js';

describe('SessionsService', () => {
  let service: SessionsService;
  let mockSessionRepository: {
    find: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    createQueryBuilder: ReturnType<typeof vi.fn>;
  };
  let mockTokenService: {
    generateRefreshToken: ReturnType<typeof vi.fn>;
    hashRefreshToken: ReturnType<typeof vi.fn>;
    generateAccessToken: ReturnType<typeof vi.fn>;
  };
  let mockConfigService: {
    getOrThrow: ReturnType<typeof vi.fn>;
  };
  let mockDataSource: {
    transaction: ReturnType<typeof vi.fn>;
  };

  const sessionConfig = {
    refreshTokenTtlDays: 7,
    refreshTokenSecret: 'test-secret-at-least-32-chars-long!',
    maxActiveSessions: 2, // Low limit to test eviction easily
    cookieName: 'refresh_token',
    cookieSecure: false,
    cookieSameSite: 'lax' as const,
  };

  beforeEach(() => {
    mockSessionRepository = {
      find: vi.fn().mockResolvedValue([]),
      findOne: vi.fn(),
      create: vi.fn((data) => ({ id: 'new-session-id', ...data })),
      save: vi.fn((session) => Promise.resolve({ id: session.id ?? 'saved-session-id', ...session })),
      update: vi.fn().mockResolvedValue({ affected: 1 }),
      createQueryBuilder: vi.fn(),
    };

    mockTokenService = {
      generateRefreshToken: vi.fn().mockReturnValue('raw-refresh-token-123'),
      hashRefreshToken: vi.fn((token: string) => `hashed_${token}`),
      generateAccessToken: vi.fn().mockResolvedValue({
        token: 'new-access-token',
        expiresIn: 900,
      }),
    };

    mockConfigService = {
      getOrThrow: vi.fn().mockReturnValue(sessionConfig),
    };

    mockDataSource = {
      transaction: vi.fn((cb) =>
        cb({
          getRepository: vi.fn().mockReturnValue(mockSessionRepository),
        }),
      ),
    };

    service = new SessionsService(
      mockSessionRepository as unknown as Repository<Session>,
      mockTokenService as unknown as TokenService,
      mockConfigService as unknown as ConfigService,
      mockDataSource as unknown as DataSource,
    );
  });

  describe('createSession', () => {
    it('should create an active session and return raw refresh token', async () => {
      mockSessionRepository.find.mockResolvedValueOnce([]); // no existing sessions

      const result = await service.createSession({
        userId: 'user-1',
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
      });

      expect(result.rawRefreshToken).toBe('raw-refresh-token-123');
      expect(result.session.userId).toBe('user-1');
      expect(result.session.refreshTokenHash).toBe('hashed_raw-refresh-token-123');
      expect(result.session.ipAddress).toBe('127.0.0.1');
    });

    it('should evict oldest active session when session limit is reached', async () => {
      const now = new Date();
      const existingSession1 = {
        id: 's-oldest',
        userId: 'user-1',
        lastActivityAt: new Date(now.getTime() - 10000),
        revokedAt: null,
      };
      const existingSession2 = {
        id: 's-newer',
        userId: 'user-1',
        lastActivityAt: new Date(now.getTime() - 5000),
        revokedAt: null,
      };

      // Already 2 active sessions (max is 2)
      mockSessionRepository.find.mockResolvedValueOnce([existingSession1, existingSession2]);

      await service.createSession({ userId: 'user-1' });

      // Oldest session should be marked revoked
      expect(existingSession1.revokedAt).not.toBeNull();
      expect(mockSessionRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 's-oldest',
          revocationReason: RevocationReason.SESSION_LIMIT_EXCEEDED,
        }),
      );
    });
  });

  describe('rotateRefreshToken', () => {
    it('should rotate token and issue new token pair for valid refresh token', async () => {
      const activeSession = {
        id: 'session-1',
        userId: 'user-1',
        refreshTokenHash: 'hashed_valid-token',
        previousRefreshTokenHash: null,
        refreshTokenFamily: 'family-1',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 100000),
        user: { id: 'user-1', email: 'u@example.com', status: UserStatus.ACTIVE },
      };

      mockSessionRepository.findOne.mockResolvedValueOnce(activeSession);
      mockTokenService.generateRefreshToken.mockReturnValueOnce('new-raw-refresh-token');

      const result = await service.rotateRefreshToken('valid-token');

      expect(result.tokens.accessToken).toBe('new-access-token');
      expect(result.tokens.refreshToken).toBe('new-raw-refresh-token');
      expect(mockSessionRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'session-1',
          previousRefreshTokenHash: 'hashed_valid-token',
          refreshTokenHash: 'hashed_new-raw-refresh-token',
        }),
      );
    });

    it('should detect reuse attack and revoke session family when previous token is presented', async () => {
      const sessionWithPriorRotation = {
        id: 'session-1',
        userId: 'user-1',
        refreshTokenHash: 'hashed_latest-token',
        previousRefreshTokenHash: 'hashed_old-rotated-token',
        refreshTokenFamily: 'family-1',
        revokedAt: null,
      };

      mockSessionRepository.findOne.mockResolvedValueOnce(sessionWithPriorRotation);

      await expect(service.rotateRefreshToken('old-rotated-token')).rejects.toThrow(
        'Refresh token reuse detected',
      );

      // Session family should be revoked
      expect(mockSessionRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'session-1',
          revocationReason: RevocationReason.REUSE_DETECTED,
        }),
      );
      expect(mockSessionRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({ refreshTokenFamily: 'family-1' }),
        expect.objectContaining({ revocationReason: RevocationReason.REUSE_DETECTED }),
      );
    });

    it('should reject unknown refresh tokens with UnauthorizedException', async () => {
      mockSessionRepository.findOne.mockResolvedValueOnce(null);

      await expect(service.rotateRefreshToken('completely-unknown-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should reject refresh if user account is suspended', async () => {
      const sessionSuspendedUser = {
        id: 'session-1',
        userId: 'user-1',
        refreshTokenHash: 'hashed_valid-token',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 100000),
        user: { id: 'user-1', email: 'u@example.com', status: UserStatus.SUSPENDED },
      };
      mockSessionRepository.findOne.mockResolvedValueOnce(sessionSuspendedUser);

      await expect(service.rotateRefreshToken('valid-token')).rejects.toThrow('Account is suspended');
    });
  });

  describe('validateSession', () => {
    it('should return session if active and not revoked or expired', async () => {
      const activeSession = {
        id: 's-1',
        userId: 'u-1',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 100000),
        user: { status: UserStatus.ACTIVE },
      };
      mockSessionRepository.findOne.mockResolvedValueOnce(activeSession);

      const result = await service.validateSession('s-1', 'u-1');
      expect(result).toBe(activeSession);
    });

    it('should throw UnauthorizedException if session is revoked', async () => {
      const revokedSession = {
        id: 's-1',
        userId: 'u-1',
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 100000),
        user: { status: UserStatus.ACTIVE },
      };
      mockSessionRepository.findOne.mockResolvedValueOnce(revokedSession);

      await expect(service.validateSession('s-1', 'u-1')).rejects.toThrow(
        'Session has been revoked',
      );
    });
  });

  describe('revokeSession', () => {
    it('should revoke session when found and owned by the requesting user', async () => {
      const userSession = {
        id: 's-1',
        userId: 'u-1',
        revokedAt: null,
      };
      mockSessionRepository.findOne.mockResolvedValueOnce(userSession);

      await service.revokeSession('s-1', 'u-1');

      expect(userSession.revokedAt).not.toBeNull();
      expect(mockSessionRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 's-1',
          revocationReason: RevocationReason.USER_LOGOUT,
        }),
      );
    });

    it('should throw NotFoundException if session does not belong to the user', async () => {
      mockSessionRepository.findOne.mockResolvedValueOnce(null);

      await expect(service.revokeSession('s-other', 'u-1')).rejects.toThrow(NotFoundException);
    });
  });
});

