import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { getDataSourceToken } from '@nestjs/typeorm';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { AuthService } from '../src/auth/auth.service.js';

describe('Route-Specific Rate Limiting (e2e)', () => {
  let app: INestApplication;

  const mockAuthService = {
    generateRegistrationOptions: vi.fn().mockResolvedValue({
      challengeId: 'mock-id',
      options: {},
    }),
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

  it('POST /api/v1/auth/passkeys/registration/options enforces rate limiting and returns 429 when threshold exceeded', async () => {
    const payload = { email: 'throttletest@example.com' };

    // Send 5 permitted requests (limit is 5 per minute)
    for (let i = 0; i < 5; i++) {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/passkeys/registration/options')
        .send(payload);
      expect([200, 429]).toContain(res.status);
    }

    // The 6th request must trigger the throttler and return 429 Too Many Requests
    const rateLimitedRes = await request(app.getHttpServer())
      .post('/api/v1/auth/passkeys/registration/options')
      .send(payload);

    expect(rateLimitedRes.status).toBe(429);
    expect(rateLimitedRes.body.statusCode).toBe(429);
    expect(rateLimitedRes.body.message).toContain('ThrottlerException');
  });
});
