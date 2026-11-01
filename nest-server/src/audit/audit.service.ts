import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog, AuditOutcome } from './entities/audit-log.entity.js';
import type { PaginatedResult } from '../common/types/index.js';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto.js';

export interface LogAuditParams {
  eventType: string;
  actorUserId?: string | null;
  targetResourceId?: string | null;
  outcome?: AuditOutcome;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepository: Repository<AuditLog>,
  ) {}

  /**
   * Records a security audit event in the durable database and structured log.
   */
  async logEvent(params: LogAuditParams): Promise<AuditLog | null> {
    try {
      const sanitizedMetadata = this.sanitizeMetadata(params.metadata);

      const entry = this.auditRepository.create({
        eventType: params.eventType,
        actorUserId: params.actorUserId ?? null,
        targetResourceId: params.targetResourceId ?? null,
        outcome: params.outcome ?? AuditOutcome.SUCCESS,
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ? params.userAgent.slice(0, 512) : null,
        metadata: sanitizedMetadata,
      });

      const saved = await this.auditRepository.save(entry);

      this.logger.log(
        JSON.stringify({
          audit_event: entry.eventType,
          outcome: entry.outcome,
          actor: entry.actorUserId,
          target: entry.targetResourceId,
          ip: entry.ipAddress,
        }),
      );

      return saved;
    } catch (error) {
      // Non-blocking: audit storage failures must not crash the primary transaction,
      // but must be logged immediately for incident detection.
      this.logger.error(
        `Failed to persist audit log for event ${params.eventType}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      return null;
    }
  }

  /**
   * Retrieves paginated audit logs for a specific user.
   */
  async getLogsForUser(
    userId: string,
    pagination: PaginationQueryDto,
  ): Promise<PaginatedResult<AuditLog>> {
    const [items, total] = await this.auditRepository.findAndCount({
      where: { actorUserId: userId },
      order: { createdAt: 'DESC' },
      take: pagination.limit,
      skip: pagination.offset,
    });

    return {
      items,
      total,
      limit: pagination.limit,
      offset: pagination.offset,
      hasMore: pagination.offset + items.length < total,
    };
  }

  private sanitizeMetadata(
    metadata?: Record<string, unknown> | null,
  ): Record<string, unknown> | null {
    if (!metadata) return null;

    const copy = { ...metadata };
    const forbiddenKeys = [
      'token',
      'accessToken',
      'refreshToken',
      'secret',
      'password',
      'cookie',
      'authorization',
      'signature',
      'attestationObject',
      'clientDataJSON',
    ];

    for (const key of Object.keys(copy)) {
      if (forbiddenKeys.some((k) => key.toLowerCase().includes(k.toLowerCase()))) {
        copy[key] = '[REDACTED]';
      }
    }

    return copy;
  }
}

