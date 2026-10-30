import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { HealthService } from './health.service.js';
import type { HealthCheckResult } from '../common/types/index.js';

@ApiTags('Health')
@Controller({
  path: 'health',
  version: '1',
})
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('live')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Application liveness probe',
    description: 'Indicates whether the application process is running and responding.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The application process is healthy and active.',
    schema: {
      example: {
        status: 'ok',
        uptime: 12.34,
        timestamp: '2026-10-30T12:00:00.000Z',
      },
    },
  })
  getLiveness(): HealthCheckResult {
    return this.healthService.checkLiveness();
  }

  @Get('ready')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Application readiness probe',
    description: 'Indicates whether essential dependencies (PostgreSQL) are connected and ready to serve requests.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Application dependencies are available and operational.',
    schema: {
      example: {
        status: 'ok',
        details: {
          database: {
            status: 'up',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'One or more essential dependencies are unavailable.',
    schema: {
      example: {
        status: 'error',
        details: {
          database: {
            status: 'down',
          },
        },
      },
    },
  })
  async getReadiness(): Promise<HealthCheckResult> {
    return await this.healthService.checkReadiness();
  }
}

