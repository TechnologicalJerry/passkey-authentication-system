import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service.js';
import { RegistrationOptionsDto } from './dto/registration-options.dto.js';
import { RegistrationVerifyDto } from './dto/registration-verify.dto.js';
import { AuthenticationOptionsDto } from './dto/authentication-options.dto.js';
import { AuthenticationVerifyDto } from './dto/authentication-verify.dto.js';
import type { AuthSuccessResult } from '../common/types/index.js';
import type {
  RegistrationOptionsResult,
  AuthenticationOptionsResult,
} from './auth.service.js';

@ApiTags('Passkey Authentication')
@Controller({
  path: 'auth/passkeys',
  version: '1',
})
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('registration/options')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate passkey registration options',
    description:
      'Creates a server-side registration challenge and returns WebAuthn creation options for a new user enrollment.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Registration options and challenge generated successfully',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'An account with registered passkeys already exists for this email',
  })
  async getRegistrationOptions(
    @Body() dto: RegistrationOptionsDto,
  ): Promise<RegistrationOptionsResult> {
    return this.authService.generateRegistrationOptions(dto);
  }

  @Post('registration/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify passkey registration response',
    description:
      'Verifies the cryptographic attestation response, consumes the registration challenge, and stores the public key credential.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Passkey registered successfully and user activated',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid, expired, or replayed challenge, or verification failed',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Credential has already been registered',
  })
  async verifyRegistration(
    @Body() dto: RegistrationVerifyDto,
  ): Promise<AuthSuccessResult> {
    return this.authService.verifyRegistration(dto);
  }

  @Post('authentication/options')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate passkey authentication options',
    description:
      'Creates a server-side authentication challenge and returns WebAuthn assertion options. Supports both discoverable passkeys and account-specific logins.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Authentication options and challenge generated successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Specified user has no registered passkeys',
  })
  async getAuthenticationOptions(
    @Body() dto: AuthenticationOptionsDto,
  ): Promise<AuthenticationOptionsResult> {
    return this.authService.generateAuthenticationOptions(dto);
  }

  @Post('authentication/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify passkey authentication assertion',
    description:
      'Cryptographically verifies the WebAuthn assertion signature, checks signature counters to prevent cloned credentials, and establishes user identity.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Passkey assertion verified successfully',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid signature, revoked credential, or account suspended',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid, expired, or replayed challenge',
  })
  async verifyAuthentication(
    @Body() dto: AuthenticationVerifyDto,
  ): Promise<AuthSuccessResult> {
    return this.authService.verifyAuthentication(dto);
  }
}

