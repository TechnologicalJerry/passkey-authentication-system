import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import { RegistrationOptionsDto } from './dto/registration-options.dto.js';
import { RegistrationVerifyDto } from './dto/registration-verify.dto.js';
import { AuthenticationOptionsDto } from './dto/authentication-options.dto.js';
import { AuthenticationVerifyDto } from './dto/authentication-verify.dto.js';
import type { AppConfig, AuthSuccessResult } from '../common/types/index.js';
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
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  private get sessionConfig(): AppConfig['session'] {
    return this.configService.getOrThrow<AppConfig['session']>('session');
  }

  @Post('registration/options')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
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
  @Throttle({ default: { limit: 5, ttl: 60000 } })
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
  @Throttle({ default: { limit: 10, ttl: 60000 } })
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
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({
    summary: 'Verify passkey authentication assertion and establish session',
    description:
      'Cryptographically verifies the WebAuthn assertion signature, creates an authenticated session, issues access and refresh tokens, and sets secure HttpOnly cookie.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Passkey assertion verified successfully and session established with tokens',
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
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthSuccessResult> {
    const ipAddress = req.ip ?? null;
    const userAgent = req.headers['user-agent'] ?? null;

    const result = await this.authService.verifyAuthentication(dto, {
      ipAddress,
      userAgent,
    });

    if (result.tokens) {
      const maxAgeMs = this.sessionConfig.refreshTokenTtlDays * 86400 * 1000;
      res.cookie(this.sessionConfig.cookieName, result.tokens.refreshToken, {
        httpOnly: true,
        secure: this.sessionConfig.cookieSecure,
        sameSite: this.sessionConfig.cookieSameSite,
        path: '/api/v1/auth',
        maxAge: maxAgeMs,
      });
    }

    return result;
  }
}
