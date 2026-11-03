import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { PasskeysService } from './passkeys.service.js';
import { PasskeySummaryDto } from './dto/passkey-summary.dto.js';
import { RenamePasskeyDto } from './dto/rename-passkey.dto.js';
import { UUIDParamDto } from '../common/dto/uuid-param.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { AuthService } from '../auth/auth.service.js';
import type { AuthenticatedUser } from '../common/types/index.js';

@ApiTags('Passkey & Credential Management')
@Controller({
  path: 'passkeys',
  version: '1',
})
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('bearer')
export class PasskeysController {
  constructor(
    private readonly passkeysService: PasskeysService,
    private readonly authService: AuthService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List user registered passkeys',
    description:
      'Returns all registered passkeys for the authenticated user with safe metadata (no private or public key bytes).',
  })
  @ApiResponse({ status: HttpStatus.OK, type: [PasskeySummaryDto] })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Authentication required' })
  async listPasskeys(@CurrentUser() user: AuthenticatedUser): Promise<PasskeySummaryDto[]> {
    return this.passkeysService.listUserPasskeys(user.id);
  }

  @Post('registration/options')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({
    summary: 'Generate registration options for adding a new passkey to current account',
    description:
      'Generates WebAuthn registration options bound to the authenticated user identity with existing credentials excluded.',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Registration options for new passkey enrollment' })
  async generateAdditionalPasskeyOptions(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.generateRegistrationOptions(
      { email: user.email },
      user.id,
    );
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Rename passkey device label',
    description: 'Updates the user-defined device label of a specific registered passkey.',
  })
  @ApiResponse({ status: HttpStatus.OK, type: PasskeySummaryDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Passkey not found or not owned by user' })
  async renamePasskey(
    @Param() param: UUIDParamDto,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RenamePasskeyDto,
  ): Promise<PasskeySummaryDto> {
    return this.passkeysService.renamePasskey(param.id, user.id, dto.label);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({
    summary: 'Revoke a registered passkey',
    description:
      'Revokes a passkey credential. Rejects deletion if it is the only active passkey to prevent lockout.',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Passkey revoked successfully' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot delete the only active passkey on account',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Passkey not found or not owned by user' })
  async revokePasskey(
    @Param() param: UUIDParamDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ success: boolean; message: string }> {
    await this.passkeysService.revokePasskey(param.id, user.id);
    return {
      success: true,
      message: 'Passkey revoked successfully',
    };
  }
}

