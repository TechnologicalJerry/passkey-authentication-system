import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConflictException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { DataSource } from 'typeorm';
import { AuthService } from './auth.service.js';
import { User, UserStatus } from '../users/entities/user.entity.js';
import { ChallengeCeremony } from './entities/auth-challenge.entity.js';
import { PasskeyCredential } from '../passkeys/entities/passkey-credential.entity.js';
import * as simplewebauthn from '@simplewebauthn/server';

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
  let mockSessionsService: {
    createSession: ReturnType<typeof vi.fn>;
  };
  let mockTokenService: {
    generateAccessToken: ReturnType<typeof vi.fn>;
  };
  let mockEntityManager: {
    getRepository: ReturnType<typeof vi.fn>;
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

    mockEntityManager = {
      getRepository: vi.fn(),
    };

    mockDataSource = {
      transaction: vi.fn((cb) => cb(mockEntityManager)),
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

    mockSessionsService = {
      createSession: vi.fn().mockResolvedValue({
        session: {
          id: 'session-uuid-1',
          userId: 'user-uuid',
          deviceLabel: 'Chrome on macOS',
        },
        rawRefreshToken: 'raw-refresh-token-hex-32-bytes',
      }),
    };

    mockTokenService = {
      generateAccessToken: vi.fn().mockResolvedValue({
        token: 'signed.jwt.access.token',
        expiresIn: 900,
      }),
    };

    authService = new AuthService(
      mockConfigService as unknown as ConfigService,
      mockDataSource as unknown as DataSource,
      mockUsersService as any,
      mockPasskeysService as any,
      mockChallengeService as any,
      mockSessionsService as any,
      mockTokenService as any,
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

  describe('verifyAuthentication (Stage 3 Integration)', () => {
    const validVerifyDto = {
      challengeId: 'auth-challenge-uuid',
      response: {
        id: 'cred-raw-id',
        rawId: 'cred-raw-id',
        response: {
          authenticatorData: 'auth-data',
          clientDataJSON: 'client-data-json',
          signature: 'sig',
        },
        type: 'public-key' as const,
        clientExtensionResults: {},
      },
    };

    it('should verify authenticator assertion signature, create session, and issue token pair', async () => {
      mockChallengeService.consumeChallenge.mockResolvedValue({
        id: 'auth-challenge-uuid',
        challenge: 'expected-auth-challenge',
        ceremonyType: ChallengeCeremony.AUTHENTICATION,
        userId: 'user-uuid',
      });

      const mockCredentialRepo = {
        findOne: vi.fn().mockResolvedValue({
          id: 'cred-db-uuid',
          credentialId: 'cred-raw-id',
          userId: 'user-uuid',
          publicKey: Buffer.from('mock-public-key'),
          counter: 5,
          revokedAt: null,
          user: {
            id: 'user-uuid',
            email: 'user@example.com',
            status: UserStatus.ACTIVE,
            emailVerifiedAt: new Date(),
            createdAt: new Date(),
          },
        }),
      };

      mockEntityManager.getRepository.mockImplementation((entity) => {
        if (entity === PasskeyCredential) {
          return mockCredentialRepo;
        }
        return {};
      });

      vi.mocked(simplewebauthn.verifyAuthenticationResponse).mockResolvedValue({
        verified: true,
        authenticationInfo: {
          newCounter: 6,
          credentialID: 'cred-raw-id',
          userVerified: true,
          credentialDeviceType: 'singleDevice',
          credentialBackedUp: false,
          authenticatorExtensionResults: {},
        },
      } as any);

      const result = await authService.verifyAuthentication(validVerifyDto, {
        ipAddress: '127.0.0.1',
        userAgent: 'TestBrowser/1.0',
      });

      expect(result.verified).toBe(true);
      expect(result.tokens).toBeDefined();
      expect(result.tokens?.accessToken).toBe('signed.jwt.access.token');
      expect(result.tokens?.refreshToken).toBe('raw-refresh-token-hex-32-bytes');
      expect(result.tokens?.expiresIn).toBe(900);
      expect(result.tokens?.tokenType).toBe('Bearer');
      expect(mockSessionsService.createSession).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-uuid',
          ipAddress: '127.0.0.1',
          userAgent: 'TestBrowser/1.0',
        }),
      );
      expect(mockTokenService.generateAccessToken).toHaveBeenCalledWith({
        userId: 'user-uuid',
        email: 'user@example.com',
        sessionId: 'session-uuid-1',
      });
    });

    it('should throw UnauthorizedException if passkey is revoked', async () => {
      mockChallengeService.consumeChallenge.mockResolvedValue({
        id: 'auth-challenge-uuid',
        challenge: 'expected-auth-challenge',
        ceremonyType: ChallengeCeremony.AUTHENTICATION,
      });

      mockEntityManager.getRepository.mockReturnValue({
        findOne: vi.fn().mockResolvedValue({
          id: 'cred-db-uuid',
          credentialId: 'cred-raw-id',
          userId: 'user-uuid',
          revokedAt: new Date(),
        }),
      });

      await expect(
        authService.verifyAuthentication(validVerifyDto),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if challenge was bound to another user', async () => {
      mockChallengeService.consumeChallenge.mockResolvedValue({
        id: 'auth-challenge-uuid',
        challenge: 'expected-auth-challenge',
        ceremonyType: ChallengeCeremony.AUTHENTICATION,
        userId: 'other-user-uuid',
      });

      mockEntityManager.getRepository.mockReturnValue({
        findOne: vi.fn().mockResolvedValue({
          id: 'cred-db-uuid',
          credentialId: 'cred-raw-id',
          userId: 'user-uuid',
          revokedAt: null,
          user: { id: 'user-uuid', status: UserStatus.ACTIVE },
        }),
      });

      await expect(
        authService.verifyAuthentication(validVerifyDto),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
