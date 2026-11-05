import {
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserStatus } from './entities/user.entity.js';
import type { UserProfileDto } from './dto/user-profile.dto.js';
import type { UpdateProfileDto } from './dto/update-profile.dto.js';
import { SessionsService } from '../sessions/sessions.service.js';
import { RevocationReason } from '../sessions/entities/session.entity.js';
import { PasskeysService } from '../passkeys/passkeys.service.js';
import { AuditService } from '../audit/audit.service.js';
import {
  AuditEventType,
  AuditOutcome,
} from '../audit/entities/audit-log.entity.js';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @Inject(forwardRef(() => SessionsService))
    private readonly sessionsService: SessionsService,
    @Inject(forwardRef(() => PasskeysService))
    private readonly passkeysService: PasskeysService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Finds a user by normalized email address.
   */
  async findByEmail(email: string): Promise<User | null> {
    const normalizedEmail = User.normalizeEmail(email);
    return this.userRepository.findOne({
      where: { email: normalizedEmail },
    });
  }

  /**
   * Finds a user by unique identifier.
   */
  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id },
      relations: ['credentials'],
    });
  }

  /**
   * Creates a user in PENDING status during initial passkey registration.
   */
  async createPendingUser(
    email: string,
    displayName?: string | null,
  ): Promise<User> {
    const normalizedEmail = User.normalizeEmail(email);
    const user = this.userRepository.create({
      email: normalizedEmail,
      displayName: displayName ?? null,
      status: UserStatus.PENDING,
    });
    return this.userRepository.save(user);
  }

  /**
   * Activates a pending user upon successful credential verification.
   */
  async activateUser(userId: string): Promise<User> {
    const user = await this.userRepository.findOneByOrFail({ id: userId });
    if (user.status === UserStatus.PENDING) {
      user.status = UserStatus.ACTIVE;
      return this.userRepository.save(user);
    }
    return user;
  }

  /**
   * Retrieves the authenticated user profile with safe fields only.
   */
  async getProfile(userId: string): Promise<UserProfileDto> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException('User account is deactivated');
    }

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      status: user.status,
      emailVerified: user.emailVerifiedAt !== null,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  /**
   * Updates explicitly permitted profile fields (e.g. displayName).
   * Protected fields (id, email, status, roles) are ignored or rejected.
   */
  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<UserProfileDto> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException('User account is deactivated');
    }

    if (dto.displayName !== undefined) {
      user.displayName = dto.displayName;
    }

    const updated = await this.userRepository.save(user);

    await this.auditService.logEvent({
      eventType: AuditEventType.ACCOUNT_PROFILE_UPDATED,
      actorUserId: userId,
      targetResourceId: userId,
      outcome: AuditOutcome.SUCCESS,
      metadata: { displayName: updated.displayName },
    });

    return {
      id: updated.id,
      email: updated.email,
      displayName: updated.displayName,
      status: updated.status,
      emailVerified: updated.emailVerifiedAt !== null,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  /**
   * Deactivates the user account according to documented policy.
   * Immediately revokes all active sessions to terminate access across all devices.
   */
  async deactivateAccount(userId: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    user.status = UserStatus.SUSPENDED;
    await this.userRepository.save(user);

    // Atomically revoke all active sessions
    await this.sessionsService.revokeAllUserSessions(
      userId,
      undefined,
      RevocationReason.ACCOUNT_DEACTIVATED,
    );

    await this.auditService.logEvent({
      eventType: AuditEventType.ACCOUNT_DEACTIVATED,
      actorUserId: userId,
      targetResourceId: userId,
      outcome: AuditOutcome.SUCCESS,
    });

    this.logger.warn(`User account deactivated: ${userId}`);
  }

  /**
   * Executes documented account deletion/anonymization policy:
   * 1. Suspends account status.
   * 2. Revokes all active sessions.
   * 3. Revokes all active passkeys.
   * 4. Anonymizes PII (email, displayName).
   * 5. Retains audit records to preserve regulatory and security compliance.
   */
  async deleteAccount(
    userId: string,
  ): Promise<{ success: boolean; message: string }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    // Revoke all sessions
    await this.sessionsService.revokeAllUserSessions(
      userId,
      undefined,
      RevocationReason.ACCOUNT_DELETED,
    );

    // Revoke all registered passkeys
    await this.passkeysService.revokeAllUserPasskeys(userId);

    // Anonymize user record
    user.status = UserStatus.SUSPENDED;
    user.email = `deleted_${userId}@anonymized.local`;
    user.displayName = 'Deleted User';
    await this.userRepository.save(user);

    await this.auditService.logEvent({
      eventType: AuditEventType.ACCOUNT_DELETED,
      actorUserId: userId,
      targetResourceId: userId,
      outcome: AuditOutcome.SUCCESS,
    });

    return {
      success: true,
      message:
        'Account has been safely deleted and personal identifiers anonymized.',
    };
  }
}
