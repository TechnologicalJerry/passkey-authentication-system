import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class RegistrationOptionsDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address to register with a new passkey credential',
  })
  @IsEmail({}, { message: 'A valid email address is required' })
  @IsNotEmpty({ message: 'Email must not be empty' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email!: string;

  @ApiPropertyOptional({
    example: 'Alice User',
    description: 'Optional user display name for authenticator metadata',
  })
  @IsOptional()
  @IsString({ message: 'Display name must be a string' })
  @MaxLength(64, { message: 'Display name cannot exceed 64 characters' })
  displayName?: string;
}

