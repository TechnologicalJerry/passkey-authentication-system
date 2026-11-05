import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiPropertyOptional({
    description:
      'Raw refresh token string. Optional if the refresh token is delivered via HttpOnly cookie.',
    example: 'dGhpcy1pcy1hLXJhbmRvbS1yZWZyZXNoLXRva2Vu',
  })
  @IsOptional()
  @IsString({ message: 'Refresh token must be a string' })
  refreshToken?: string;
}
