import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager, IsNull, MoreThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import crypto from 'node:crypto';
import { EnrollmentInvitation } from './entities/enrollment-invitation.entity.js';
import { User } from '../users/entities/user.entity.js';
import { AuditService } from '../audit/audit.service.js';
import { AuditEventType, AuditOutcome } from '../audit/entities/audit-log.entity.js';
import type { AppConfig } from '../common/types/index.js';

@Injectable()
export class EnrollmentService {
  private readonly logger = new Logger(EnrollmentService.name);

  constructor(
    @InjectRepository(EnrollmentInvitation)
    private readonly invitationRepository: Repository<EnrollmentInvitation>,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
  ) {}

  private get hmacSecret(): string {
    const sessionConfig = this.configService.getOrThrow<AppConfig['session']>('session');
    return sessionConfig.refreshTokenSecret;
  }

  isInvitationRequired(): boolean {
    return this.configService.get<boolean>('enrollment.invitationRequired') ?? false;
  }

  /**
   * Hashes a raw bearer invitation token using HMAC-SHA256.
   */
  hashToken(rawToken: string): string {
    return crypto
      .createHmac('sha256', this.hmacSecret)
      .update(rawToken)
      .digest('hex');
  }

  /**
   * Securely generates and persists a single-use enrollment invitation token for an email address.
   */
  async createInvitation(
    email: string,
    ttlHours = 24,
  ): Promise<{ rawToken: string; invitation: EnrollmentInvitation }> {
    const normalizedEmail = User.normalizeEmail(email);
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);

    const expiresAt = new Date(Date.now() + ttlHours * 3600 * 1000);

    const invitation = this.invitationRepository.create({
      email: normalizedEmail,
      tokenHash,
      expiresAt,
      consumedAt: null,
    });

    const saved = await this.invitationRepository.save(invitation);

    await this.auditService.logEvent({
      eventType: AuditEventType.ENROLLMENT_INVITATION_CREATED,
      targetResourceId: saved.id,
      outcome: AuditOutcome.SUCCESS,
      metadata: { email: normalizedEmail, expiresAt: expiresAt.toISOString() },
    });

    return {
      rawToken,
      invitation: saved,
    };
  }

  /**
   * Atomically validates and consumes an enrollment invitation.
   */
  async validateAndConsumeInvitation(
    rawToken: string,
    email: string,
    entityManager?: EntityManager,
  ): Promise<EnrollmentInvitation> {
    const normalizedEmail = User.normalizeEmail(email);
    const tokenHash = this.hashToken(rawToken);
    const now = new Date();

    const repo = entityManager
      ? entityManager.getRepository(EnrollmentInvitation)
      : this.invitationRepository;

    const invitation = await repo.findOne({
      where: {
        tokenHash,
        email: normalizedEmail,
        consumedAt: IsNull(),
        expiresAt: MoreThan(now),
      },
    });

    if (!invitation) {
      await this.auditService.logEvent({
        eventType: AuditEventType.ENROLLMENT_INVITATION_CONSUMED,
        outcome: AuditOutcome.FAILURE,
        metadata: { email: normalizedEmail, reason: 'Invalid or expired token' },
      });

      throw new BadRequestException(
        'Invalid, expired, or already-consumed enrollment invitation token.',
      );
    }

    invitation.consumedAt = now;
    const consumed = await repo.save(invitation);

    await this.auditService.logEvent({
      eventType: AuditEventType.ENROLLMENT_INVITATION_CONSUMED,
      targetResourceId: consumed.id,
      outcome: AuditOutcome.SUCCESS,
      metadata: { email: normalizedEmail },
    });

    return consumed;
  }
}

