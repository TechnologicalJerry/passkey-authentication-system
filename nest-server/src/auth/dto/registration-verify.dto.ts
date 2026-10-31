import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import type { RegistrationResponseJSON } from '@simplewebauthn/server';

export class AuthenticatorAttestationResponseDto {
  @ApiProperty({ description: 'Base64URL encoded client data JSON' })
  @IsString()
  @IsNotEmpty()
  clientDataJSON!: string;

  @ApiProperty({ description: 'Base64URL encoded CBOR attestation object' })
  @IsString()
  @IsNotEmpty()
  attestationObject!: string;

  @ApiPropertyOptional({
    description: 'Array of authenticator transports supported by the credential',
    type: [String],
    example: ['internal', 'hybrid'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  transports?: string[];

  @ApiPropertyOptional({ description: 'Base64URL encoded authenticator data' })
  @IsOptional()
  @IsString()
  authenticatorData?: string;

  @ApiPropertyOptional({ description: 'Public key algorithm identifier' })
  @IsOptional()
  @IsNumber()
  publicKeyAlgorithm?: number;

  @ApiPropertyOptional({ description: 'Base64URL encoded public key' })
  @IsOptional()
  @IsString()
  publicKey?: string;
}

export class WebAuthnRegistrationResponseDto implements RegistrationResponseJSON {
  @ApiProperty({ description: 'Base64URL encoded credential ID' })
  @IsString()
  @IsNotEmpty()
  id!: string;

  @ApiProperty({ description: 'Base64URL encoded raw credential ID' })
  @IsString()
  @IsNotEmpty()
  rawId!: string;

  @ApiProperty({ type: AuthenticatorAttestationResponseDto })
  @IsObject()
  @ValidateNested()
  @Type(() => AuthenticatorAttestationResponseDto)
  response!: AuthenticatorAttestationResponseDto;

  @ApiPropertyOptional({ description: 'Authenticator attachment modality', example: 'platform' })
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

export class RegistrationVerifyDto {
  @ApiProperty({
    description: 'Identifier of the server-issued registration challenge',
    example: 'd9b2d63d-a233-4f9e-9d22-1d5e22709210',
  })
  @IsUUID('4', { message: 'challengeId must be a valid UUID v4' })
  @IsNotEmpty({ message: 'challengeId is required' })
  challengeId!: string;

  @ApiProperty({
    description: 'WebAuthn navigator.credentials.create() response payload',
    type: WebAuthnRegistrationResponseDto,
  })
  @IsObject()
  @ValidateNested()
  @Type(() => WebAuthnRegistrationResponseDto)
  response!: WebAuthnRegistrationResponseDto;

  @ApiPropertyOptional({
    description: 'Friendly device/key label (e.g. MacBook Touch ID)',
    example: 'MacBook Touch ID',
  })
  @IsOptional()
  @IsString({ message: 'Label must be a string' })
  @MaxLength(128, { message: 'Label cannot exceed 128 characters' })
  label?: string;
}

