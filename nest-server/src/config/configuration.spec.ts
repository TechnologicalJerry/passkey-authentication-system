import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import configuration from './configuration.js';
import { environmentValidationSchema } from './env.validation.js';

describe('Configuration & Environment Validation', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('configuration() factory', () => {
    it('should return safe default values when environment variables are omitted', () => {
      delete process.env.PORT;
      delete process.env.NODE_ENV;
      delete process.env.API_PREFIX;
      delete process.env.API_VERSION;
      delete process.env.DATABASE_HOST;
      delete process.env.DATABASE_PORT;
      delete process.env.CORS_ORIGINS;
      delete process.env.LOG_LEVEL;
      delete process.env.SWAGGER_ENABLED;
      delete process.env.RP_NAME;
      delete process.env.RP_ID;
      delete process.env.RP_ORIGIN;
      delete process.env.CHALLENGE_TTL_MS;
      delete process.env.USER_VERIFICATION;

      const config = configuration();

      expect(config.nodeEnv).toBe('development');
      expect(config.port).toBe(3000);
      expect(config.api.prefix).toBe('api');
      expect(config.api.version).toBe('1');
      expect(config.database.host).toBe('localhost');
      expect(config.database.port).toBe(5432);
      expect(config.database.name).toBe('passkey_auth');
      expect(config.cors.origins).toEqual(['http://localhost:3000']);
      expect(config.logging.level).toBe('info');
      expect(config.swagger.enabled).toBe(true); // Default true in development
      expect(config.webauthn.rpName).toBe('Passkey Authentication System');
      expect(config.webauthn.rpId).toBe('localhost');
      expect(config.webauthn.origins).toEqual(['http://localhost:3000']);
      expect(config.webauthn.challengeTtlMs).toBe(60000);
      expect(config.webauthn.userVerification).toBe('preferred');
    });

    it('should disable Swagger in production by default unless explicitly enabled', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.SWAGGER_ENABLED;

      let config = configuration();
      expect(config.swagger.enabled).toBe(false);

      process.env.SWAGGER_ENABLED = 'true';
      config = configuration();
      expect(config.swagger.enabled).toBe(true);
    });

    it('should parse comma-separated CORS and WebAuthn origins and trim whitespace', () => {
      process.env.CORS_ORIGINS = ' https://app.example.com , https://admin.example.com ';
      process.env.RP_ORIGIN = ' https://auth.example.com ';

      const config = configuration();
      expect(config.cors.origins).toEqual([
        'https://app.example.com',
        'https://admin.example.com',
      ]);
      expect(config.webauthn.origins).toEqual(['https://auth.example.com']);
    });
  });

  describe('environmentValidationSchema (Joi)', () => {
    it('should validate valid environment configuration including WebAuthn settings', () => {
      const validConfig = {
        NODE_ENV: 'production',
        PORT: 8080,
        API_PREFIX: 'api',
        API_VERSION: '1',
        DATABASE_HOST: 'db.example.com',
        DATABASE_PORT: 5432,
        DATABASE_USER: 'app_user',
        DATABASE_PASSWORD: 'secure_password',
        DATABASE_NAME: 'passkey_db',
        DATABASE_SSL: true,
        CORS_ORIGINS: 'https://example.com',
        LOG_LEVEL: 'warn',
        SWAGGER_ENABLED: false,
        THROTTLE_TTL: 60000,
        THROTTLE_LIMIT: 50,
        RP_NAME: 'Production Relying Party',
        RP_ID: 'auth.example.com',
        RP_ORIGIN: 'https://app.example.com',
        CHALLENGE_TTL_MS: 30000,
        USER_VERIFICATION: 'required',
      };

      const { error, value } = environmentValidationSchema.validate(validConfig);
      expect(error).toBeUndefined();
      expect(value.PORT).toBe(8080);
      expect(value.NODE_ENV).toBe('production');
      expect(value.DATABASE_SSL).toBe(true);
      expect(value.RP_ID).toBe('auth.example.com');
      expect(value.USER_VERIFICATION).toBe('required');
    });

    it('should reject invalid ports (out of 1-65535 range)', () => {
      const invalidConfig = {
        PORT: 99999,
      };

      const { error } = environmentValidationSchema.validate(invalidConfig);
      expect(error).toBeDefined();
      expect(error?.message).toContain('PORT');
    });

    it('should reject unsupported USER_VERIFICATION policy', () => {
      const invalidConfig = {
        USER_VERIFICATION: 'invalid_policy',
      };

      const { error } = environmentValidationSchema.validate(invalidConfig);
      expect(error).toBeDefined();
      expect(error?.message).toContain('USER_VERIFICATION');
    });
  });
});
