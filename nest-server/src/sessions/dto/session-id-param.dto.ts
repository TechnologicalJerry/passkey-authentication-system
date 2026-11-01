import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class SessionIdParamDto {
  @ApiProperty({
    description: 'Unique session identifier (UUID v4)',
    example: 'd9b2d63d-a233-4f9e-9d22-1d5e22709210',
  })
  @IsUUID('4', { message: 'Session ID must be a valid UUID v4' })
  @IsNotEmpty({ message: 'Session ID is required' })
  id!: string;
}

