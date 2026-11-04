import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { EnrollmentService } from './enrollment.service.js';
import { EnrollmentInvitation } from './entities/enrollment-invitation.entity.js';
import type { ConfigService } from '@nestjs/config';
import type { AuditService } from '../audit/audit.service.js';

describe('EnrollmentService', () => {
  let enrollmentService: EnrollmentService;
  let mockInvitationRepo: {
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
  };
  let mockConfigService: {
    get: ReturnType<typeof vi.fn>;
    getOrThrow: ReturnType<typeof vi.fn>;
  };
  let mockAuditService: {
    logEvent: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockInvitationRepo = {
      create: vi.fn((e) => ({
        ...e,
        id: 'invitation-uuid',
        createdAt: new Date(),
      })),
      save: vi.fn((e) => Promise.resolve(e)),
      findOne: vi.fn(),
    };

    mockConfigService = {
      get: vi.fn().mockReturnValue(true),
      getOrThrow: vi.fn().mockReturnValue({
        refreshTokenSecret: 'test-hmac-secret-min-32-chars-for-test!',
      }),
    };

    mockAuditService = {
      logEvent: vi.fn().mockResolvedValue(null),
    };

    enrollmentService = new EnrollmentService(
      mockInvitationRepo as unknown as Repository<EnrollmentInvitation>,
      mockConfigService as unknown as ConfigService,
      mockAuditService as unknown as AuditService,
    );
  });

  describe('createInvitation', () => {
    it('should generate a 32-byte random raw token, store HMAC-SHA256 hash, and return raw token', async () => {
      const result = await enrollmentService.createInvitation(
        'newuser@example.com',
        24,
      );

      expect(result.rawToken).toHaveLength(64); // 32 bytes hex = 64 hex chars
      expect(mockInvitationRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'newuser@example.com',
          tokenHash: expect.any(String),
          consumedAt: null,
        }),
      );
      expect(mockAuditService.logEvent).toHaveBeenCalled();
    });
  });

  describe('validateAndConsumeInvitation', () => {
    it('should atomically mark invitation as consumed and return record when valid', async () => {
      const mockInvitation = {
        id: 'invitation-uuid',
        email: 'newuser@example.com',
        tokenHash: 'expected-hash',
        expiresAt: new Date(Date.now() + 3600000),
        consumedAt: null,
      };

      mockInvitationRepo.findOne.mockResolvedValueOnce(mockInvitation);

      const result = await enrollmentService.validateAndConsumeInvitation(
        'valid-token-string',
        'newuser@example.com',
      );

      expect(result.consumedAt).toBeInstanceOf(Date);
      expect(mockInvitationRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ consumedAt: expect.any(Date) }),
      );
    });

    it('should throw BadRequestException if token is invalid, expired, or already consumed', async () => {
      mockInvitationRepo.findOne.mockResolvedValueOnce(null);

      await expect(
        enrollmentService.validateAndConsumeInvitation(
          'expired-or-consumed-token',
          'newuser@example.com',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
