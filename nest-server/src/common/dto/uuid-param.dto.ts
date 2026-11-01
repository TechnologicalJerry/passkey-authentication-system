import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UUIDParamDto {
  @ApiProperty({
    description: 'Unique resource identifier (UUID v4)',
    example: 'c4b9d0b8-158a-4934-8b65-726ef352d0d1',
  })
  @IsUUID('4', { message: 'id must be a valid UUID v4' })
  id!: string;
}

