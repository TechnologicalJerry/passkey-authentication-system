import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('enrollment_invitations')
export class EnrollmentInvitation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_enrollment_invitations_email')
  @Column({ type: 'varchar', length: 255 })
  email!: string;

  @Index('idx_enrollment_invitations_token_hash', { unique: true })
  @Column({ type: 'varchar', length: 255, unique: true })
  tokenHash!: string;

  @Index('idx_enrollment_invitations_expires_at')
  @Column({ type: 'timestamptz' })
  expiresAt!: Date;

  @Index('idx_enrollment_invitations_consumed_at')
  @Column({ type: 'timestamptz', nullable: true })
  consumedAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
