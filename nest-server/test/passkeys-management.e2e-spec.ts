import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  VersioningType,
  BadRequestException,
} from '@nestjs/common';
import { getDataSourceToken } from '@nestjs/typeorm';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module.js';
import { PasskeysService } from '../src/passkeys/passkeys.service.js';
import { AuthService } from '../src/auth/auth.service.js';
import { TokenService } from '../src/auth/token.service.js';
import { SessionsService } from '../src/sessions/sessions.service.js';
import { UserStatus } from '../src/users/entities/user.entity.js';
import type {
  AuthenticatedUser,
  PasskeySummary,
} from '../src/common/types/index.js';

describe('Passkeys & Credential Management (e2e)', () => {
  let app: INestApplication;

  const mockAuthUser: AuthenticatedUser = {
    id: 'user-uuid-1',
    email: 'alice@example.com',
    sessionId: 'session-uuid-1',
    tokenId: 'token-uuid-1',
  };

  const mockPasskeysService = {
    listUserPasskeys: vi.fn(),
    renamePasskey: vi.fn(),
    revokePasskey: vi.fn(),
  };

  const mockAuthService = {
    generateRegistrationOptions: vi.fn(),
  };

  const mockTokenService = {
    verifyAccessToken: vi.fn(),
  };

  const mockSessionsService = {
    validateSession: vi.fn(),
  };

  const mockDataSource = {
    isInitialized: true,
    entityMetadatas: [],
    options: { type: 'postgres' },
    destroy: vi.fn().mockResolvedValue(undefined),
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
      .overrideProvider(PasskeysService)
      .useValue(mockPasskeysService)
      .overrideProvider(AuthService)
      .useValue(mockAuthService)
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

  describe('GET /api/v1/passkeys', () => {
    it('should return safe passkey summaries for authenticated user', async () => {
      const mockList: PasskeySummary[] = [
        {
          id: 'cred-db-1',
          credentialId: 'webauthn-id-1',
          label: 'MacBook Touch ID',
          deviceType: 'singleDevice',
          backedUp: false,
          transports: ['internal'],
          createdAt: '2026-01-01T00:00:00.000Z',
          lastUsedAt: '2026-01-02T00:00:00.000Z',
          isRevoked: false,
        },
      ];

      mockPasskeysService.listUserPasskeys.mockResolvedValueOnce(mockList);

      const response = await request(app.getHttpServer())
        .get('/api/v1/passkeys')
        .set('Authorization', 'Bearer valid.jwt.token')
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].label).toBe('MacBook Touch ID');
      expect(response.body[0].publicKey).toBeUndefined();
      expect(mockPasskeysService.listUserPasskeys).toHaveBeenCalledWith(
        mockAuthUser.id,
      );
    });

    it('should return 401 Unauthorized if request lacks Bearer token', async () => {
      await request(app.getHttpServer()).get('/api/v1/passkeys').expect(401);
    });
  });

  describe('PATCH /api/v1/passkeys/:id', () => {
    it('should rename passkey label successfully', async () => {
      mockPasskeysService.renamePasskey.mockResolvedValueOnce({
        id: 'c4b9d0b8-158a-4934-8b65-726ef352d0d1',
        label: 'Work Laptop',
      });

      const response = await request(app.getHttpServer())
        .patch('/api/v1/passkeys/c4b9d0b8-158a-4934-8b65-726ef352d0d1')
        .set('Authorization', 'Bearer valid.jwt.token')
        .send({ label: 'Work Laptop' })
        .expect(200);

      expect(response.body.label).toBe('Work Laptop');
      expect(mockPasskeysService.renamePasskey).toHaveBeenCalledWith(
        'c4b9d0b8-158a-4934-8b65-726ef352d0d1',
        mockAuthUser.id,
        'Work Laptop',
      );
    });

    it('should reject invalid UUIDs with 400 Bad Request', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/passkeys/not-a-valid-uuid')
        .set('Authorization', 'Bearer valid.jwt.token')
        .send({ label: 'Work Laptop' })
        .expect(400);
    });
  });

  describe('DELETE /api/v1/passkeys/:id (Last-Passkey Safeguard)', () => {
    it('should reject revocation with 400 Bad Request if it is the only active passkey', async () => {
      mockPasskeysService.revokePasskey.mockRejectedValueOnce(
        new BadRequestException('Cannot remove your only active passkey.'),
      );

      const response = await request(app.getHttpServer())
        .delete('/api/v1/passkeys/c4b9d0b8-158a-4934-8b65-726ef352d0d1')
        .set('Authorization', 'Bearer valid.jwt.token')
        .expect(400);

      expect(response.body.message).toContain(
        'Cannot remove your only active passkey',
      );
    });

    it('should successfully revoke passkey if account has multiple passkeys', async () => {
      mockPasskeysService.revokePasskey.mockResolvedValueOnce(undefined);

      const response = await request(app.getHttpServer())
        .delete('/api/v1/passkeys/c4b9d0b8-158a-4934-8b65-726ef352d0d1')
        .set('Authorization', 'Bearer valid.jwt.token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockPasskeysService.revokePasskey).toHaveBeenCalledWith(
        'c4b9d0b8-158a-4934-8b65-726ef352d0d1',
        mockAuthUser.id,
      );
    });
  });

  describe('POST /api/v1/passkeys/registration/options', () => {
    it('should generate enrollment options for adding an additional passkey to current account', async () => {
      mockAuthService.generateRegistrationOptions.mockResolvedValueOnce({
        challengeId: 'new-challenge-uuid',
        options: { challenge: 'new-challenge' },
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/passkeys/registration/options')
        .set('Authorization', 'Bearer valid.jwt.token')
        .expect(200);

      expect(response.body.challengeId).toBe('new-challenge-uuid');
      expect(mockAuthService.generateRegistrationOptions).toHaveBeenCalledWith(
        { email: mockAuthUser.email },
        mockAuthUser.id,
      );
    });
  });
});
