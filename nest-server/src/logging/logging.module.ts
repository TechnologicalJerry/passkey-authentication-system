import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { SENSITIVE_LOG_KEYS } from '../common/constants/app.constants.js';

@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const isProduction =
          configService.get<string>('nodeEnv') === 'production';
        const logLevel = configService.get<string>('logging.level') ?? 'info';

        return {
          pinoHttp: {
            level: logLevel,
            transport: !isProduction
              ? {
                  target: 'pino-pretty',
                  options: {
                    colorize: true,
                    singleLine: true,
                    translateTime: 'SYS:standard',
                    ignore: 'pid,hostname',
                  },
                }
              : undefined,
            redact: {
              paths: [...SENSITIVE_LOG_KEYS],
              censor: '[REDACTED]',
            },
            autoLogging: {
              ignore: (req) => {
                // Prevent health checks from spamming logs
                return req.url?.includes('/health') ?? false;
              },
            },
            serializers: {
              req(req) {
                return {
                  id: req.id,
                  method: req.method,
                  url: req.url,
                  query: req.query,
                  params: req.params,
                };
              },
            },
          },
        };
      },
    }),
  ],
  exports: [PinoLoggerModule],
})
export class LoggingModule {}
