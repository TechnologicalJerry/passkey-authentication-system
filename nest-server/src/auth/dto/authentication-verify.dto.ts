import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export class AuthenticatorAssertionResponseDto {
  @ApiProperty({ description: 'Base64URL encoded client data JSON' })
  @IsString()
  @IsNotEmpty()
  clientDataJSON!: string;

  @ApiProperty({ description: 'Base64URL encoded authenticator data' })
  @IsString()
  @IsNotEmpty()
  authenticatorData!: string;

  @ApiProperty({ description: 'Base64URL encoded assertion signature' })
  @IsString()
  @IsNotEmpty()
  signature!: string;

  @ApiPropertyOptional({
    description: 'Base64URL encoded user handle (user ID)',
  })
  @IsOptional()
  @IsString()
  userHandle?: string;
}

export class WebAuthnAuthenticationResponseDto {
  @ApiProperty({ description: 'Base64URL encoded credential ID' })
  @IsString()
  @IsNotEmpty()
  id!: string;

  @ApiProperty({ description: 'Base64URL encoded raw credential ID' })
  @IsString()
  @IsNotEmpty()
  rawId!: string;

  @ApiProperty({ type: AuthenticatorAssertionResponseDto })
  @IsObject()
  @ValidateNested()
  @Type(() => AuthenticatorAssertionResponseDto)
  response!: AuthenticatorAssertionResponseDto;

  @ApiPropertyOptional({
    description: 'Authenticator attachment modality',
    example: 'platform',
  })
  @IsOptional()
  @IsString()
  authenticatorAttachment?: 'cross-platform' | 'platform';

  @ApiProperty({ description: 'Credential type', example: 'public-key' })
  @IsIn(['public-key'])
  type!: 'public-key';

  @ApiPropertyOptional({ description: 'Client extension results' })
  @IsOptional()
  @IsObject()
  clientExtensionResults?: Record<string, unknown>;
}

export class AuthenticationVerifyDto {
  @ApiProperty({
    description: 'Identifier of the server-issued authentication challenge',
    example: 'd9b2d63d-a233-4f9e-9d22-1d5e22709210',
  })
  @IsUUID('4', { message: 'challengeId must be a valid UUID v4' })
  @IsNotEmpty({ message: 'challengeId is required' })
  challengeId!: string;

  @ApiProperty({
    description: 'WebAuthn navigator.credentials.get() response payload',
    type: WebAuthnAuthenticationResponseDto,
  })
  @IsObject()
  @ValidateNested()
  @Type(() => WebAuthnAuthenticationResponseDto)
  response!: WebAuthnAuthenticationResponseDto;
}
