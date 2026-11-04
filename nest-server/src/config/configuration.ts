import type { AppConfig } from '../common/types/index.js';
import { APP_CONSTANTS } from '../common/constants/app.constants.js';

export default (): AppConfig => {
  const nodeEnv =
    (process.env.NODE_ENV as AppConfig['nodeEnv']) ?? 'development';
  const isProduction = nodeEnv === 'production';

  // In production, swagger is disabled by default unless explicitly set to 'true'.
  // In development and testing, swagger is enabled by default unless explicitly set to 'false'.
  const swaggerEnabled = isProduction
    ? process.env.SWAGGER_ENABLED === 'true'
    : process.env.SWAGGER_ENABLED !== 'false';

  const rawOrigins = process.env.CORS_ORIGINS ?? 'http://localhost:3000';
  const parsedOrigins = rawOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  const rawRpOrigins =
    process.env.RP_ORIGIN ??
    process.env.CORS_ORIGINS ??
    'http://localhost:3000';
  const parsedRpOrigins = rawRpOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  const cookieSecure =
    process.env.COOKIE_SECURE !== undefined
      ? process.env.COOKIE_SECURE === 'true'
      : isProduction;

  return {
    nodeEnv,
    port: parseInt(process.env.PORT ?? String(APP_CONSTANTS.DEFAULT_PORT), 10),
    api: {
      prefix: process.env.API_PREFIX ?? APP_CONSTANTS.DEFAULT_API_PREFIX,
      version: process.env.API_VERSION ?? APP_CONSTANTS.DEFAULT_API_VERSION,
    },
    database: {
      url: process.env.DATABASE_URL,
      host: process.env.DATABASE_HOST ?? 'localhost',
      port: parseInt(process.env.DATABASE_PORT ?? '5432', 10),
      user: process.env.DATABASE_USER ?? 'postgres',
      password: process.env.DATABASE_PASSWORD ?? 'postgres',
      name: process.env.DATABASE_NAME ?? 'passkey_auth',
      ssl: process.env.DATABASE_SSL === 'true',
    },
    cors: {
      origins:
        parsedOrigins.length > 0 ? parsedOrigins : ['http://localhost:3000'],
    },
    logging: {
      level: process.env.LOG_LEVEL ?? 'info',
    },
    swagger: {
      enabled: swaggerEnabled,
    },
    throttler: {
      ttl: parseInt(
        process.env.THROTTLE_TTL ?? String(APP_CONSTANTS.DEFAULT_THROTTLE_TTL),
        10,
      ),
      limit: parseInt(
        process.env.THROTTLE_LIMIT ??
          String(APP_CONSTANTS.DEFAULT_THROTTLE_LIMIT),
        10,
      ),
    },
    webauthn: {
      rpName: process.env.RP_NAME ?? APP_CONSTANTS.DEFAULT_RP_NAME,
      rpId: process.env.RP_ID ?? APP_CONSTANTS.DEFAULT_RP_ID,
      origins:
        parsedRpOrigins.length > 0
          ? parsedRpOrigins
          : ['http://localhost:3000'],
      challengeTtlMs: parseInt(
        process.env.CHALLENGE_TTL_MS ??
          String(APP_CONSTANTS.DEFAULT_CHALLENGE_TTL_MS),
        10,
      ),
      userVerification:
        (process.env
          .USER_VERIFICATION as AppConfig['webauthn']['userVerification']) ??
        APP_CONSTANTS.DEFAULT_USER_VERIFICATION,
    },
    jwt: {
      accessSecret:
        process.env.JWT_ACCESS_SECRET ??
        'dev-jwt-access-secret-min-32-chars-key!',
      accessTtl:
        process.env.JWT_ACCESS_TTL ?? APP_CONSTANTS.DEFAULT_JWT_ACCESS_TTL,
      issuer: process.env.JWT_ISSUER ?? APP_CONSTANTS.DEFAULT_JWT_ISSUER,
      audience: process.env.JWT_AUDIENCE ?? APP_CONSTANTS.DEFAULT_JWT_AUDIENCE,
    },
    session: {
      refreshTokenTtlDays: parseInt(
        process.env.REFRESH_TOKEN_TTL_DAYS ??
          String(APP_CONSTANTS.DEFAULT_REFRESH_TOKEN_TTL_DAYS),
        10,
      ),
      refreshTokenSecret:
        process.env.REFRESH_TOKEN_SECRET ??
        'dev-refresh-token-hmac-salt-32-chars!',
      maxActiveSessions: parseInt(
        process.env.MAX_ACTIVE_SESSIONS_PER_USER ??
          String(APP_CONSTANTS.DEFAULT_MAX_ACTIVE_SESSIONS),
        10,
      ),
      cookieName: process.env.COOKIE_NAME ?? APP_CONSTANTS.DEFAULT_COOKIE_NAME,
      cookieSecure,
      cookieSameSite:
        (process.env
          .COOKIE_SAME_SITE as AppConfig['session']['cookieSameSite']) ??
        APP_CONSTANTS.DEFAULT_COOKIE_SAME_SITE,
    },
    enrollment: {
      invitationRequired: process.env.ENROLLMENT_INVITATION_REQUIRED === 'true',
    },
    security: {
      trustProxy: process.env.TRUST_PROXY !== 'false',
    },
  };
};
