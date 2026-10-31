import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity.js';

export enum ChallengeCeremony {
  REGISTRATION = 'REGISTRATION',
  AUTHENTICATION = 'AUTHENTICATION',
}

@Entity('auth_challenges')
export class AuthChallenge {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_auth_challenges_challenge', { unique: true })
  @Column({ type: 'varchar', length: 512, unique: true })
  challenge!: string;

  @Column({
    type: 'enum',
    enum: ChallengeCeremony,
  })
  ceremonyType!: ChallengeCeremony;

  @Index('idx_auth_challenges_user_id')
  @Column({ type: 'uuid', nullable: true })
  userId!: string | null;

  @ManyToOne(() => User, (user) => user.challenges, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User | null;

  @Index('idx_auth_challenges_expires_at')
  @Column({ type: 'timestamptz' })
  expiresAt!: Date;

  @Index('idx_auth_challenges_consumed_at')
  @Column({ type: 'timestamptz', nullable: true })
  consumedAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}

