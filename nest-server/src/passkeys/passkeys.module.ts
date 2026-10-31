import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PasskeyCredential } from './entities/passkey-credential.entity.js';
import { PasskeysService } from './passkeys.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([PasskeyCredential])],
  providers: [PasskeysService],
  exports: [PasskeysService, TypeOrmModule],
})
export class PasskeysModule {}

