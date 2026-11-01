import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { getDataSourceToken } from '@nestjs/typeorm';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { AuthService } from '../src/auth/auth.service.js';

describe('Passkey Registration Ceremony (e2e)', () => {
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

  describe('POST /api/v1/auth/passkeys/registration/options', () => {
    it('should generate registration options for a valid email address', async () => {
      const mockResult = {
        challengeId: '6fa459ea-ee8a-3ca4-894e-db77e160355e',
        options: {
          challenge: 'mock-crypto-challenge-bytes',
          rp: { name: 'Passkey Authentication System', id: 'localhost' },
          user: { id: 'user-id', name: 'user@example.com', displayName: 'User' },
          pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
          timeout: 60000,
        },
      };
      mockAuthService.generateRegistrationOptions.mockResolvedValueOnce(mockResult);

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/passkeys/registration/options')
        .send({ email: 'user@example.com', displayName: 'User' })
        .expect(200);

      expect(response.body).toEqual(mockResult);
      expect(mockAuthService.generateRegistrationOptions).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'user@example.com', displayName: 'User' }),
      );
    });

    it('should reject invalid email formats with 400 Bad Request', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/passkeys/registration/options')
        .send({ email: 'not-an-email' })
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
      expect(JSON.stringify(response.body)).toContain('email');
    });

    it('should reject extra non-whitelisted request properties with 400 Bad Request', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/passkeys/registration/options')
        .send({
          email: 'user@example.com',
          maliciousField: 'exploit',
        })
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
      expect(JSON.stringify(response.body)).toContain('maliciousField');
    });
  });

  describe('POST /api/v1/auth/passkeys/registration/verify', () => {
    it('should return 200 and verified user info on valid attestation', async () => {
      const mockSuccessResult = {
        verified: true,
        user: {
          id: 'user-uuid-1234',
          email: 'user@example.com',
          status: 'ACTIVE',
          emailVerified: false,
          createdAt: new Date().toISOString(),
        },
      };
      mockAuthService.verifyRegistration.mockResolvedValueOnce(mockSuccessResult);

      const validPayload = {
        challengeId: '6fa459ea-ee8a-3ca4-894e-db77e160355e',
        response: {
          id: 'credential-id-base64',
          rawId: 'credential-id-base64',
          type: 'public-key',
          response: {
            clientDataJSON: 'client-data-base64',
            attestationObject: 'attestation-base64',
          },
        },
        label: 'My Touch ID',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/passkeys/registration/verify')
        .send(validPayload)
        .expect(200);

      expect(response.body).toEqual(mockSuccessResult);
      expect(mockAuthService.verifyRegistration).toHaveBeenCalled();
    });

    it('should reject invalid challenge UUID with 400 Bad Request', async () => {
      const invalidPayload = {
        challengeId: 'not-a-uuid',
        response: {
          id: 'credential-id',
          rawId: 'credential-id',
          type: 'public-key',
          response: {
            clientDataJSON: 'client-data',
            attestationObject: 'attestation',
          },
        },
      };

      await request(app.getHttpServer())
        .post('/api/v1/auth/passkeys/registration/verify')
        .send(invalidPayload)
        .expect(400);
    });
  });
});

