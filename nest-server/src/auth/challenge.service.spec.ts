import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { ChallengeService } from './challenge.service.js';
import { AuthChallenge, ChallengeCeremony } from './entities/auth-challenge.entity.js';

describe('ChallengeService', () => {
  let service: ChallengeService;
  let mockRepository: {
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
    createQueryBuilder: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockRepository = {
      create: vi.fn((dto) => dto),
      save: vi.fn((entity) => Promise.resolve({ id: 'mock-challenge-uuid', ...entity })),
      findOne: vi.fn(),
      createQueryBuilder: vi.fn(),
    };

    service = new ChallengeService(mockRepository as unknown as Repository<AuthChallenge>);
  });

  describe('createChallenge', () => {
    it('should create and persist a challenge with calculated expiration time', async () => {
      const result = await service.createChallenge({
        challenge: 'random-crypto-challenge-string',
        ceremonyType: ChallengeCeremony.REGISTRATION,
        userId: 'user-uuid-1',
        ttlMs: 60000,
      });

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          challenge: 'random-crypto-challenge-string',
          ceremonyType: ChallengeCeremony.REGISTRATION,
          userId: 'user-uuid-1',
          expiresAt: expect.any(Date),
        }),
      );
      expect(result.id).toBe('mock-challenge-uuid');
    });
  });

  describe('consumeChallenge', () => {
    it('should successfully consume an active challenge via atomic conditional update', async () => {
      const mockConsumedChallenge = {
        id: 'challenge-uuid',
        challenge: 'valid-challenge-string',
        ceremonyType: ChallengeCeremony.REGISTRATION,
        consumedAt: new Date(),
        expiresAt: new Date(Date.now() + 10000),
      };

      const mockQueryBuilder = {
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        returning: vi.fn().mockReturnThis(),
        execute: vi.fn().mockResolvedValue({ raw: [mockConsumedChallenge] }),
      };
      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.consumeChallenge('challenge-uuid', ChallengeCeremony.REGISTRATION);

      expect(result).toEqual(mockConsumedChallenge);
    });

    it('should throw BadRequestException if challenge is not found', async () => {
      const mockQueryBuilder = {
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        returning: vi.fn().mockReturnThis(),
        execute: vi.fn().mockResolvedValue({ raw: [] }),
      };
      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.consumeChallenge('non-existent-uuid', ChallengeCeremony.REGISTRATION),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if ceremony type mismatches', async () => {
      const mockQueryBuilder = {
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        returning: vi.fn().mockReturnThis(),
        execute: vi.fn().mockResolvedValue({ raw: [] }),
      };
      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockRepository.findOne.mockResolvedValue({
        id: 'challenge-uuid',
        ceremonyType: ChallengeCeremony.AUTHENTICATION,
        consumedAt: null,
        expiresAt: new Date(Date.now() + 10000),
      });

      await expect(
        service.consumeChallenge('challenge-uuid', ChallengeCeremony.REGISTRATION),
      ).rejects.toThrow('Challenge ceremony mismatch');
    });

    it('should throw BadRequestException on challenge replay (already consumed)', async () => {
      const mockQueryBuilder = {
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        returning: vi.fn().mockReturnThis(),
        execute: vi.fn().mockResolvedValue({ raw: [] }),
      };
      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockRepository.findOne.mockResolvedValue({
        id: 'challenge-uuid',
        ceremonyType: ChallengeCeremony.REGISTRATION,
        consumedAt: new Date(Date.now() - 5000),
        expiresAt: new Date(Date.now() + 10000),
      });

      await expect(
        service.consumeChallenge('challenge-uuid', ChallengeCeremony.REGISTRATION),
      ).rejects.toThrow('replay detected');
    });

    it('should throw BadRequestException if challenge has expired', async () => {
      const mockQueryBuilder = {
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        returning: vi.fn().mockReturnThis(),
        execute: vi.fn().mockResolvedValue({ raw: [] }),
      };
      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockRepository.findOne.mockResolvedValue({
        id: 'challenge-uuid',
        ceremonyType: ChallengeCeremony.REGISTRATION,
        consumedAt: null,
        expiresAt: new Date(Date.now() - 5000), // in the past
      });

      await expect(
        service.consumeChallenge('challenge-uuid', ChallengeCeremony.REGISTRATION),
      ).rejects.toThrow('expired');
    });
  });
});

