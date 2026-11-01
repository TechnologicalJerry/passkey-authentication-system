import Joi from 'joi';

export const environmentValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),

  PORT: Joi.number().port().default(3000),

  API_PREFIX: Joi.string().trim().default('api'),

  API_VERSION: Joi.string().trim().default('1'),

  DATABASE_HOST: Joi.string().default('localhost'),

  DATABASE_PORT: Joi.number().port().default(5432),

  DATABASE_USER: Joi.string().default('postgres'),

  DATABASE_PASSWORD: Joi.string().allow('').default('postgres'),

  DATABASE_NAME: Joi.string().default('passkey_auth'),

  DATABASE_URL: Joi.string().uri({ scheme: [/postgres/, /postgresql/] }).optional(),

  DATABASE_SSL: Joi.boolean().default(false),

  CORS_ORIGINS: Joi.string().default('http://localhost:3000'),

  LOG_LEVEL: Joi.string()
    .valid('fatal', 'error', 'warn', 'info', 'debug', 'trace')
    .default('info'),

  SWAGGER_ENABLED: Joi.boolean().default(false),

  THROTTLE_TTL: Joi.number().positive().default(60000),

  THROTTLE_LIMIT: Joi.number().positive().default(100),

  // WebAuthn / FIDO2 Relying Party Configuration
  RP_NAME: Joi.string().trim().default('Passkey Authentication System'),

  RP_ID: Joi.string().trim().default('localhost'),

  RP_ORIGIN: Joi.string().default('http://localhost:3000'),

  CHALLENGE_TTL_MS: Joi.number().positive().default(60000),

  USER_VERIFICATION: Joi.string()
    .valid('preferred', 'required', 'discouraged')
    .default('preferred'),

  // JWT Access Token Configuration
  JWT_ACCESS_SECRET: Joi.string()
    .min(32)
    .default('dev-jwt-access-secret-min-32-chars-key!'),

  JWT_ACCESS_TTL: Joi.string()
    .pattern(/^[0-9]+[smhd]$/)
    .default('15m'),

  JWT_ISSUER: Joi.string().trim().default('passkey-auth-api'),

  JWT_AUDIENCE: Joi.string().trim().default('passkey-auth-app'),

  // Session & Refresh Token Configuration
  REFRESH_TOKEN_TTL_DAYS: Joi.number().integer().min(1).max(90).default(7),

  REFRESH_TOKEN_SECRET: Joi.string()
    .min(32)
    .default('dev-refresh-token-hmac-salt-32-chars!'),

  MAX_ACTIVE_SESSIONS_PER_USER: Joi.number().integer().min(1).max(20).default(5),

  COOKIE_NAME: Joi.string().trim().default('refresh_token'),

  COOKIE_SECURE: Joi.boolean().default(false),

  COOKIE_SAME_SITE: Joi.string()
    .valid('lax', 'strict', 'none')
    .default('lax'),

  // Stage 4 Hardening & Enrollment
  ENROLLMENT_INVITATION_REQUIRED: Joi.boolean().default(false),

  TRUST_PROXY: Joi.boolean().default(true),
});
