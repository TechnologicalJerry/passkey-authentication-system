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

export interface AuthSuccessResult {
  verified: boolean;
  user: UserSummary;
}
