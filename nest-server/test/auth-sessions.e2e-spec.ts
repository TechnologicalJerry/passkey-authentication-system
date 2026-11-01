import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { getDataSourceToken } from '@nestjs/typeorm';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module.js';
import { SessionsService } from '../src/sessions/sessions.service.js';
import { TokenService } from '../src/auth/token.service.js';
import type { AuthenticatedUser, TokenPair, SessionSummary } from '../src/common/types/index.js';

describe('Auth Sessions & Token Lifecycle (e2e)', () => {
  let app: INestApplication;

  const mockUser: AuthenticatedUser = {
    id: 'user-uuid-1',
    email: 'user@example.com',
    sessionId: 'session-uuid-1',
    tokenId: 'jti-uuid-1',
  };

  const mockTokenPair: TokenPair = {
    accessToken: 'valid.signed.jwt.access.token',
    refreshToken: 'valid-raw-refresh-token-hex-32',
    expiresIn: 900,
    tokenType: 'Bearer',
  };

  const mockSessionsService = {
    rotateRefreshToken: vi.fn(),
    revokeSession: vi.fn(),
    revokeAllUserSessions: vi.fn(),
    listUserSessions: vi.fn(),
    validateSession: vi.fn(),
  };

  const mockTokenService = {
    verifyAccessToken: vi.fn(),
    generateAccessToken: vi.fn(),
    generateRefreshToken: vi.fn(),
    hashRefreshToken: vi.fn(),
  };

  const mockDataSource = {
    isInitialized: true,
    query: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
    getRepository: vi.fn().mockReturnValue({
      findOne: vi.fn(),
      find: vi.fn(),
      save: vi.fn(),
      update: vi.fn(),
    }),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(getDataSourceToken())
      .useValue(mockDataSource)
      .overrideProvider(SessionsService)
      .useValue(mockSessionsService)
      .overrideProvider(TokenService)
      .useValue(mockTokenService)
      .compile();

    app = moduleFixture.createNestApplication();

    app.use(cookieParser());
    app.setGlobalPrefix('api');
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
    });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /api/v1/auth/token/refresh', () => {
    it('should rotate token and return new token pair when refresh token is supplied in body', async () => {
      mockSessionsService.rotateRefreshToken.mockResolvedValueOnce({
        session: { id: 'session-uuid-1', userId: 'user-uuid-1' },
        tokens: mockTokenPair,
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/token/refresh')
        .send({ refreshToken: 'valid-raw-refresh-token-hex-32' })
        .expect(200);

      expect(response.body).toEqual({
        accessToken: mockTokenPair.accessToken,
        refreshToken: mockTokenPair.refreshToken,
        expiresIn: mockTokenPair.expiresIn,
        tokenType: 'Bearer',
      });

      // Verify HttpOnly cookie is set
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toContain('refresh_token=valid-raw-refresh-token-hex-32');
      expect(cookies[0]).toContain('HttpOnly');
      expect(cookies[0]).toContain('Path=/api/v1/auth');
    });

    it('should rotate token when refresh token is supplied in cookie', async () => {
      mockSessionsService.rotateRefreshToken.mockResolvedValueOnce({
        session: { id: 'session-uuid-1', userId: 'user-uuid-1' },
        tokens: mockTokenPair,
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/token/refresh')
        .set('Cookie', ['refresh_token=cookie-refresh-token-val'])
        .send({})
        .expect(200);

      expect(mockSessionsService.rotateRefreshToken).toHaveBeenCalledWith(
        'cookie-refresh-token-val',
        expect.any(Object),
      );
      expect(response.body.accessToken).toBe(mockTokenPair.accessToken);
    });

    it('should return 401 Unauthorized if no refresh token is provided in body or cookie', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/token/refresh')
        .send({})
        .expect(401);

      expect(response.body.message).toContain('Refresh token is required');
    });

    it('should return 401 Unauthorized if refresh token is invalid or reuse is detected', async () => {
      mockSessionsService.rotateRefreshToken.mockRejectedValueOnce(
        new UnauthorizedException('Invalid or expired refresh token'),
      );

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/token/refresh')
        .send({ refreshToken: 'reused-or-invalid-token' })
        .expect(401);

      expect(response.body.statusCode).toBe(401);
      expect(response.body.message).toBe('Invalid or expired refresh token');
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should return 401 if request has no Bearer access token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .expect(401);
    });

    it('should revoke current session and clear cookie for authenticated user', async () => {
      mockTokenService.verifyAccessToken.mockResolvedValueOnce({
        sub: mockUser.id,
        email: mockUser.email,
        sessionId: mockUser.sessionId,
        jti: mockUser.tokenId,
      });
      mockSessionsService.validateSession.mockResolvedValueOnce({
        id: mockUser.sessionId,
        userId: mockUser.id,
      });
      mockSessionsService.revokeSession.mockResolvedValueOnce(undefined);

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', 'Bearer valid.jwt.token')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Logged out successfully',
      });
      expect(mockSessionsService.revokeSession).toHaveBeenCalledWith(
        mockUser.sessionId,
        mockUser.id,
      );

      // Verify cookie is cleared (expires in past or max-age=0)
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toMatch(/refresh_token=;.*(Expires=|Max-Age=0)/i);
    });
  });

  describe('POST /api/v1/auth/logout/all', () => {
    it('should revoke all sessions for the user and clear cookie', async () => {
      mockTokenService.verifyAccessToken.mockResolvedValueOnce({
        sub: mockUser.id,
        email: mockUser.email,
        sessionId: mockUser.sessionId,
        jti: mockUser.tokenId,
      });
      mockSessionsService.validateSession.mockResolvedValueOnce({
        id: mockUser.sessionId,
        userId: mockUser.id,
      });
      mockSessionsService.revokeAllUserSessions.mockResolvedValueOnce(3);

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/logout/all')
        .set('Authorization', 'Bearer valid.jwt.token')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'All active sessions have been revoked',
        revokedCount: 3,
      });
      expect(mockSessionsService.revokeAllUserSessions).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('GET /api/v1/auth/sessions', () => {
    it('should return session summaries with isCurrent flag and safe metadata', async () => {
      mockTokenService.verifyAccessToken.mockResolvedValueOnce({
        sub: mockUser.id,
        email: mockUser.email,
        sessionId: mockUser.sessionId,
        jti: mockUser.tokenId,
      });
      mockSessionsService.validateSession.mockResolvedValueOnce({
        id: mockUser.sessionId,
        userId: mockUser.id,
      });

      const mockSessionList: SessionSummary[] = [
        {
          id: 'session-uuid-1',
          isCurrent: true,
          deviceLabel: 'Chrome on macOS',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0...',
          createdAt: new Date().toISOString(),
          lastActivityAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 600000).toISOString(),
          isRevoked: false,
        },
        {
          id: 'session-uuid-2',
          isCurrent: false,
          deviceLabel: 'Safari on iOS',
          ipAddress: '10.0.0.1',
          userAgent: 'Mobile/Safari...',
          createdAt: new Date().toISOString(),
          lastActivityAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 600000).toISOString(),
          isRevoked: false,
        },
      ];

      mockSessionsService.listUserSessions.mockResolvedValueOnce(mockSessionList);

      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/sessions')
        .set('Authorization', 'Bearer valid.jwt.token')
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0].isCurrent).toBe(true);
      expect(response.body[1].isCurrent).toBe(false);
      // Ensure no internal hash/family fields leak
      expect(response.body[0].refreshTokenHash).toBeUndefined();
      expect(response.body[0].previousRefreshTokenHash).toBeUndefined();
    });
  });

  describe('DELETE /api/v1/auth/sessions/:id', () => {
    it('should revoke target session successfully', async () => {
      mockTokenService.verifyAccessToken.mockResolvedValueOnce({
        sub: mockUser.id,
        email: mockUser.email,
        sessionId: mockUser.sessionId,
        jti: mockUser.tokenId,
      });
      mockSessionsService.validateSession.mockResolvedValueOnce({
        id: mockUser.sessionId,
        userId: mockUser.id,
      });
      mockSessionsService.revokeSession.mockResolvedValueOnce(undefined);

      const response = await request(app.getHttpServer())
        .delete('/api/v1/auth/sessions/c4b9d0b8-158a-4934-8b65-726ef352d0d1')
        .set('Authorization', 'Bearer valid.jwt.token')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Session revoked successfully',
      });
      expect(mockSessionsService.revokeSession).toHaveBeenCalledWith(
        'c4b9d0b8-158a-4934-8b65-726ef352d0d1',
        mockUser.id,
      );
    });

    it('should return 400 Bad Request if session ID is not a valid UUID', async () => {
      mockTokenService.verifyAccessToken.mockResolvedValueOnce({
        sub: mockUser.id,
        email: mockUser.email,
        sessionId: mockUser.sessionId,
        jti: mockUser.tokenId,
      });
      mockSessionsService.validateSession.mockResolvedValueOnce({
        id: mockUser.sessionId,
        userId: mockUser.id,
      });

      const response = await request(app.getHttpServer())
        .delete('/api/v1/auth/sessions/not-a-valid-uuid')
        .set('Authorization', 'Bearer valid.jwt.token')
        .expect(400);

      expect(response.body.statusCode).toBe(400);
    });

    it('should return 404 if session does not exist or belongs to another user', async () => {
      mockTokenService.verifyAccessToken.mockResolvedValueOnce({
        sub: mockUser.id,
        email: mockUser.email,
        sessionId: mockUser.sessionId,
        jti: mockUser.tokenId,
      });
      mockSessionsService.validateSession.mockResolvedValueOnce({
        id: mockUser.sessionId,
        userId: mockUser.id,
      });
      mockSessionsService.revokeSession.mockRejectedValueOnce(
        new NotFoundException('Session not found or does not belong to user'),
      );

      const response = await request(app.getHttpServer())
        .delete('/api/v1/auth/sessions/c4b9d0b8-158a-4934-8b65-726ef352d0d1')
        .set('Authorization', 'Bearer valid.jwt.token')
        .expect(404);

      expect(response.body.statusCode).toBe(404);
    });
  });
});

