import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { Session } from './entities/session.entity.js';
import { SessionsService } from './sessions.service.js';
import { SessionsController } from './sessions.controller.js';
import { TokenService } from '../auth/token.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Session]),
    JwtModule.register({}),
    ConfigModule,
  ],
  controllers: [SessionsController],
  providers: [SessionsService, TokenService],
  exports: [SessionsService, TokenService, TypeOrmModule],
})
export class SessionsModule {}

