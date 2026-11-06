export interface UserProfile {
  id: string;
  email: string;
  displayName: string | null;
  status: 'ACTIVE' | 'PENDING' | 'SUSPENDED';
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  passkeyCount: number;
  activeSessionCount: number;
}

export interface UpdateProfileDto {
  displayName: string;
}

export interface AuditLog {
  id: string;
  eventType: string;
  actorUserId: string | null;
  targetUserId: string | null;
  outcome: 'SUCCESS' | 'FAILURE' | 'CHALLENGE_ISSUED';
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}
