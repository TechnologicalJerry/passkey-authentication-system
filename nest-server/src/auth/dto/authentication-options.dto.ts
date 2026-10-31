import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsOptional } from 'class-validator';

export class AuthenticationOptionsDto {
  @ApiPropertyOptional({
    example: 'user@example.com',
    description:
      'Optional user email address. When omitted, enables discoverable credentials (usernameless / passkey autofill).',
  })
  @IsOptional()
  @IsEmail({}, { message: 'If provided, email must be a valid email address' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email?: string;
}

