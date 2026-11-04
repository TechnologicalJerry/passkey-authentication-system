import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PasskeysController } from './passkeys.controller.js';
import type { PasskeysService } from './passkeys.service.js';
import type { AuthService } from '../auth/auth.service.js';
import type { AuthenticatedUser } from '../common/types/index.js';

describe('PasskeysController', () => {
  let controller: PasskeysController;
  let mockPasskeysService: {
    listUserPasskeys: ReturnType<typeof vi.fn>;
    renamePasskey: ReturnType<typeof vi.fn>;
    revokePasskey: ReturnType<typeof vi.fn>;
  };
  let mockAuthService: {
    generateRegistrationOptions: ReturnType<typeof vi.fn>;
  };

  const authUser: AuthenticatedUser = {
    id: 'user-uuid-1',
    email: 'user@example.com',
    sessionId: 'session-uuid-1',
    tokenId: 'jti-uuid-1',
  };

  beforeEach(() => {
    mockPasskeysService = {
      listUserPasskeys: vi.fn().mockResolvedValue([
        {
          id: 'cred-1',
          credentialId: 'webauthn-id-1',
          label: 'Passkey 1',
          deviceType: 'singleDevice',
          backedUp: false,
          transports: ['internal'],
          createdAt: '2026-01-01T00:00:00.000Z',
          lastUsedAt: null,
          isRevoked: false,
        },
      ]),
      renamePasskey: vi.fn().mockResolvedValue({
        id: 'cred-1',
        label: 'Renamed Key',
      }),
      revokePasskey: vi.fn().mockResolvedValue(undefined),
    };

    mockAuthService = {
      generateRegistrationOptions: vi.fn().mockResolvedValue({
        challengeId: 'challenge-uuid',
        options: {},
      }),
    };

    controller = new PasskeysController(
      mockPasskeysService as unknown as PasskeysService,
      mockAuthService as unknown as AuthService,
    );
  });

  it('GET / lists user passkeys', async () => {
    const result = await controller.listPasskeys(authUser);
    expect(result).toHaveLength(1);
    expect(mockPasskeysService.listUserPasskeys).toHaveBeenCalledWith(
      'user-uuid-1',
    );
  });

  it('PATCH /:id renames passkey', async () => {
    const result = await controller.renamePasskey(
      { id: 'c4b9d0b8-158a-4934-8b65-726ef352d0d1' },
      authUser,
      { label: 'Renamed Key' },
    );
    expect(result.label).toBe('Renamed Key');
    expect(mockPasskeysService.renamePasskey).toHaveBeenCalledWith(
      'c4b9d0b8-158a-4934-8b65-726ef352d0d1',
      'user-uuid-1',
      'Renamed Key',
    );
  });

  it('DELETE /:id revokes passkey', async () => {
    const result = await controller.revokePasskey(
      { id: 'c4b9d0b8-158a-4934-8b65-726ef352d0d1' },
      authUser,
    );
    expect(result.success).toBe(true);
    expect(mockPasskeysService.revokePasskey).toHaveBeenCalledWith(
      'c4b9d0b8-158a-4934-8b65-726ef352d0d1',
      'user-uuid-1',
    );
  });

  it('POST /registration/options generates options for adding additional passkey to current account', async () => {
    const result = await controller.generateAdditionalPasskeyOptions(authUser);
    expect(result.challengeId).toBe('challenge-uuid');
    expect(mockAuthService.generateRegistrationOptions).toHaveBeenCalledWith(
      { email: 'user@example.com' },
      'user-uuid-1',
    );
  });
});
