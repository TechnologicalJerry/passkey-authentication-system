import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Repository } from 'typeorm';
import { AuditService } from './audit.service.js';
import { AuditLog, AuditOutcome, AuditEventType } from './entities/audit-log.entity.js';

describe('AuditService', () => {
  let auditService: AuditService;
  let mockAuditRepo: {
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    findAndCount: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockAuditRepo = {
      create: vi.fn((e) => ({ ...e, id: 'audit-log-uuid', createdAt: new Date() })),
      save: vi.fn((e) => Promise.resolve(e)),
      findAndCount: vi.fn().mockResolvedValue([[], 0]),
    };

    auditService = new AuditService(mockAuditRepo as unknown as Repository<AuditLog>);
  });

  it('should persist audit log and automatically redact sensitive tokens/secrets in metadata', async () => {
    const rawMetadata = {
      email: 'user@example.com',
      accessToken: 'secret.jwt.token',
      rawRefreshToken: '32-byte-hex-refresh-token',
      signature: 'raw-crypto-sig',
      deviceLabel: 'Chrome on Mac',
    };

    const entry = await auditService.logEvent({
      eventType: AuditEventType.SESSION_CREATED,
      actorUserId: 'user-uuid-1',
      outcome: AuditOutcome.SUCCESS,
      metadata: rawMetadata,
    });

    expect(entry).toBeDefined();
    expect(mockAuditRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: AuditEventType.SESSION_CREATED,
        actorUserId: 'user-uuid-1',
        outcome: AuditOutcome.SUCCESS,
        metadata: {
          email: 'user@example.com',
          accessToken: '[REDACTED]',
          rawRefreshToken: '[REDACTED]',
          signature: '[REDACTED]',
          deviceLabel: 'Chrome on Mac',
        },
      }),
    );
  });

  it('should not throw if database save fails (non-blocking audit log execution)', async () => {
    mockAuditRepo.save.mockRejectedValueOnce(new Error('DB Connection Dropped'));

    const result = await auditService.logEvent({
      eventType: AuditEventType.ACCOUNT_DEACTIVATED,
      actorUserId: 'user-uuid-1',
    });

    expect(result).toBeNull();
  });

  it('should return paginated audit logs for user', async () => {
    const mockLogs = [
      { id: '1', eventType: AuditEventType.SESSION_CREATED, actorUserId: 'user-uuid-1' },
      { id: '2', eventType: AuditEventType.PASSKEY_REVOKED, actorUserId: 'user-uuid-1' },
    ];
    mockAuditRepo.findAndCount.mockResolvedValueOnce([mockLogs, 2]);

    const result = await auditService.getLogsForUser('user-uuid-1', { limit: 10, offset: 0 });

    expect(result.items).toHaveLength(2);
    expect(result.total).toBe(2);
    expect(result.limit).toBe(10);
    expect(result.offset).toBe(0);
    expect(result.hasMore).toBe(false);
  });
});

