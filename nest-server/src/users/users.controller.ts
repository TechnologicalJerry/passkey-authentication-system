import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { UsersService } from './users.service.js';
import { UserProfileDto } from './dto/user-profile.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { AuditService } from '../audit/audit.service.js';
import type { AuthenticatedUser, AppConfig } from '../common/types/index.js';

@ApiTags('User Account Lifecycle')
@Controller({
  path: 'users',
  version: '1',
})
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('bearer')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
  ) {}

  private get sessionConfig(): AppConfig['session'] {
    return this.configService.getOrThrow<AppConfig['session']>('session');
  }

  @Get('me')
  @ApiOperation({
    summary: 'Get current user profile',
    description: 'Returns the profile for the authenticated user.',
  })
  @ApiResponse({ status: HttpStatus.OK, type: UserProfileDto })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Authentication required' })
  async getProfile(@CurrentUser() user: AuthenticatedUser): Promise<UserProfileDto> {
    return this.usersService.getProfile(user.id);
  }

  @Patch('me')
  @ApiOperation({
    summary: 'Update current user profile',
    description: 'Updates allowed profile fields (e.g. displayName). Protected fields cannot be modified.',
  })
  @ApiResponse({ status: HttpStatus.OK, type: UserProfileDto })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Authentication required' })
  async updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ): Promise<UserProfileDto> {
    return this.usersService.updateProfile(user.id, dto);
  }

  @Post('me/deactivate')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({
    summary: 'Deactivate user account',
    description:
      'Suspends the account and revokes all active sessions across all devices. Rejects future authentications.',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Account deactivated successfully' })
  async deactivateAccount(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ success: boolean; message: string }> {
    await this.usersService.deactivateAccount(user.id);
    this.clearRefreshTokenCookie(res);

    return {
      success: true,
      message: 'Account has been deactivated. All active sessions have been revoked.',
    };
  }

  @Delete('me')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 2, ttl: 60000 } })
  @ApiOperation({
    summary: 'Delete user account (Soft-deletion & Anonymization)',
    description:
      'Revokes all credentials and sessions, anonymizes PII, and retains non-PII audit trail.',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Account deleted and personal data anonymized' })
  async deleteAccount(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ success: boolean; message: string }> {
    const result = await this.usersService.deleteAccount(user.id);
    this.clearRefreshTokenCookie(res);

    return result;
  }

  @Get('me/audit-logs')
  @ApiOperation({
    summary: 'Get paginated security audit logs for current user',
    description: 'Returns historical security audit events associated with the authenticated account.',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Paginated audit logs' })
  async getAuditLogs(
    @CurrentUser() user: AuthenticatedUser,
    @Query() pagination: PaginationQueryDto,
  ) {
    return this.auditService.getLogsForUser(user.id, pagination);
  }

  private clearRefreshTokenCookie(res: Response): void {
    res.clearCookie(this.sessionConfig.cookieName, {
      httpOnly: true,
      secure: this.sessionConfig.cookieSecure,
      sameSite: this.sessionConfig.cookieSameSite,
      path: '/api/v1/auth',
    });
  }
}

