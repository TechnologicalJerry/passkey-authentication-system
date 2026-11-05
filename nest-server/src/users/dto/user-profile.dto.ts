import { ApiProperty } from '@nestjs/swagger';
import { UserStatus } from '../entities/user.entity.js';

export class UserProfileDto {
  @ApiProperty({ example: 'c4b9d0b8-158a-4934-8b65-726ef352d0d1' })
  id!: string;

  @ApiProperty({ example: 'user@example.com' })
  email!: string;

  @ApiProperty({ example: 'Alice Smith', nullable: true })
  displayName!: string | null;

  @ApiProperty({ enum: UserStatus, example: UserStatus.ACTIVE })
  status!: UserStatus;

  @ApiProperty({ example: true })
  emailVerified!: boolean;

  @ApiProperty({ example: '2026-11-01T20:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-11-01T21:00:00.000Z' })
  updatedAt!: string;
}
