/**
 * Common application types and interfaces.
 */

export interface AppConfig {
  nodeEnv: 'development' | 'production' | 'test';
  port: number;
  api: {
    prefix: string;
    version: string;
  };
  database: {
    url?: string;
    host: string;
    port: number;
    user: string;
    password: string;
    name: string;
    ssl: boolean;
  };
  cors: {
    origins: string[];
  };
  logging: {
    level: string;
  };
  swagger: {
    enabled: boolean;
  };
  throttler: {
    ttl: number;
    limit: number;
  };
  webauthn: {
    rpName: string;
    rpId: string;
    origins: string[];
    challengeTtlMs: number;
    userVerification: 'preferred' | 'required' | 'discouraged';
  };
  jwt: {
    accessSecret: string;
    accessTtl: string;
    issuer: string;
    audience: string;
  };
  session: {
    refreshTokenTtlDays: number;
    refreshTokenSecret: string;
    maxActiveSessions: number;
    cookieName: string;
    cookieSecure: boolean;
    cookieSameSite: 'lax' | 'strict' | 'none';
  };
}

export interface HealthCheckResult {
  status: 'ok' | 'error';
  info?: Record<string, unknown>;
  details?: Record<string, unknown>;
  timestamp?: string;
  uptime?: number;
}

export interface ErrorResponse {
  statusCode: number;
  error: string;
  message: string | object;
  timestamp: string;
  path: string;
}

export interface UserSummary {
  id: string;
  email: string;
  status: string;
  emailVerified: boolean;
  createdAt: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // in seconds
  tokenType: 'Bearer';
}

export interface AuthSuccessResult {
  verified: boolean;
  user: UserSummary;
  tokens?: TokenPair;
}

export interface JwtPayload {
  sub: string;
  email: string;
  sessionId: string;
  jti: string;
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  sessionId: string;
  tokenId: string;
}

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
