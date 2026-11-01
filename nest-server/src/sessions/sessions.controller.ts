import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { SessionsService } from './sessions.service.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { SessionIdParamDto } from './dto/session-id-param.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type {
  AppConfig,
  AuthenticatedUser,
  SessionSummary,
  TokenPair,
} from '../common/types/index.js';

@ApiTags('Sessions & Tokens')
@Controller({
  path: 'auth',
  version: '1',
})
export class SessionsController {
  constructor(
    private readonly sessionsService: SessionsService,
    private readonly configService: ConfigService,
  ) {}

  private get sessionConfig(): AppConfig['session'] {
    return this.configService.getOrThrow<AppConfig['session']>('session');
  }

  @Post('token/refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Rotate refresh token and issue new access token',
    description:
      'Atomically rotates the active refresh token, checks for reuse attacks, and generates a fresh JWT access token.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tokens successfully refreshed and rotated',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid, expired, or reused refresh token (triggers session revocation)',
  })
  async refreshToken(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<TokenPair> {
    const cookieName = this.sessionConfig.cookieName;
    const cookieToken = req.cookies?.[cookieName] as string | undefined;
    const rawToken = dto.refreshToken ?? cookieToken;

    if (!rawToken) {
      throw new UnauthorizedException('Refresh token is required via cookie or request body');
    }

    const ipAddress = req.ip ?? null;
    const userAgent = req.headers['user-agent'] ?? null;

    const result = await this.sessionsService.rotateRefreshToken(rawToken, {
      ipAddress,
      userAgent,
    });

    // Set replacement refresh token in HttpOnly cookie
    this.setRefreshTokenCookie(res, result.tokens.refreshToken);

    return result.tokens;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Logout current session',
    description:
      'Revokes the authenticated session, invalidates its refresh token, and clears the cookie.',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Current session logged out successfully' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Authentication required' })
  async logout(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ success: boolean; message: string }> {
    await this.sessionsService.revokeSession(user.sessionId, user.id);
    this.clearRefreshTokenCookie(res);

    return {
      success: true,
      message: 'Logged out successfully',
    };
  }

  @Post('logout/all')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Logout all sessions (all devices)',
    description: 'Revokes all active sessions for the current user and clears the cookie.',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'All active sessions revoked' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Authentication required' })
  async logoutAll(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ success: boolean; message: string; revokedCount: number }> {
    const revokedCount = await this.sessionsService.revokeAllUserSessions(user.id);
    this.clearRefreshTokenCookie(res);

    return {
      success: true,
      message: 'All active sessions have been revoked',
      revokedCount,
    };
  }

  @Get('sessions')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'List user sessions',
    description:
      'Returns active and historical sessions for the current user with safe metadata (no tokens/hashes).',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Sessions listed successfully' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Authentication required' })
  async listSessions(@CurrentUser() user: AuthenticatedUser): Promise<SessionSummary[]> {
    return this.sessionsService.listUserSessions(user.id, user.sessionId);
  }

  @Delete('sessions/:id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Revoke a specific session',
    description: 'Revokes a specific session belonging to the authenticated user.',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Session revoked successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Session not found' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Authentication required' })
  async revokeSession(
    @Param() param: SessionIdParamDto,
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ success: boolean; message: string }> {
    await this.sessionsService.revokeSession(param.id, user.id);

    // If the user revoked their current session, clear cookie
    if (param.id === user.sessionId) {
      this.clearRefreshTokenCookie(res);
    }

    return {
      success: true,
      message: 'Session revoked successfully',
    };
  }

  /**
   * Helper to set secure HttpOnly refresh token cookie.
   */
  private setRefreshTokenCookie(res: Response, rawRefreshToken: string): void {
    const maxAgeMs = this.sessionConfig.refreshTokenTtlDays * 86400 * 1000;
    res.cookie(this.sessionConfig.cookieName, rawRefreshToken, {
      httpOnly: true,
      secure: this.sessionConfig.cookieSecure,
      sameSite: this.sessionConfig.cookieSameSite,
      path: '/api/v1/auth',
      maxAge: maxAgeMs,
    });
  }

  /**
   * Helper to clear refresh token cookie.
   */
  private clearRefreshTokenCookie(res: Response): void {
    res.clearCookie(this.sessionConfig.cookieName, {
      httpOnly: true,
      secure: this.sessionConfig.cookieSecure,
      sameSite: this.sessionConfig.cookieSameSite,
      path: '/api/v1/auth',
    });
  }
}

