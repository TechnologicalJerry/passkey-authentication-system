import {
  Injectable,
  ServiceUnavailableException,
  Logger,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import type { HealthCheckResult } from '../common/types/index.js';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  checkLiveness(): HealthCheckResult {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }

  async checkReadiness(): Promise<HealthCheckResult> {
    try {
      if (!this.dataSource.isInitialized) {
        throw new Error('Database data source is not initialized');
      }

      // Lightweight probe query to verify active connectivity
      await this.dataSource.query('SELECT 1');

      return {
        status: 'ok',
        details: {
          database: {
            status: 'up',
          },
        },
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown database error';
      this.logger.error(`Database readiness check failed: ${errorMessage}`);

      // Never expose credentials, connection strings, or query specifics to the caller
      throw new ServiceUnavailableException({
        status: 'error',
        details: {
          database: {
            status: 'down',
          },
        },
      });
    }
  }
}
