import { ApiProperty } from '@nestjs/swagger';

export class PasskeySummaryDto {
  @ApiProperty({ example: 'c4b9d0b8-158a-4934-8b65-726ef352d0d1' })
  id!: string;

  @ApiProperty({ example: 'dBjFTY_7n...cred-id' })
  credentialId!: string;

  @ApiProperty({ example: 'MacBook Touch ID' })
  label!: string;

  @ApiProperty({ example: 'multiDevice', nullable: true })
  deviceType!: string | null;

  @ApiProperty({ example: true })
  backedUp!: boolean;

  @ApiProperty({ example: ['internal', 'hybrid'], nullable: true })
  transports!: string[] | null;

  @ApiProperty({ example: '2026-11-01T20:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-11-01T22:30:00.000Z', nullable: true })
  lastUsedAt!: string | null;

  @ApiProperty({ example: false })
  isRevoked!: boolean;
}

