import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ServiceUnavailableException } from '@nestjs/common';
import type { DataSource } from 'typeorm';
import { HealthService } from './health.service.js';
import { HealthController } from './health.controller.js';

describe('HealthController and HealthService', () => {
  let healthService: HealthService;
  let healthController: HealthController;
  let mockDataSource: {
    isInitialized: boolean;
    query: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockDataSource = {
      isInitialized: true,
      query: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
    };

    healthService = new HealthService(mockDataSource as unknown as DataSource);
    healthController = new HealthController(healthService);
  });

  describe('Liveness probe', () => {
    it('should report liveness status as ok with uptime and timestamp', () => {
      const result = healthController.getLiveness();

      expect(result.status).toBe('ok');
      expect(typeof result.uptime).toBe('number');
      expect(result.timestamp).toBeDefined();
    });
  });

  describe('Readiness probe', () => {
    it('should report readiness status as ok when database query succeeds', async () => {
      const result = await healthController.getReadiness();

      expect(result.status).toBe('ok');
      expect(result.details?.['database']).toEqual({ status: 'up' });
      expect(mockDataSource.query).toHaveBeenCalledWith('SELECT 1');
    });

    it('should throw ServiceUnavailableException (503) when database is not initialized', async () => {
      mockDataSource.isInitialized = false;

      await expect(healthController.getReadiness()).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('should throw ServiceUnavailableException (503) when database query fails', async () => {
      mockDataSource.query.mockRejectedValue(
        new Error('Connection refused to postgres:5432'),
      );

      await expect(healthController.getReadiness()).rejects.toThrow(
        ServiceUnavailableException,
      );

      try {
        await healthController.getReadiness();
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(ServiceUnavailableException);
        const exception = err as ServiceUnavailableException;
        const response = exception.getResponse() as Record<string, unknown>;
        expect(response['status']).toBe('error');
        expect(response['details']).toEqual({ database: { status: 'down' } });
        // Ensure connection info / internal error message is never exposed
        expect(JSON.stringify(response)).not.toContain('Connection refused');
      }
    });
  });
});
