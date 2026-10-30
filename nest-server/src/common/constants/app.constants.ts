/**
 * Application-wide constants.
 */
export const APP_CONSTANTS = {
  DEFAULT_PORT: 3000,
  DEFAULT_API_PREFIX: 'api',
  DEFAULT_API_VERSION: '1',
  DEFAULT_THROTTLE_TTL: 60000, // 60 seconds (in milliseconds for NestJS Throttler v6)
  DEFAULT_THROTTLE_LIMIT: 100, // 100 requests per TTL window
  HEALTH_DATABASE_TIMEOUT: 5000, // 5 seconds
} as const;

export const SENSITIVE_LOG_KEYS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["set-cookie"]',
  'body.password',
  'body.secret',
  'body.token',
  'body.accessToken',
  'body.refreshToken',
  'body.clientDataJSON',
  'body.attestationObject',
  'body.authenticatorData',
  'body.signature',
  'body.userHandle',
  'body.credential',
  '*.password',
  '*.secret',
  '*.token',
  '*.privateKey',
  '*.credential',
] as const;

