import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const url = configService.get<string>('database.url');
        const host = configService.get<string>('database.host');
        const port = configService.get<number>('database.port');
        const username = configService.get<string>('database.user');
        const password = configService.get<string>('database.password');
        const database = configService.get<string>('database.name');
        const ssl = configService.get<boolean>('database.ssl');
        const isDevelopment =
          configService.get<string>('nodeEnv') === 'development';

        return {
          type: 'postgres',
          ...(url
            ? { url }
            : {
                host,
                port,
                username,
                password,
                database,
              }),
          ssl: ssl ? { rejectUnauthorized: false } : false,
          synchronize: false, // Strict requirement: schema synchronization must remain disabled
          migrationsRun: false, // Migrations are version-controlled and run explicitly, not on startup
          autoLoadEntities: true,
          logging: isDevelopment,
        };
      },
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
