import {
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  IsNull,
  MoreThan,
  Repository,
} from 'typeorm';
import { randomUUID } from 'node:crypto';
import { Session, RevocationReason } from './entities/session.entity.js';
import { UserStatus } from '../users/entities/user.entity.js';
import { TokenService } from '../auth/token.service.js';
import { AuditService } from '../audit/audit.service.js';
import {
  AuditEventType,
  AuditOutcome,
} from '../audit/entities/audit-log.entity.js';
import type {
  AppConfig,
  SessionSummary,
  TokenPair,
} from '../common/types/index.js';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto.js';

export interface CreateSessionParams {
  userId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  deviceLabel?: string | null;
  entityManager?: EntityManager;
}

export interface RotateTokenResult {
  session: Session;
  tokens: TokenPair;
}

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);

  constructor(
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    private readonly tokenService: TokenService,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
  ) {}

  private get sessionConfig(): AppConfig['session'] {
    return this.configService.getOrThrow<AppConfig['session']>('session');
  }

  /**
   * Creates an authenticated session for a user and returns the raw refresh token.
   * Atomically enforces the maximum active sessions limit by evicting the oldest session.
   */
  async createSession(params: CreateSessionParams): Promise<{
    session: Session;
    rawRefreshToken: string;
  }> {
    const rawRefreshToken = this.tokenService.generateRefreshToken();
    const refreshTokenHash =
      this.tokenService.hashRefreshToken(rawRefreshToken);
    const refreshTokenFamily = randomUUID();

    const ttlDays = this.sessionConfig.refreshTokenTtlDays;
    const expiresAt = new Date(Date.now() + ttlDays * 86400 * 1000);

    const deviceLabel =
      params.deviceLabel ?? this.deriveDeviceLabel(params.userAgent);

    const execute = async (em: EntityManager) => {
      const sessionRepo = em.getRepository(Session);

      // Enforce max active sessions by revoking the oldest active session if limit exceeded
      const activeSessions = await sessionRepo.find({
        where: {
          userId: params.userId,
          revokedAt: IsNull(),
          expiresAt: MoreThan(new Date()),
        },
        order: { createdAt: 'ASC' },
      });

      const maxSessions = this.sessionConfig.maxActiveSessions;
      if (activeSessions.length >= maxSessions) {
        const excessCount = activeSessions.length - maxSessions + 1;
        const sessionsToEvict = activeSessions.slice(0, excessCount);

        for (const s of sessionsToEvict) {
          s.revokedAt = new Date();
          s.revocationReason = RevocationReason.SESSION_LIMIT_EXCEEDED;
          await sessionRepo.save(s);

          this.logger.log(
            JSON.stringify({
              event: 'session.evicted',
              userId: params.userId,
              sessionId: s.id,
              reason: 'SESSION_LIMIT_EXCEEDED',
            }),
          );
        }
      }

      const session = sessionRepo.create({
        userId: params.userId,
        refreshTokenHash,
        previousRefreshTokenHash: null,
        refreshTokenFamily,
        expiresAt,
        lastActivityAt: new Date(),
        lastRefreshAt: new Date(),
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ? params.userAgent.slice(0, 512) : null,
        deviceLabel,
      });

      const saved = await sessionRepo.save(session);

      await this.auditService.logEvent({
        eventType: AuditEventType.SESSION_CREATED,
        actorUserId: params.userId,
        targetResourceId: saved.id,
        outcome: AuditOutcome.SUCCESS,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        metadata: { deviceLabel },
      });

      return saved;
    };

    const session = params.entityManager
      ? await execute(params.entityManager)
      : await this.dataSource.transaction(execute);

    return {
      session,
      rawRefreshToken,
    };
  }

  /**
   * Concurrency-safe refresh token rotation using row-level locking.
   * Detects reuse/replay attacks and invalidates the entire token family upon violation.
   */
  async rotateRefreshToken(
    presentedRawToken: string,
    metadata?: { ipAddress?: string | null; userAgent?: string | null },
  ): Promise<RotateTokenResult> {
    const presentedHash = this.tokenService.hashRefreshToken(presentedRawToken);
    const now = new Date();

    return this.dataSource.transaction(async (em) => {
      const sessionRepo = em.getRepository(Session);

      // Pessimistic write lock: lock matching session row
      const session = await sessionRepo
        .createQueryBuilder('session')
        .setLock('pessimistic_write')
        .leftJoinAndSelect('session.user', 'user')
        .where(
          '(session.refreshTokenHash = :hash OR session.previousRefreshTokenHash = :hash)',
          { hash: presentedHash },
        )
        .getOne();

      if (!session) {
        this.logger.warn('Refresh attempt with unrecognized token hash');
        throw new UnauthorizedException('Invalid or expired refresh token');
      }

      // Check for reuse of an already-rotated token (Replay Attack Detection)
      if (session.previousRefreshTokenHash === presentedHash) {
        session.revokedAt = now;
        session.revocationReason = RevocationReason.REUSE_DETECTED;
        await sessionRepo.save(session);

        // Revoke all sessions in this family immediately
        await sessionRepo.update(
          {
            refreshTokenFamily: session.refreshTokenFamily,
            revokedAt: IsNull(),
          },
          {
            revokedAt: now,
            revocationReason: RevocationReason.REUSE_DETECTED,
          },
        );

        await this.auditService.logEvent({
          eventType: AuditEventType.TOKEN_REUSE_DETECTED,
          actorUserId: session.userId,
          targetResourceId: session.id,
          outcome: AuditOutcome.FAILURE,
          ipAddress: metadata?.ipAddress,
          userAgent: metadata?.userAgent,
          metadata: { familyId: session.refreshTokenFamily },
        });

        this.logger.error(
          JSON.stringify({
            event: 'session.reuse_detected',
            userId: session.userId,
            sessionId: session.id,
            familyId: session.refreshTokenFamily,
            timestamp: now.toISOString(),
          }),
        );

        throw new UnauthorizedException(
          'Refresh token reuse detected. Session has been revoked for security.',
        );
      }

      // Standard token verification
      if (session.revokedAt !== null) {
        throw new UnauthorizedException('Session has been revoked');
      }

      if (session.expiresAt <= now) {
        throw new UnauthorizedException('Session has expired');
      }

      if (!session.user || session.user.status === UserStatus.SUSPENDED) {
        throw new UnauthorizedException('User account is suspended');
      }

      // Generate replacement refresh token
      const newRawRefreshToken = this.tokenService.generateRefreshToken();
      const newRefreshTokenHash =
        this.tokenService.hashRefreshToken(newRawRefreshToken);

      session.previousRefreshTokenHash = presentedHash;
      session.refreshTokenHash = newRefreshTokenHash;
      session.lastRefreshAt = now;
      session.lastActivityAt = now;

      if (metadata?.ipAddress) {
        session.ipAddress = metadata.ipAddress;
      }
      if (metadata?.userAgent) {
        session.userAgent = metadata.userAgent.slice(0, 512);
      }

      const updatedSession = await sessionRepo.save(session);

      // Issue new access token
      const accessTokenResult = await this.tokenService.generateAccessToken({
        userId: session.user.id,
        email: session.user.email,
        sessionId: session.id,
      });

      await this.auditService.logEvent({
        eventType: AuditEventType.TOKEN_ROTATED,
        actorUserId: session.userId,
        targetResourceId: session.id,
        outcome: AuditOutcome.SUCCESS,
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent,
      });

      return {
        session: updatedSession,
        tokens: {
          accessToken: accessTokenResult.token,
          refreshToken: newRawRefreshToken,
          expiresIn: accessTokenResult.expiresIn,
          tokenType: 'Bearer',
        },
      };
    });
  }

  /**
   * Real-time session validation used by the session-aware JWT guard.
   */
  async validateSession(sessionId: string, userId: string): Promise<Session> {
    const session = await this.sessionRepository.findOne({
      where: {
        id: sessionId,
        userId,
      },
      relations: ['user'],
    });

    if (!session) {
      throw new UnauthorizedException('Session not found');
    }

    if (session.revokedAt !== null) {
      throw new UnauthorizedException('Session has been revoked');
    }

    if (session.expiresAt <= new Date()) {
      throw new UnauthorizedException('Session has expired');
    }

    if (session.user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException('Account is suspended');
    }

    return session;
  }

  /**
   * Revokes a specific session belonging to the user.
   */
  async revokeSession(
    sessionId: string,
    userId: string,
    reason: RevocationReason = RevocationReason.USER_LOGOUT,
  ): Promise<void> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (session.revokedAt !== null) {
      return; // Already revoked, safe idempotent return
    }

    const now = new Date();
    session.revokedAt = now;
    session.revocationReason = reason;
    await this.sessionRepository.save(session);

    await this.auditService.logEvent({
      eventType: AuditEventType.SESSION_REVOKED,
      actorUserId: userId,
      targetResourceId: sessionId,
      outcome: AuditOutcome.SUCCESS,
      metadata: { reason },
    });

    this.logger.log(
      JSON.stringify({
        event: 'session.revoked',
        userId,
        sessionId,
        reason,
        timestamp: now.toISOString(),
      }),
    );
  }

  /**
   * Revokes all active sessions for a user (Logout from all devices / Deactivation).
   */
  async revokeAllUserSessions(
    userId: string,
    exceptSessionId?: string,
    reason: RevocationReason = RevocationReason.ALL_SESSIONS_REVOKED,
  ): Promise<number> {
    const now = new Date();
    const query = this.sessionRepository
      .createQueryBuilder()
      .update(Session)
      .set({
        revokedAt: now,
        revocationReason: reason,
      })
      .where('userId = :userId', { userId })
      .andWhere('revokedAt IS NULL');

    if (exceptSessionId) {
      query.andWhere('id != :exceptSessionId', { exceptSessionId });
    }

    const result = await query.execute();
    const affected = result.affected ?? 0;

    await this.auditService.logEvent({
      eventType: AuditEventType.ALL_SESSIONS_LOGOUT,
      actorUserId: userId,
      outcome: AuditOutcome.SUCCESS,
      metadata: { revokedCount: affected, reason },
    });

    this.logger.log(
      JSON.stringify({
        event: 'session.all_revoked',
        userId,
        revokedCount: affected,
        reason,
        timestamp: now.toISOString(),
      }),
    );

    return affected;
  }

  /**
   * Lists sessions for the authenticated user with masked, safe metadata and database pagination.
   */
  async listUserSessions(
    userId: string,
    currentSessionId?: string,
    pagination?: PaginationQueryDto,
  ): Promise<SessionSummary[]> {
    const limit = pagination?.limit ?? 50;
    const offset = pagination?.offset ?? 0;

    const sessions = await this.sessionRepository.find({
      where: { userId },
      order: { lastActivityAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    return sessions.map((s) => ({
      id: s.id,
      createdAt: s.createdAt.toISOString(),
      lastActivityAt: s.lastActivityAt.toISOString(),
      expiresAt: s.expiresAt.toISOString(),
      ipAddress: s.ipAddress,
      userAgent: s.userAgent,
      deviceLabel: s.deviceLabel,
      isCurrent: s.id === currentSessionId,
      isRevoked: s.revokedAt !== null,
    }));
  }

  private deriveDeviceLabel(userAgent?: string | null): string {
    if (!userAgent) return 'Unknown Device';
    if (userAgent.includes('Macintosh') || userAgent.includes('Mac OS')) {
      return userAgent.includes('Chrome')
        ? 'Chrome on macOS'
        : 'Safari on macOS';
    }
    if (userAgent.includes('Windows')) {
      return userAgent.includes('Edg')
        ? 'Edge on Windows'
        : 'Chrome on Windows';
    }
    if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
      return 'Mobile Safari on iOS';
    }
    if (userAgent.includes('Android')) {
      return 'Chrome on Android';
    }
    if (userAgent.includes('Linux')) {
      return 'Browser on Linux';
    }
    return 'Web Browser';
  }
}
