import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule, ObserveInstrument } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    instrument: ObserveInstrument,
    bufferLogs: true,
  });

  const configService = app.get(ConfigService);
  const logger = app.get(Logger);

  // Set Pino as the primary NestJS logger
  app.useLogger(logger);

  // Enable graceful shutdown hooks
  app.enableShutdownHooks();

  // Security headers with Helmet
  app.use(helmet());

  // Parse HTTP cookies for secure refresh-token delivery
  app.use(cookieParser());

  // CORS configuration with explicit allowlist and credentials enabled
  const isProduction = configService.get<string>('nodeEnv') === 'production';
  const allowedOrigins = configService.get<string[]>('cors.origins') ?? ['http://localhost:3000'];

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g., mobile apps, curl, server-to-server)
      if (!origin) {
        return callback(null, true);
      }
      if (allowedOrigins.includes(origin) || (!isProduction && allowedOrigins.includes('*'))) {
        return callback(null, true);
      }
      return callback(new Error(`Origin '${origin}' not allowed by CORS policy`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  });

  // Global API routing prefix and URI-based API versioning
  const apiPrefix = configService.get<string>('api.prefix') ?? 'api';
  const defaultVersion = configService.get<string>('api.version') ?? '1';

  app.setGlobalPrefix(apiPrefix);
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion,
  });

  // Strict global request validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // OpenAPI / Swagger Documentation
  const swaggerEnabled = configService.get<boolean>('swagger.enabled') ?? false;
  if (swaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Passkey Authentication API')
      .setDescription(
        'Production-grade passwordless authentication backend using WebAuthn/FIDO2 passkeys',
      )
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'Authorization',
          description: 'Provide your bearer token for authenticated operations',
          in: 'header',
        },
        'bearer',
      )
      .addTag('Passkey Authentication', 'WebAuthn passkey registration and authentication ceremonies')
      .addTag('Sessions & Tokens', 'Session lifecycle, refresh token rotation, and logout')
      .addTag('Health', 'System liveness and dependency readiness probes')
      .addTag('Root', 'Core service information and root endpoints')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    const swaggerDocPath = `${apiPrefix}/docs`;

    SwaggerModule.setup(swaggerDocPath, app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });

    logger.log(`Swagger documentation configured at: /${swaggerDocPath}`);
  }

  const port = configService.get<number>('port') ?? 3000;
  await app.listen(port);

  logger.log(`Application started in '${configService.get<string>('nodeEnv')}' mode on port ${port}`);
  logger.log(`API Prefix: /${apiPrefix}, Default Version: v${defaultVersion}`);
}

await bootstrap();
