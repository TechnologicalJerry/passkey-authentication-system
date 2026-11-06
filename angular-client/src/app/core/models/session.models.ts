export interface SessionSummary {
  id: string;
  createdAt: string;
  lastActivityAt: string;
  expiresAt: string;
  ipAddress: string | null;
  userAgent: string | null;
  deviceLabel: string | null;
  isCurrent: boolean;
  isRevoked: boolean;
}

export interface RotateTokenResult {
  session: SessionSummary;
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    tokenType: 'Bearer';
  };
}
