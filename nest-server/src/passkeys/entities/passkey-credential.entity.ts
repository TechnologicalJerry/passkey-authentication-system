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

@Entity('passkey_credentials')
export class PasskeyCredential {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_passkey_credentials_user_id')
  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, (user) => user.credentials, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Index('idx_passkey_credentials_credential_id', { unique: true })
  @Column({ type: 'varchar', length: 1024, unique: true })
  credentialId!: string;

  @Column({ type: 'bytea' })
  publicKey!: Buffer;

  @Column({ type: 'bigint', default: 0 })
  counter!: number | string;

  @Column({ type: 'text', array: true, nullable: true })
  transports!: string[] | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  deviceType!: string | null;

  @Column({ type: 'boolean', default: false })
  backedUp!: boolean;

  @Column({ type: 'varchar', length: 128, nullable: true })
  label!: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  aaguid!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  lastUsedAt!: Date | null;

  @Index('idx_passkey_credentials_user_revoked', ['userId', 'revokedAt'])
  @Column({ type: 'timestamptz', nullable: true })
  revokedAt!: Date | null;
}
