import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { getDataSourceToken } from '@nestjs/typeorm';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { AuthService } from '../src/auth/auth.service.js';

describe('Passkey Authentication Ceremony (e2e)', () => {
  let app: INestApplication;

  const mockAuthService = {
    generateRegistrationOptions: vi.fn(),
    verifyRegistration: vi.fn(),
    generateAuthenticationOptions: vi.fn(),
    verifyAuthentication: vi.fn(),
  };

  const mockDataSource = {
    isInitialized: true,
    query: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(getDataSourceToken())
      .useValue(mockDataSource)
      .overrideProvider(AuthService)
      .useValue(mockAuthService)
      .compile();

    app = moduleFixture.createNestApplication();

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

  describe('POST /api/v1/auth/passkeys/authentication/options', () => {
    it('should generate discoverable options when email is not provided', async () => {
      const mockResult = {
        challengeId: '6fa459ea-ee8a-3ca4-894e-db77e160355e',
        options: {
          challenge: 'mock-auth-challenge-bytes',
          rpId: 'localhost',
          timeout: 60000,
          userVerification: 'preferred',
          allowCredentials: [],
        },
      };
      mockAuthService.generateAuthenticationOptions.mockResolvedValueOnce(mockResult);

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/passkeys/authentication/options')
        .send({})
        .expect(200);

      expect(response.body).toEqual(mockResult);
      expect(mockAuthService.generateAuthenticationOptions).toHaveBeenCalledWith({});
    });

    it('should generate user-targeted options when email is provided', async () => {
      const mockResult = {
        challengeId: '6fa459ea-ee8a-3ca4-894e-db77e160355e',
        options: {
          challenge: 'mock-auth-challenge-bytes',
          rpId: 'localhost',
          allowCredentials: [{ id: 'cred-1', transports: ['internal'] }],
        },
      };
      mockAuthService.generateAuthenticationOptions.mockResolvedValueOnce(mockResult);

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/passkeys/authentication/options')
        .send({ email: 'user@example.com' })
        .expect(200);

      expect(response.body).toEqual(mockResult);
      expect(mockAuthService.generateAuthenticationOptions).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'user@example.com' }),
      );
    });

    it('should reject invalid email format with 400 Bad Request', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/passkeys/authentication/options')
        .send({ email: 'invalid-email' })
        .expect(400);
    });
  });

  describe('POST /api/v1/auth/passkeys/authentication/verify', () => {
    it('should return 200 and verified user info on valid assertion', async () => {
      const mockSuccessResult = {
        verified: true,
        user: {
          id: 'user-uuid-1234',
          email: 'user@example.com',
          status: 'ACTIVE',
          emailVerified: true,
          createdAt: new Date().toISOString(),
        },
      };
      mockAuthService.verifyAuthentication.mockResolvedValueOnce(mockSuccessResult);

      const validPayload = {
        challengeId: '6fa459ea-ee8a-3ca4-894e-db77e160355e',
        response: {
          id: 'credential-id-base64',
          rawId: 'credential-id-base64',
          type: 'public-key',
          response: {
            clientDataJSON: 'client-data-base64',
            authenticatorData: 'auth-data-base64',
            signature: 'sig-base64',
            userHandle: 'user-uuid-base64',
          },
        },
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/passkeys/authentication/verify')
        .send(validPayload)
        .expect(200);

      expect(response.body).toEqual(mockSuccessResult);
      expect(mockAuthService.verifyAuthentication).toHaveBeenCalled();
    });

    it('should reject invalid challenge UUID with 400 Bad Request', async () => {
      const invalidPayload = {
        challengeId: 'invalid-uuid',
        response: {
          id: 'cred-1',
          rawId: 'cred-1',
          type: 'public-key',
          response: {
            clientDataJSON: 'cdj',
            authenticatorData: 'ad',
            signature: 'sig',
          },
        },
      };

      await request(app.getHttpServer())
        .post('/api/v1/auth/passkeys/authentication/verify')
        .send(invalidPayload)
        .expect(400);
    });
  });
});

