import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EnrollmentInvitation } from './entities/enrollment-invitation.entity.js';
import { EnrollmentService } from './enrollment.service.js';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([EnrollmentInvitation])],
  providers: [EnrollmentService],
  exports: [EnrollmentService, TypeOrmModule],
})
export class EnrollmentModule {}

