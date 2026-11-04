import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class RenamePasskeyDto {
  @ApiProperty({
    description: 'Updated user-defined device label for the passkey',
    example: 'Work Laptop Touch ID',
    minLength: 1,
    maxLength: 128,
  })
  @IsNotEmpty({ message: 'Label cannot be empty' })
  @IsString({ message: 'Label must be a string' })
  @MinLength(1, { message: 'Label must have at least 1 character' })
  @MaxLength(128, { message: 'Label cannot exceed 128 characters' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  label!: string;
}
