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

    it('should parse comma-separated CORS origins and trim whitespace', () => {
      process.env.CORS_ORIGINS = ' https://app.example.com , https://admin.example.com ';

      const config = configuration();
      expect(config.cors.origins).toEqual([
        'https://app.example.com',
        'https://admin.example.com',
      ]);
    });
  });

  describe('environmentValidationSchema (Joi)', () => {
    it('should validate valid environment configuration', () => {
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
      };

      const { error, value } = environmentValidationSchema.validate(validConfig);
      expect(error).toBeUndefined();
      expect(value.PORT).toBe(8080);
      expect(value.NODE_ENV).toBe('production');
      expect(value.DATABASE_SSL).toBe(true);
    });

    it('should reject invalid ports (out of 1-65535 range)', () => {
      const invalidConfig = {
        PORT: 99999,
      };

      const { error } = environmentValidationSchema.validate(invalidConfig);
      expect(error).toBeDefined();
      expect(error?.message).toContain('PORT');
    });

    it('should reject unsupported NODE_ENV values', () => {
      const invalidConfig = {
        NODE_ENV: 'staging_unsupported',
      };

      const { error } = environmentValidationSchema.validate(invalidConfig);
      expect(error).toBeDefined();
      expect(error?.message).toContain('NODE_ENV');
    });

    it('should reject unsupported LOG_LEVEL values', () => {
      const invalidConfig = {
        LOG_LEVEL: 'verbose_invalid',
      };

      const { error } = environmentValidationSchema.validate(invalidConfig);
      expect(error).toBeDefined();
      expect(error?.message).toContain('LOG_LEVEL');
    });
  });
});

