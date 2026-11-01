import {
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, IsNull, MoreThan, Repository } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { Session, RevocationReason } from './entities/session.entity.js';
import { User, UserStatus } from '../users/entities/user.entity.js';
import { TokenService } from '../auth/token.service.js';
import type { AppConfig, SessionSummary, TokenPair } from '../common/types/index.js';

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
    const execute = async (em: EntityManager) => {
      const sessionRepo = em.getRepository(Session);
      const now = new Date();

      // 1. Enforce active session limit
      const activeSessions = await sessionRepo.find({
        where: {
          userId: params.userId,
          revokedAt: IsNull(),
          expiresAt: MoreThan(now),
        },
        order: { lastActivityAt: 'ASC' },
      });

      const maxSessions = this.sessionConfig.maxActiveSessions;
      if (activeSessions.length >= maxSessions) {
        // Evict oldest session(s)
        const excessCount = activeSessions.length - maxSessions + 1;
        const sessionsToEvict = activeSessions.slice(0, excessCount);
        for (const oldSession of sessionsToEvict) {
          oldSession.revokedAt = now;
          oldSession.revocationReason = RevocationReason.SESSION_LIMIT_EXCEEDED;
          await sessionRepo.save(oldSession);
          this.logger.log(
            JSON.stringify({
              event: 'session.evicted',
              userId: params.userId,
              sessionId: oldSession.id,
              reason: RevocationReason.SESSION_LIMIT_EXCEEDED,
              timestamp: now.toISOString(),
            }),
          );
        }
      }

      // 2. Generate raw refresh token and compute hash
      const rawRefreshToken = this.tokenService.generateRefreshToken();
      const refreshTokenHash = this.tokenService.hashRefreshToken(rawRefreshToken);
      const refreshTokenFamily = randomUUID();

      const refreshTtlMs = this.sessionConfig.refreshTokenTtlDays * 86400 * 1000;
      const expiresAt = new Date(now.getTime() + refreshTtlMs);

      // 3. Persist session entity
      const session = sessionRepo.create({
        userId: params.userId,
        refreshTokenHash,
        previousRefreshTokenHash: null,
        refreshTokenFamily,
        expiresAt,
        lastActivityAt: now,
        lastRefreshAt: now,
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ? params.userAgent.slice(0, 512) : null,
        deviceLabel: params.deviceLabel ?? null,
      });

      const savedSession = await sessionRepo.save(session);

      this.logger.log(
        JSON.stringify({
          event: 'session.created',
          userId: params.userId,
          sessionId: savedSession.id,
          familyId: refreshTokenFamily,
          timestamp: now.toISOString(),
        }),
      );

      return {
        session: savedSession,
        rawRefreshToken,
      };
    };

    if (params.entityManager) {
      return execute(params.entityManager);
    }
    return this.dataSource.transaction(execute);
  }

  /**
   * Concurrency-safe refresh token rotation with immediate reuse detection.
   * If an old/rotated refresh token is presented, the entire session family is revoked.
   */
  async rotateRefreshToken(
    rawRefreshToken: string,
    metadata?: { ipAddress?: string | null; userAgent?: string | null },
  ): Promise<RotateTokenResult> {
    const presentedHash = this.tokenService.hashRefreshToken(rawRefreshToken);
    const now = new Date();

    return this.dataSource.transaction(async (em) => {
      const sessionRepo = em.getRepository(Session);

      // Lock row with pessimistic write to ensure concurrent requests cannot race
      const session = await sessionRepo.findOne({
        where: [
          { refreshTokenHash: presentedHash },
          { previousRefreshTokenHash: presentedHash },
        ],
        lock: { mode: 'pessimistic_write' },
        relations: ['user'],
      });

      if (!session) {
        this.logger.warn(
          JSON.stringify({
            event: 'session.rejected',
            reason: 'UNKNOWN_REFRESH_TOKEN',
            timestamp: now.toISOString(),
          }),
        );
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Check for reuse attack: presented token matches the previously rotated token
      if (session.previousRefreshTokenHash === presentedHash) {
        session.revokedAt = now;
        session.revocationReason = RevocationReason.REUSE_DETECTED;
        await sessionRepo.save(session);

        // Also revoke any other sessions in this family for security
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
      const newRefreshTokenHash = this.tokenService.hashRefreshToken(newRawRefreshToken);

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

      this.logger.log(
        JSON.stringify({
          event: 'session.rotated',
          userId: session.userId,
          sessionId: session.id,
          timestamp: now.toISOString(),
        }),
      );

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
   * Revokes all active sessions for a user (Logout from all devices).
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
   * Lists all sessions for the authenticated user with masked, safe metadata.
   */
  async listUserSessions(
    userId: string,
    currentSessionId?: string,
  ): Promise<SessionSummary[]> {
    const sessions = await this.sessionRepository.find({
      where: { userId },
      order: { lastActivityAt: 'DESC' },
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
}

