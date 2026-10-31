import {
  Injectable,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { AuthChallenge, ChallengeCeremony } from './entities/auth-challenge.entity.js';

export interface CreateChallengeParams {
  challenge: string;
  ceremonyType: ChallengeCeremony;
  userId?: string | null;
  ttlMs: number;
}

@Injectable()
export class ChallengeService {
  private readonly logger = new Logger(ChallengeService.name);

  constructor(
    @InjectRepository(AuthChallenge)
    private readonly challengeRepository: Repository<AuthChallenge>,
  ) {}

  /**
   * Persists a server-generated challenge with a bounded time-to-live.
   */
  async createChallenge(params: CreateChallengeParams): Promise<AuthChallenge> {
    const expiresAt = new Date(Date.now() + params.ttlMs);

    const challengeRecord = this.challengeRepository.create({
      challenge: params.challenge,
      ceremonyType: params.ceremonyType,
      userId: params.userId ?? null,
      expiresAt,
    });

    return this.challengeRepository.save(challengeRecord);
  }

  /**
   * Atomically verifies and consumes an authentication or registration challenge.
   * Prevents replay attacks by ensuring a challenge can only be consumed once.
   *
   * @param challengeId Unique ID of the challenge record
   * @param ceremony Expected ceremony type (REGISTRATION or AUTHENTICATION)
   * @param entityManager Optional transactional EntityManager for atomic multi-step operations
   */
  async consumeChallenge(
    challengeId: string,
    ceremony: ChallengeCeremony,
    entityManager?: EntityManager,
  ): Promise<AuthChallenge> {
    const repo = entityManager
      ? entityManager.getRepository(AuthChallenge)
      : this.challengeRepository;

    const now = new Date();

    // Perform an atomic update: mark consumed only if currently unconsumed and not expired
    const updateResult = await repo
      .createQueryBuilder()
      .update(AuthChallenge)
      .set({ consumedAt: now })
      .where('id = :id', { id: challengeId })
      .andWhere('ceremonyType = :ceremony', { ceremony })
      .andWhere('consumedAt IS NULL')
      .andWhere('expiresAt > :now', { now })
      .returning('*')
      .execute();

    const consumedRecord = updateResult.raw?.[0] as AuthChallenge | undefined;

    if (!consumedRecord) {
      // Investigate reason without leaking raw challenge value to logs
      const existing = await repo.findOne({ where: { id: challengeId } });
      if (!existing) {
        throw new BadRequestException('Invalid authentication challenge');
      }
      if (existing.ceremonyType !== ceremony) {
        throw new BadRequestException('Challenge ceremony mismatch');
      }
      if (existing.consumedAt !== null) {
        throw new BadRequestException('Authentication challenge has already been used (replay detected)');
      }
      if (existing.expiresAt <= now) {
        throw new BadRequestException('Authentication challenge has expired');
      }
      throw new BadRequestException('Challenge consumption failed');
    }

    return consumedRecord;
  }
}

