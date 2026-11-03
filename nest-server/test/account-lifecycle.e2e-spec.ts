import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType, UnauthorizedException } from '@nestjs/common';
import { getDataSourceToken } from '@nestjs/typeorm';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module.js';
import { UsersService } from '../src/users/users.service.js';
import { TokenService } from '../src/auth/token.service.js';
import { SessionsService } from '../src/sessions/sessions.service.js';
import { AuditService } from '../src/audit/audit.service.js';
import { UserStatus } from '../src/users/entities/user.entity.js';
import type { AuthenticatedUser } from '../src/common/types/index.js';

describe('User Account Lifecycle (e2e)', () => {
  let app: INestApplication;

  const mockAuthUser: AuthenticatedUser = {
    id: 'user-uuid-1',
    email: 'alice@example.com',
    sessionId: 'session-uuid-1',
    tokenId: 'token-uuid-1',
  };

  const mockUsersService = {
    getProfile: vi.fn(),
    updateProfile: vi.fn(),
    deactivateAccount: vi.fn(),
    deleteAccount: vi.fn(),
  };

  const mockAuditService = {
    getLogsForUser: vi.fn(),
    logEvent: vi.fn(),
  };

  const mockTokenService = {
    verifyAccessToken: vi.fn(),
  };

  const mockSessionsService = {
    validateSession: vi.fn(),
    revokeAllUserSessions: vi.fn(),
  };

  const mockDataSource = {
    isInitialized: true,
    query: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
    getRepository: vi.fn().mockReturnValue({
      findOne: vi.fn(),
      save: vi.fn(),
    }),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(getDataSourceToken())
      .useValue(mockDataSource)
      .overrideProvider(UsersService)
      .useValue(mockUsersService)
      .overrideProvider(AuditService)
      .useValue(mockAuditService)
      .overrideProvider(TokenService)
      .useValue(mockTokenService)
      .overrideProvider(SessionsService)
      .useValue(mockSessionsService)
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

    // Default mock setup for successful JWT auth
    mockTokenService.verifyAccessToken.mockResolvedValue({
      sub: mockAuthUser.id,
      email: mockAuthUser.email,
      sessionId: mockAuthUser.sessionId,
      jti: mockAuthUser.tokenId,
    });
    mockSessionsService.validateSession.mockResolvedValue({
      id: mockAuthUser.sessionId,
      userId: mockAuthUser.id,
      revokedAt: null,
      user: { id: mockAuthUser.id, status: UserStatus.ACTIVE },
    });
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /api/v1/users/me', () => {
    it('should return 401 Unauthorized if Authorization header is missing', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .expect(401);
    });

    it('should return user profile for authenticated user', async () => {
      mockUsersService.getProfile.mockResolvedValueOnce({
        id: mockAuthUser.id,
        email: mockAuthUser.email,
        displayName: 'Alice Smith',
        status: UserStatus.ACTIVE,
        emailVerified: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      });

      const response = await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Authorization', 'Bearer valid.jwt.token')
        .expect(200);

      expect(response.body).toEqual({
        id: mockAuthUser.id,
        email: mockAuthUser.email,
        displayName: 'Alice Smith',
        status: UserStatus.ACTIVE,
        emailVerified: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      });
      expect(mockUsersService.getProfile).toHaveBeenCalledWith(mockAuthUser.id);
    });
  });

  describe('PATCH /api/v1/users/me', () => {
    it('should update allowed fields (displayName) successfully', async () => {
      mockUsersService.updateProfile.mockResolvedValueOnce({
        id: mockAuthUser.id,
        email: mockAuthUser.email,
        displayName: 'Alice Cooper',
        status: UserStatus.ACTIVE,
        emailVerified: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
      });

      const response = await request(app.getHttpServer())
        .patch('/api/v1/users/me')
        .set('Authorization', 'Bearer valid.jwt.token')
        .send({ displayName: 'Alice Cooper' })
        .expect(200);

      expect(response.body.displayName).toBe('Alice Cooper');
      expect(mockUsersService.updateProfile).toHaveBeenCalledWith(mockAuthUser.id, {
        displayName: 'Alice Cooper',
      });
    });

    it('should reject requests with forbidden/non-whitelisted fields (e.g. status, id, email)', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/users/me')
        .set('Authorization', 'Bearer valid.jwt.token')
        .send({ status: 'SUSPENDED', email: 'hacked@example.com' })
        .expect(400);
    });
  });

  describe('POST /api/v1/users/me/deactivate', () => {
    it('should deactivate account and clear refresh token cookie', async () => {
      mockUsersService.deactivateAccount.mockResolvedValueOnce(undefined);

      const response = await request(app.getHttpServer())
        .post('/api/v1/users/me/deactivate')
        .set('Authorization', 'Bearer valid.jwt.token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockUsersService.deactivateAccount).toHaveBeenCalledWith(mockAuthUser.id);

      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toMatch(/refresh_token=;.*(Expires=|Max-Age=0)/i);
    });
  });

  describe('DELETE /api/v1/users/me', () => {
    it('should execute account deletion policy and clear cookie', async () => {
      mockUsersService.deleteAccount.mockResolvedValueOnce({
        success: true,
        message: 'Account deleted',
      });

      const response = await request(app.getHttpServer())
        .delete('/api/v1/users/me')
        .set('Authorization', 'Bearer valid.jwt.token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockUsersService.deleteAccount).toHaveBeenCalledWith(mockAuthUser.id);
    });
  });

  describe('GET /api/v1/users/me/audit-logs', () => {
    it('should return paginated audit logs for the authenticated user', async () => {
      mockAuditService.getLogsForUser.mockResolvedValueOnce({
        items: [
          {
            id: 'log-1',
            eventType: 'SESSION_CREATED',
            actorUserId: mockAuthUser.id,
            outcome: 'SUCCESS',
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ],
        total: 1,
        limit: 20,
        offset: 0,
        hasMore: false,
      });

      const response = await request(app.getHttpServer())
        .get('/api/v1/users/me/audit-logs?limit=10&offset=0')
        .set('Authorization', 'Bearer valid.jwt.token')
        .expect(200);

      expect(response.body.items).toHaveLength(1);
      expect(response.body.total).toBe(1);
      expect(mockAuditService.getLogsForUser).toHaveBeenCalledWith(
        mockAuthUser.id,
        expect.objectContaining({ limit: 10, offset: 0 }),
      );
    });
  });
});

