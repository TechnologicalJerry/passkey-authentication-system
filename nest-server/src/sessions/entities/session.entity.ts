import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  VersionColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity.js';

export enum RevocationReason {
  USER_LOGOUT = 'USER_LOGOUT',
  ALL_SESSIONS_REVOKED = 'ALL_SESSIONS_REVOKED',
  REUSE_DETECTED = 'REUSE_DETECTED',
  SESSION_LIMIT_EXCEEDED = 'SESSION_LIMIT_EXCEEDED',
  ADMIN_REVOKED = 'ADMIN_REVOKED',
  SECURITY_POLICY = 'SECURITY_POLICY',
}

@Entity('sessions')
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_sessions_user_id')
  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, (user) => user.sessions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Index('idx_sessions_refresh_token_hash')
  @Column({ type: 'varchar', length: 128 })
  refreshTokenHash!: string;

  @Index('idx_sessions_prev_token_hash')
  @Column({ type: 'varchar', length: 128, nullable: true })
  previousRefreshTokenHash!: string | null;

  @Index('idx_sessions_family')
  @Column({ type: 'uuid' })
  refreshTokenFamily!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;

  @Column({ type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ type: 'timestamptz' })
  lastActivityAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  lastRefreshAt!: Date | null;

  @Index('idx_sessions_revoked_at')
  @Column({ type: 'timestamptz', nullable: true })
  revokedAt!: Date | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  revocationReason!: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  ipAddress!: string | null;

  @Column({ type: 'varchar', length: 512, nullable: true })
  userAgent!: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  deviceLabel!: string | null;

  @VersionColumn({ default: 1 })
  version!: number;

  /**
   * Helper to check if the session is currently active (unrevoked and unexpired).
   */
  get isActive(): boolean {
    return this.revokedAt === null && this.expiresAt > new Date();
  }
}

