import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { createObserveModule } from '@nestjs/observe';
import configuration from './config/configuration.js';
import { environmentValidationSchema } from './config/env.validation.js';
import { LoggingModule } from './logging/logging.module.js';
import { DatabaseModule } from './database/database.module.js';
import { AuditModule } from './audit/audit.module.js';
import { EnrollmentModule } from './enrollment/enrollment.module.js';
import { HealthModule } from './health/health.module.js';
import { UsersModule } from './users/users.module.js';
import { PasskeysModule } from './passkeys/passkeys.module.js';
import { AuthModule } from './auth/auth.module.js';
import { SessionsModule } from './sessions/sessions.module.js';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    // Centralized environment configuration with strict Joi schema validation
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: environmentValidationSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),

    // Structured logging via Pino
    LoggingModule,

    // Global Rate limiting with configurable TTL and limit
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          ttl: configService.get<number>('throttler.ttl') ?? 60000,
          limit: configService.get<number>('throttler.limit') ?? 100,
        },
      ],
    }),

    // Database connectivity and TypeORM configuration
    DatabaseModule,

    // Audit trail and Enrollment security boundaries
    AuditModule,
    EnrollmentModule,

    // Core Identity, Passkey Authentication, and Session Management modules
    UsersModule,
    PasskeysModule,
    AuthModule,
    SessionsModule,

    // Liveness and readiness health checks
    HealthModule,

    // Existing Observe integration for distributed tracing and performance telemetry
    ObserveModule.forRoot({
      appKey: process.env.OBSERVE_APP_KEY ?? 'OPTIONAL_KEY',
      appSecret: process.env.OBSERVE_APP_SECRET ?? 'OPTIONAL_SECRET',
      serviceId: 'passkey-authentication-system',
    }),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule {}
