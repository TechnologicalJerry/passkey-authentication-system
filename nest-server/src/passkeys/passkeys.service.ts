import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { PasskeyCredential } from './entities/passkey-credential.entity.js';
import type { PasskeySummaryDto } from './dto/passkey-summary.dto.js';
import { AuditService } from '../audit/audit.service.js';
import {
  AuditEventType,
  AuditOutcome,
} from '../audit/entities/audit-log.entity.js';

export interface CreatePasskeyParams {
  userId: string;
  credentialId: string;
  publicKey: Buffer;
  counter: number;
  transports?: string[] | null;
  deviceType?: string | null;
  backedUp?: boolean;
  label?: string | null;
  aaguid?: string | null;
}

@Injectable()
export class PasskeysService {
  private readonly logger = new Logger(PasskeysService.name);

  constructor(
    @InjectRepository(PasskeyCredential)
    private readonly credentialRepository: Repository<PasskeyCredential>,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Retrieves active (non-revoked) passkey credentials for a user.
   */
  async findActiveByUserId(userId: string): Promise<PasskeyCredential[]> {
    return this.credentialRepository.find({
      where: {
        userId,
        revokedAt: IsNull(),
      },
    });
  }

  /**
   * Finds an active credential by its WebAuthn credential ID.
   */
  async findByCredentialId(
    credentialId: string,
  ): Promise<PasskeyCredential | null> {
    return this.credentialRepository.findOne({
      where: {
        credentialId,
        revokedAt: IsNull(),
      },
      relations: ['user'],
    });
  }

  /**
   * Checks whether a user already possesses active passkeys.
   */
  async hasActiveCredentials(userId: string): Promise<boolean> {
    const count = await this.credentialRepository.count({
      where: {
        userId,
        revokedAt: IsNull(),
      },
    });
    return count > 0;
  }

  /**
   * Creates and persists a newly registered passkey credential.
   */
  async createCredential(
    params: CreatePasskeyParams,
    repository: Repository<PasskeyCredential> = this.credentialRepository,
  ): Promise<PasskeyCredential> {
    const credential = repository.create({
      userId: params.userId,
      credentialId: params.credentialId,
      publicKey: params.publicKey,
      counter: params.counter,
      transports: params.transports ?? null,
      deviceType: params.deviceType ?? null,
      backedUp: params.backedUp ?? false,
      label: params.label ?? 'Passkey',
      aaguid: params.aaguid ?? null,
    });

    const saved = await repository.save(credential);

    await this.auditService.logEvent({
      eventType: AuditEventType.PASSKEY_REGISTRATION_SUCCEEDED,
      actorUserId: params.userId,
      targetResourceId: saved.id,
      outcome: AuditOutcome.SUCCESS,
      metadata: { label: saved.label, deviceType: saved.deviceType },
    });

    return saved;
  }

  /**
   * Updates the signature counter and last-used timestamp on an authenticated credential.
   */
  async updateCounterAndLastUsed(
    credentialId: string,
    counter: number,
    repository: Repository<PasskeyCredential> = this.credentialRepository,
  ): Promise<void> {
    await repository.update(
      { credentialId },
      {
        counter,
        lastUsedAt: new Date(),
      },
    );
  }

  /**
   * Lists all passkeys (active and revoked) for the authenticated user with safe metadata only.
   * Public key bytes and internal counters are NEVER exposed to the client.
   */
  async listUserPasskeys(userId: string): Promise<PasskeySummaryDto[]> {
    const credentials = await this.credentialRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    return credentials.map((c) => ({
      id: c.id,
      credentialId: c.credentialId,
      label: c.label ?? 'Passkey',
      deviceType: c.deviceType,
      backedUp: c.backedUp,
      transports: c.transports,
      createdAt: c.createdAt.toISOString(),
      lastUsedAt: c.lastUsedAt ? c.lastUsedAt.toISOString() : null,
      isRevoked: c.revokedAt !== null,
    }));
  }

  /**
   * Renames a user's passkey label with strict ownership validation.
   */
  async renamePasskey(
    passkeyId: string,
    userId: string,
    newLabel: string,
  ): Promise<PasskeySummaryDto> {
    const credential = await this.credentialRepository.findOne({
      where: { id: passkeyId, userId, revokedAt: IsNull() },
    });

    if (!credential) {
      throw new NotFoundException(
        'Passkey not found or does not belong to user',
      );
    }

    credential.label = newLabel;
    const updated = await this.credentialRepository.save(credential);

    await this.auditService.logEvent({
      eventType: AuditEventType.PASSKEY_RENAMED,
      actorUserId: userId,
      targetResourceId: credential.id,
      outcome: AuditOutcome.SUCCESS,
      metadata: { newLabel },
    });

    return {
      id: updated.id,
      credentialId: updated.credentialId,
      label: updated.label ?? 'Passkey',
      deviceType: updated.deviceType,
      backedUp: updated.backedUp,
      transports: updated.transports,
      createdAt: updated.createdAt.toISOString(),
      lastUsedAt: updated.lastUsedAt ? updated.lastUsedAt.toISOString() : null,
      isRevoked: false,
    };
  }

  /**
   * Revokes a passkey with strict ownership check and LAST-PASSKEY LOCKOUT PROTECTION.
   */
  async revokePasskey(passkeyId: string, userId: string): Promise<void> {
    const credential = await this.credentialRepository.findOne({
      where: { id: passkeyId, userId, revokedAt: IsNull() },
    });

    if (!credential) {
      throw new NotFoundException(
        'Passkey not found or does not belong to user',
      );
    }

    // Last-Passkey Safeguard: Prevent account lockout
    const activeCount = await this.credentialRepository.count({
      where: { userId, revokedAt: IsNull() },
    });

    if (activeCount <= 1) {
      throw new BadRequestException(
        'Cannot remove your only active passkey. Add another passkey before removing this one to prevent permanent account lockout.',
      );
    }

    credential.revokedAt = new Date();
    await this.credentialRepository.save(credential);

    await this.auditService.logEvent({
      eventType: AuditEventType.PASSKEY_REVOKED,
      actorUserId: userId,
      targetResourceId: credential.id,
      outcome: AuditOutcome.SUCCESS,
      metadata: { label: credential.label },
    });

    this.logger.log(`Passkey ${passkeyId} revoked by user ${userId}`);
  }

  /**
   * Revokes all active passkeys for a user (used during account deletion/anonymization).
   */
  async revokeAllUserPasskeys(userId: string): Promise<number> {
    const result = await this.credentialRepository
      .createQueryBuilder()
      .update(PasskeyCredential)
      .set({ revokedAt: new Date() })
      .where('userId = :userId', { userId })
      .andWhere('revokedAt IS NULL')
      .execute();

    return result.affected ?? 0;
  }
}
