import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { PasskeyCredential } from '../../passkeys/entities/passkey-credential.entity.js';
import { AuthChallenge } from '../../auth/entities/auth-challenge.entity.js';
import { Session } from '../../sessions/entities/session.entity.js';

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

  @OneToMany(() => PasskeyCredential, (credential) => credential.user)
  credentials!: PasskeyCredential[];

  @OneToMany(() => AuthChallenge, (challenge) => challenge.user)
  challenges!: AuthChallenge[];

  @OneToMany(() => Session, (session) => session.user)
  sessions!: Session[];

  /**
   * Helper to consistently sanitize and normalize email addresses.
   */
  static normalizeEmail(rawEmail: string): string {
    return rawEmail.trim().toLowerCase();
  }
}
