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

describe('App Bootstrap & Routing (e2e)', () => {
  let app: INestApplication;

  const mockRepository = {
    find: vi.fn().mockResolvedValue([]),
    findOne: vi.fn().mockResolvedValue(null),
    count: vi.fn().mockResolvedValue(0),
    create: vi.fn((e) => e),
    save: vi.fn((e) => Promise.resolve(e)),
    createQueryBuilder: vi.fn(),
  };

  const mockDataSource = {
    isInitialized: true,
    entityMetadatas: [],
    options: { type: 'postgres' },
    destroy: vi.fn().mockResolvedValue(undefined),
    query: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
    getRepository: vi.fn().mockReturnValue(mockRepository),
    transaction: vi.fn((cb: any) =>
      cb({
        getRepository: vi.fn().mockReturnValue(mockRepository),
      }),
    ),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(getDataSourceToken())
      .useValue(mockDataSource)
      .compile();

    app = moduleFixture.createNestApplication();

    // Replicate bootstrap configuration
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
    await app.listen(0, '127.0.0.1');
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /api (Root)', async () => {
    const response = await request(app.getHttpServer()).get('/api').expect(200);

    expect(response.body).toHaveProperty('name', 'Passkey Authentication API');
    expect(response.body).toHaveProperty('status', 'running');
  });

  it('GET /api/v1/non-existent-route returns standard 404 error format', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/non-existent-route')
      .expect(404);

    expect(response.body).toMatchObject({
      statusCode: 404,
      error: 'Not Found',
      path: '/api/v1/non-existent-route',
    });
    expect(response.body.timestamp).toBeDefined();
  });
});
