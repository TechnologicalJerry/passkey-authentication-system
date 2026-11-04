import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { JwtService } from '@nestjs/jwt';
import { TokenService } from './token.service.js';

describe('TokenService', () => {
  let service: TokenService;
  let mockJwtService: {
    signAsync: ReturnType<typeof vi.fn>;
    verifyAsync: ReturnType<typeof vi.fn>;
  };
  let mockConfigService: {
    getOrThrow: ReturnType<typeof vi.fn>;
  };

  const jwtConfig = {
    accessSecret: 'test-secret-at-least-32-characters-long!',
    accessTtl: '15m',
    issuer: 'passkey-auth-api',
    audience: 'passkey-auth-app',
  };

  const sessionConfig = {
    refreshTokenTtlDays: 7,
    refreshTokenSecret: 'test-refresh-secret-min-32-chars-long!',
    maxActiveSessions: 5,
    cookieName: 'refresh_token',
    cookieSecure: false,
    cookieSameSite: 'lax' as const,
  };

  beforeEach(() => {
    mockJwtService = {
      signAsync: vi.fn().mockResolvedValue('signed-jwt-token'),
      verifyAsync: vi.fn(),
    };

    mockConfigService = {
      getOrThrow: vi.fn((key: string) => {
        if (key === 'jwt') return jwtConfig;
        if (key === 'session') return sessionConfig;
        throw new Error(`Unexpected config key: ${key}`);
      }),
    };

    service = new TokenService(
      mockJwtService as unknown as JwtService,
      mockConfigService as unknown as ConfigService,
    );
  });

  describe('generateAccessToken', () => {
    it('should generate signed access token with standard claims and 15m expiration', async () => {
      const result = await service.generateAccessToken({
        userId: 'user-123',
        email: 'user@example.com',
        sessionId: 'session-456',
      });

      expect(mockJwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: 'user-123',
          email: 'user@example.com',
          sessionId: 'session-456',
          jti: expect.any(String),
        }),
        expect.objectContaining({
          secret: jwtConfig.accessSecret,
          expiresIn: '15m',
          issuer: 'passkey-auth-api',
          audience: 'passkey-auth-app',
          algorithm: 'HS256',
        }),
      );
      expect(result.token).toBe('signed-jwt-token');
      expect(result.expiresIn).toBe(900); // 15 * 60 seconds
    });
  });

  describe('generateRefreshToken & hashRefreshToken', () => {
    it('should generate high-entropy random string and compute deterministic HMAC-SHA256 hash', () => {
      const token1 = service.generateRefreshToken();
      const token2 = service.generateRefreshToken();

      expect(token1).not.toBe(token2);
      expect(typeof token1).toBe('string');
      expect(token1.length).toBeGreaterThanOrEqual(40);

      const hash1 = service.hashRefreshToken(token1);
      const hash1Repeat = service.hashRefreshToken(token1);
      expect(hash1).toBe(hash1Repeat);
      expect(hash1.length).toBe(64); // 32 bytes in hex = 64 characters
    });

    it('should safely compare token hashes using constant-time comparison', () => {
      const token = service.generateRefreshToken();
      const hashA = service.hashRefreshToken(token);
      const hashB = service.hashRefreshToken(token);
      const hashC = service.hashRefreshToken('different-token');

      expect(service.compareTokenHashes(hashA, hashB)).toBe(true);
      expect(service.compareTokenHashes(hashA, hashC)).toBe(false);
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify and return payload for a valid access token', async () => {
      const validPayload = {
        sub: 'user-123',
        email: 'user@example.com',
        sessionId: 'session-456',
        jti: 'token-uuid',
        iss: 'passkey-auth-api',
        aud: 'passkey-auth-app',
      };
      mockJwtService.verifyAsync.mockResolvedValueOnce(validPayload);

      const payload = await service.verifyAccessToken('valid-token');
      expect(payload).toEqual(validPayload);
      expect(mockJwtService.verifyAsync).toHaveBeenCalledWith('valid-token', {
        secret: jwtConfig.accessSecret,
        issuer: jwtConfig.issuer,
        audience: jwtConfig.audience,
        algorithms: ['HS256'],
      });
    });

    it('should throw UnauthorizedException when token verification fails or token is expired', async () => {
      mockJwtService.verifyAsync.mockRejectedValueOnce(
        new Error('jwt expired'),
      );

      await expect(service.verifyAccessToken('expired-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when required security claims are missing', async () => {
      mockJwtService.verifyAsync.mockResolvedValueOnce({
        sub: 'user-123',
        // missing sessionId and jti
      });

      await expect(
        service.verifyAccessToken('incomplete-token'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
