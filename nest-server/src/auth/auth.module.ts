import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from '../users/users.module.js';
import { PasskeysModule } from '../passkeys/passkeys.module.js';
import { AuthChallenge } from './entities/auth-challenge.entity.js';
import { AuthService } from './auth.service.js';
import { ChallengeService } from './challenge.service.js';
import { AuthController } from './auth.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([AuthChallenge]),
    ConfigModule,
    UsersModule,
    PasskeysModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, ChallengeService],
  exports: [AuthService, ChallengeService],
})
export class AuthModule {}

