import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, VersioningType } from '@nestjs/common';
import { getDataSourceToken } from '@nestjs/typeorm';
import request from 'supertest';
import { HealthController } from '../src/health/health.controller.js';
import { HealthService } from '../src/health/health.service.js';

describe('Health Endpoints (e2e)', () => {
  let app: INestApplication;
  const mockDataSource = {
    isInitialized: true,
    query: vi.fn(),
    destroy: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    mockDataSource.isInitialized = true;
    mockDataSource.query.mockReset();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        HealthService,
        {
          provide: getDataSourceToken(),
          useValue: mockDataSource,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Match production prefix and URI versioning
    app.setGlobalPrefix('api');
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
    });

    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /api/v1/health/live', () => {
    it('should return 200 with process liveness status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/health/live')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'ok',
      });
      expect(typeof response.body.uptime).toBe('number');
      expect(typeof response.body.timestamp).toBe('string');
    });
  });

  describe('GET /api/v1/health/ready', () => {
    it('should return 200 when database dependency is healthy', async () => {
      mockDataSource.query.mockResolvedValueOnce([{ '?column?': 1 }]);

      const response = await request(app.getHttpServer())
        .get('/api/v1/health/ready')
        .expect(200);

      expect(response.body).toEqual({
        status: 'ok',
        details: {
          database: {
            status: 'up',
          },
        },
      });
      expect(mockDataSource.query).toHaveBeenCalledWith('SELECT 1');
    });

    it('should return 503 when database is not connected or query fails', async () => {
      mockDataSource.query.mockRejectedValueOnce(new Error('Connection lost'));

      const response = await request(app.getHttpServer())
        .get('/api/v1/health/ready')
        .expect(503);

      expect(response.body).toMatchObject({
        status: 'error',
        details: {
          database: {
            status: 'down',
          },
        },
      });
      // Verify sensitive details are not leaked in the response body
      expect(JSON.stringify(response.body)).not.toContain('Connection lost');
    });
  });
});
