import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConflictException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { DataSource } from 'typeorm';
import { AuthService } from './auth.service.js';
import { User, UserStatus } from '../users/entities/user.entity.js';
import { ChallengeCeremony } from './entities/auth-challenge.entity.js';

// Mock simplewebauthn library
vi.mock('@simplewebauthn/server', () => ({
  generateRegistrationOptions: vi.fn().mockResolvedValue({
    challenge: 'mock-reg-challenge',
    rp: { name: 'Passkey Authentication System', id: 'localhost' },
    user: { id: 'user-uuid', name: 'test@example.com', displayName: 'test@example.com' },
    pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
    timeout: 60000,
    attestation: 'none',
  }),
  verifyRegistrationResponse: vi.fn(),
  generateAuthenticationOptions: vi.fn().mockResolvedValue({
    challenge: 'mock-auth-challenge',
    rpId: 'localhost',
    timeout: 60000,
    userVerification: 'preferred',
    allowCredentials: [],
  }),
  verifyAuthenticationResponse: vi.fn(),
}));

describe('AuthService', () => {
  let authService: AuthService;
  let mockConfigService: { getOrThrow: ReturnType<typeof vi.fn> };
  let mockDataSource: { transaction: ReturnType<typeof vi.fn> };
  let mockUsersService: {
    findByEmail: ReturnType<typeof vi.fn>;
    createPendingUser: ReturnType<typeof vi.fn>;
    activateUser: ReturnType<typeof vi.fn>;
  };
  let mockPasskeysService: {
    findActiveByUserId: ReturnType<typeof vi.fn>;
    hasActiveCredentials: ReturnType<typeof vi.fn>;
    createCredential: ReturnType<typeof vi.fn>;
    updateCounterAndLastUsed: ReturnType<typeof vi.fn>;
  };
  let mockChallengeService: {
    createChallenge: ReturnType<typeof vi.fn>;
    consumeChallenge: ReturnType<typeof vi.fn>;
  };

  const webauthnConfig = {
    rpName: 'Passkey Authentication System',
    rpId: 'localhost',
    origins: ['http://localhost:3000'],
    challengeTtlMs: 60000,
    userVerification: 'preferred' as const,
  };

  beforeEach(() => {
    mockConfigService = {
      getOrThrow: vi.fn().mockReturnValue(webauthnConfig),
    };

    mockDataSource = {
      transaction: vi.fn((cb) => cb({
        getRepository: vi.fn((entity) => ({
          findOne: vi.fn(),
          save: vi.fn((e) => e),
        })),
      })),
    };

    mockUsersService = {
      findByEmail: vi.fn(),
      createPendingUser: vi.fn(),
      activateUser: vi.fn(),
    };

    mockPasskeysService = {
      findActiveByUserId: vi.fn().mockResolvedValue([]),
      hasActiveCredentials: vi.fn().mockResolvedValue(false),
      createCredential: vi.fn().mockResolvedValue({ id: 'cred-uuid' }),
      updateCounterAndLastUsed: vi.fn().mockResolvedValue(undefined),
    };

    mockChallengeService = {
      createChallenge: vi.fn().mockResolvedValue({
        id: 'challenge-uuid',
        challenge: 'mock-reg-challenge',
        ceremonyType: ChallengeCeremony.REGISTRATION,
      }),
      consumeChallenge: vi.fn(),
    };

    authService = new AuthService(
      mockConfigService as unknown as ConfigService,
      mockDataSource as unknown as DataSource,
      mockUsersService as any,
      mockPasskeysService as any,
      mockChallengeService as any,
    );
  });

  describe('generateRegistrationOptions', () => {
    it('should create pending user and return registration options when email is new', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.createPendingUser.mockResolvedValue({
        id: 'new-user-uuid',
        email: 'newuser@example.com',
        status: UserStatus.PENDING,
      });

      const result = await authService.generateRegistrationOptions({
        email: 'newuser@example.com',
        displayName: 'New User',
      });

      expect(mockUsersService.createPendingUser).toHaveBeenCalledWith('newuser@example.com');
      expect(result.challengeId).toBe('challenge-uuid');
      expect(result.options.challenge).toBe('mock-reg-challenge');
    });

    it('should throw ConflictException if user already exists and possesses active passkeys', async () => {
      mockUsersService.findByEmail.mockResolvedValue({
        id: 'existing-user-uuid',
        email: 'existing@example.com',
        status: UserStatus.ACTIVE,
      });
      mockPasskeysService.hasActiveCredentials.mockResolvedValue(true);

      await expect(
        authService.generateRegistrationOptions({
          email: 'existing@example.com',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('generateAuthenticationOptions', () => {
    it('should generate discoverable options when email is not provided', async () => {
      const result = await authService.generateAuthenticationOptions({});

      expect(result.challengeId).toBe('challenge-uuid');
      expect(result.options.challenge).toBe('mock-reg-challenge');
    });

    it('should throw BadRequestException if specific email is requested but user is not found', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(
        authService.generateAuthenticationOptions({ email: 'unknown@example.com' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return credential allowList when valid user with passkeys requests options', async () => {
      mockUsersService.findByEmail.mockResolvedValue({
        id: 'user-uuid',
        email: 'user@example.com',
      });
      mockPasskeysService.findActiveByUserId.mockResolvedValue([
        { credentialId: 'cred-id-1', transports: ['internal'] },
      ]);

      const result = await authService.generateAuthenticationOptions({
        email: 'user@example.com',
      });

      expect(result.challengeId).toBe('challenge-uuid');
    });
  });
});

