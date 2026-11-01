import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PasskeyCredential } from './entities/passkey-credential.entity.js';
import { PasskeysService } from './passkeys.service.js';
import { PasskeysController } from './passkeys.controller.js';
import { AuthModule } from '../auth/auth.module.js';
import { SessionsModule } from '../sessions/sessions.module.js';
import { AuditModule } from '../audit/audit.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([PasskeyCredential]),
    forwardRef(() => AuthModule),
    forwardRef(() => SessionsModule),
    AuditModule,
  ],
  controllers: [PasskeysController],
  providers: [PasskeysService],
  exports: [PasskeysService, TypeOrmModule],
})
export class PasskeysModule { }
