import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import type { PasskeyCredential } from '../../passkeys/entities/passkey-credential.entity.js';
import type { AuthChallenge } from '../../auth/entities/auth-challenge.entity.js';
import type { Session } from '../../sessions/entities/session.entity.js';

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  PENDING = 'PENDING',
  SUSPENDED = 'SUSPENDED',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_users_email', { unique: true })
  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  @Column({ type: 'varchar', length: 128, nullable: true })
  displayName!: string | null;

  @Index('idx_users_status')
  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.ACTIVE,
  })
  status!: UserStatus;

  @Column({ type: 'timestamptz', nullable: true })
  emailVerifiedAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(
    'PasskeyCredential',
    (credential: PasskeyCredential) => credential.user,
  )
  credentials!: PasskeyCredential[];

  @OneToMany('AuthChallenge', (challenge: AuthChallenge) => challenge.user)
  challenges!: AuthChallenge[];

  @OneToMany('Session', (session: Session) => session.user)
  sessions!: Session[];

  /**
   * Helper to consistently sanitize and normalize email addresses.
   */
  static normalizeEmail(rawEmail: string): string {
    return rawEmail.trim().toLowerCase();
  }
}
