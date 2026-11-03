import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { PasskeysService } from './passkeys.service.js';
import { PasskeyCredential } from './entities/passkey-credential.entity.js';
import type { AuditService } from '../audit/audit.service.js';

describe('PasskeysService', () => {
  let passkeysService: PasskeysService;
  let mockCredentialRepo: {
    find: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    createQueryBuilder: ReturnType<typeof vi.fn>;
  };
  let mockAuditService: {
    logEvent: ReturnType<typeof vi.fn>;
  };

  const mockPasskey: PasskeyCredential = {
    id: 'passkey-db-uuid-1',
    userId: 'user-uuid-1',
    credentialId: 'webauthn-cred-id-1',
    publicKey: Buffer.from('mock-public-key-bytes'),
    counter: 5,
    transports: ['internal'],
    deviceType: 'singleDevice',
    backedUp: false,
    label: 'MacBook Touch ID',
    aaguid: '00000000-0000-0000-0000-000000000000',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    lastUsedAt: new Date('2026-01-02T00:00:00Z'),
    revokedAt: null,
    user: {} as any,
  };

  beforeEach(() => {
    mockCredentialRepo = {
      find: vi.fn(),
      findOne: vi.fn(),
      count: vi.fn(),
      save: vi.fn((c) => Promise.resolve(c)),
      update: vi.fn().mockResolvedValue({ affected: 1 }),
      create: vi.fn((c) => c),
      createQueryBuilder: vi.fn(() => ({
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        execute: vi.fn().mockResolvedValue({ affected: 1 }),
      })),
    };

    mockAuditService = {
      logEvent: vi.fn().mockResolvedValue(null),
    };

    passkeysService = new PasskeysService(
      mockCredentialRepo as unknown as Repository<PasskeyCredential>,
      mockAuditService as unknown as AuditService,
    );
  });

  describe('listUserPasskeys', () => {
    it('should return safe passkey metadata and NEVER expose public key bytes or counters', async () => {
      mockCredentialRepo.find.mockResolvedValueOnce([{ ...mockPasskey }]);

      const result = await passkeysService.listUserPasskeys('user-uuid-1');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'passkey-db-uuid-1',
        credentialId: 'webauthn-cred-id-1',
        label: 'MacBook Touch ID',
        deviceType: 'singleDevice',
        backedUp: false,
        transports: ['internal'],
        createdAt: '2026-01-01T00:00:00.000Z',
        lastUsedAt: '2026-01-02T00:00:00.000Z',
        isRevoked: false,
      });

      // Verify cryptographic bytes and internal counters are not leaked
      expect((result[0] as any).publicKey).toBeUndefined();
      expect((result[0] as any).counter).toBeUndefined();
    });
  });

  describe('renamePasskey', () => {
    it('should rename passkey when caller owns the credential', async () => {
      mockCredentialRepo.findOne.mockResolvedValueOnce({ ...mockPasskey });

      const result = await passkeysService.renamePasskey(
        'passkey-db-uuid-1',
        'user-uuid-1',
        'New Device Nickname',
      );

      expect(result.label).toBe('New Device Nickname');
      expect(mockCredentialRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ label: 'New Device Nickname' }),
      );
    });

    it('should throw NotFoundException if credential does not belong to caller', async () => {
      mockCredentialRepo.findOne.mockResolvedValueOnce(null);

      await expect(
        passkeysService.renamePasskey('passkey-db-uuid-1', 'other-user', 'New Name'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('revokePasskey (Last-Passkey Safeguard)', () => {
    it('should REJECT revocation if passkey is the ONLY active passkey on account', async () => {
      mockCredentialRepo.findOne.mockResolvedValueOnce({ ...mockPasskey });
      // Only 1 active passkey
      mockCredentialRepo.count.mockResolvedValueOnce(1);

      await expect(
        passkeysService.revokePasskey('passkey-db-uuid-1', 'user-uuid-1'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        passkeysService.revokePasskey('passkey-db-uuid-1', 'user-uuid-1'),
      ).rejects.toThrow('Cannot remove your only active passkey');

      expect(mockCredentialRepo.save).not.toHaveBeenCalled();
    });

    it('should allow revocation when user has at least two active passkeys', async () => {
      mockCredentialRepo.findOne.mockResolvedValueOnce({ ...mockPasskey });
      // 2 active passkeys
      mockCredentialRepo.count.mockResolvedValueOnce(2);

      await passkeysService.revokePasskey('passkey-db-uuid-1', 'user-uuid-1');

      expect(mockCredentialRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          revokedAt: expect.any(Date),
        }),
      );
      expect(mockAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'PASSKEY_REVOKED',
          actorUserId: 'user-uuid-1',
        }),
      );
    });

    it('should throw NotFoundException if credential does not exist or belongs to another user', async () => {
      mockCredentialRepo.findOne.mockResolvedValueOnce(null);

      await expect(
        passkeysService.revokePasskey('invalid-id', 'user-uuid-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});

