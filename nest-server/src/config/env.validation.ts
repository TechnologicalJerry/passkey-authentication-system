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
});
