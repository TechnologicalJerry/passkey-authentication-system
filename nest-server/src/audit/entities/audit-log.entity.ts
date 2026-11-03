import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum AuditOutcome {
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE',
}

export enum AuditEventType {
  PASSKEY_REGISTRATION_STARTED = 'PASSKEY_REGISTRATION_STARTED',
  PASSKEY_REGISTRATION_SUCCEEDED = 'PASSKEY_REGISTRATION_SUCCEEDED',
  PASSKEY_REGISTRATION_FAILED = 'PASSKEY_REGISTRATION_FAILED',
  PASSKEY_AUTHENTICATION_SUCCEEDED = 'PASSKEY_AUTHENTICATION_SUCCEEDED',
  PASSKEY_AUTHENTICATION_FAILED = 'PASSKEY_AUTHENTICATION_FAILED',
  PASSKEY_RENAMED = 'PASSKEY_RENAMED',
  PASSKEY_REVOKED = 'PASSKEY_REVOKED',
  ACCOUNT_PROFILE_UPDATED = 'ACCOUNT_PROFILE_UPDATED',
  ACCOUNT_DEACTIVATED = 'ACCOUNT_DEACTIVATED',
  ACCOUNT_DELETED = 'ACCOUNT_DELETED',
  SESSION_CREATED = 'SESSION_CREATED',
  TOKEN_ROTATED = 'TOKEN_ROTATED',
  TOKEN_REUSE_DETECTED = 'TOKEN_REUSE_DETECTED',
  SESSION_REVOKED = 'SESSION_REVOKED',
  USER_LOGOUT = 'USER_LOGOUT',
  ALL_SESSIONS_LOGOUT = 'ALL_SESSIONS_LOGOUT',
  ENROLLMENT_INVITATION_CREATED = 'ENROLLMENT_INVITATION_CREATED',
  ENROLLMENT_INVITATION_CONSUMED = 'ENROLLMENT_INVITATION_CONSUMED',
}

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_audit_logs_event_type')
  @Column({ type: 'varchar', length: 64 })
  eventType!: string;

  @Index('idx_audit_logs_actor_user_id')
  @Column({ type: 'uuid', nullable: true })
  actorUserId!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  targetResourceId!: string | null;

  @Column({
    type: 'enum',
    enum: AuditOutcome,
    default: AuditOutcome.SUCCESS,
  })
  outcome!: AuditOutcome;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ipAddress!: string | null;

  @Column({ type: 'text', nullable: true })
  userAgent!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  @Index('idx_audit_logs_created_at')
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
