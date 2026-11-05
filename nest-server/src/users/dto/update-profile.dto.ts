import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({
    description: 'Updated user display name',
    example: 'Alice Smith',
    maxLength: 128,
  })
  @IsOptional()
  @IsString({ message: 'displayName must be a string' })
  @MaxLength(128, { message: 'displayName cannot exceed 128 characters' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  displayName?: string;
}
