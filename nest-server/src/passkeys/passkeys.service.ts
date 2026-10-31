import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { PasskeyCredential } from './entities/passkey-credential.entity.js';

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
  async findByCredentialId(credentialId: string): Promise<PasskeyCredential | null> {
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

    return repository.save(credential);
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
}

