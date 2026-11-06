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
      delete process.env.DATABASE_NAME;
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
      delete process.env.JWT_ACCESS_SECRET;
      delete process.env.JWT_ACCESS_TTL;
      delete process.env.JWT_ISSUER;
      delete process.env.JWT_AUDIENCE;
      delete process.env.REFRESH_TOKEN_TTL_DAYS;
      delete process.env.REFRESH_TOKEN_SECRET;
      delete process.env.MAX_ACTIVE_SESSIONS_PER_USER;
      delete process.env.COOKIE_NAME;
      delete process.env.COOKIE_SECURE;
      delete process.env.COOKIE_SAME_SITE;
      delete process.env.ENROLLMENT_INVITATION_REQUIRED;
      delete process.env.TRUST_PROXY;

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
      expect(config.swagger.enabled).toBe(true);
      expect(config.webauthn.rpName).toBe('Passkey Authentication System');
      expect(config.webauthn.rpId).toBe('localhost');
      expect(config.webauthn.origins).toEqual(['http://localhost:3000']);
      expect(config.webauthn.challengeTtlMs).toBe(60000);
      expect(config.webauthn.userVerification).toBe('preferred');

      // Stage 3: JWT Defaults
      expect(config.jwt.accessSecret).toBe(
        'dev-jwt-access-secret-min-32-chars-key!',
      );
      expect(config.jwt.accessTtl).toBe('15m');
      expect(config.jwt.issuer).toBe('passkey-auth-api');
      expect(config.jwt.audience).toBe('passkey-auth-app');

      // Stage 3: Session Defaults
      expect(config.session.refreshTokenTtlDays).toBe(7);
      expect(config.session.refreshTokenSecret).toBe(
        'dev-refresh-token-hmac-salt-32-chars!',
      );
      expect(config.session.maxActiveSessions).toBe(5);
      expect(config.session.cookieName).toBe('refresh_token');
      expect(config.session.cookieSecure).toBe(false);
      expect(config.session.cookieSameSite).toBe('lax');

      // Stage 4: Enrollment & Security Defaults
      expect(config.enrollment.invitationRequired).toBe(false);
      expect(config.security.trustProxy).toBe(true);
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

    it('should default cookieSecure to true in production if not explicitly set', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.COOKIE_SECURE;

      const config = configuration();
      expect(config.session.cookieSecure).toBe(true);
    });

    it('should parse comma-separated CORS and WebAuthn origins and trim whitespace', () => {
      process.env.CORS_ORIGINS =
        ' https://app.example.com , https://admin.example.com ';
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
    it('should validate valid environment configuration including Stage 4 settings', () => {
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
        JWT_ACCESS_SECRET:
          'super-secure-production-jwt-access-secret-32-chars!',
        JWT_ACCESS_TTL: '10m',
        JWT_ISSUER: 'auth.production.com',
        JWT_AUDIENCE: 'app.production.com',
        REFRESH_TOKEN_TTL_DAYS: 14,
        REFRESH_TOKEN_SECRET:
          'super-secure-production-refresh-secret-32-chars!',
        MAX_ACTIVE_SESSIONS_PER_USER: 3,
        COOKIE_NAME: 'secure_refresh_token',
        COOKIE_SECURE: true,
        COOKIE_SAME_SITE: 'strict',
        ENROLLMENT_INVITATION_REQUIRED: true,
        TRUST_PROXY: true,
      };

      const { error, value } =
        environmentValidationSchema.validate(validConfig);
      expect(error).toBeUndefined();
      expect(value.PORT).toBe(8080);
      expect(value.NODE_ENV).toBe('production');
      expect(value.ENROLLMENT_INVITATION_REQUIRED).toBe(true);
      expect(value.TRUST_PROXY).toBe(true);
    });

    it('should reject invalid ports (out of 1-65535 range)', () => {
      const invalidConfig = {
        PORT: 99999,
      };

      const { error } = environmentValidationSchema.validate(invalidConfig);
      expect(error).toBeDefined();
      expect(error?.message).toContain('PORT');
    });

    it('should reject JWT_ACCESS_SECRET shorter than 32 characters', () => {
      const invalidConfig = {
        JWT_ACCESS_SECRET: 'too-short-secret',
      };

      const { error } = environmentValidationSchema.validate(invalidConfig);
      expect(error).toBeDefined();
      expect(error?.message).toContain('JWT_ACCESS_SECRET');
    });
  });
});
