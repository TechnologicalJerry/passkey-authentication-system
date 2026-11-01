import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import type { AppConfig, JwtPayload, TokenPair } from '../common/types/index.js';

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private get jwtConfig(): AppConfig['jwt'] {
    return this.configService.getOrThrow<AppConfig['jwt']>('jwt');
  }

  private get sessionConfig(): AppConfig['session'] {
    return this.configService.getOrThrow<AppConfig['session']>('session');
  }

  /**
   * Generates a short-lived signed JWT access token.
   */
  async generateAccessToken(params: {
    userId: string;
    email: string;
    sessionId: string;
  }): Promise<{ token: string; expiresIn: number }> {
    const jti = randomUUID();
    const payload: JwtPayload = {
      sub: params.userId,
      email: params.email,
      sessionId: params.sessionId,
      jti,
    };

    const expiresInSeconds = this.parseTtlToSeconds(this.jwtConfig.accessTtl);

    const token = await this.jwtService.signAsync(payload, {
      secret: this.jwtConfig.accessSecret,
      expiresIn: this.jwtConfig.accessTtl as any,
      issuer: this.jwtConfig.issuer,
      audience: this.jwtConfig.audience,
      algorithm: 'HS256',
    });

    return {
      token,
      expiresIn: expiresInSeconds,
    };
  }

  /**
   * Generates a high-entropy cryptographically secure opaque refresh token.
   * Returns a 256-bit URL-safe random string.
   */
  generateRefreshToken(): string {
    return randomBytes(32).toString('base64url');
  }

  /**
   * Computes a cryptographic HMAC-SHA256 hash of a refresh token.
   * Raw refresh tokens are never persisted to the database.
   */
  hashRefreshToken(rawToken: string): string {
    return createHmac('sha256', this.sessionConfig.refreshTokenSecret)
      .update(rawToken)
      .digest('hex');
  }

  /**
   * Compares two token hashes using a constant-time algorithm to prevent timing attacks.
   */
  compareTokenHashes(hashA: string, hashB: string): boolean {
    if (hashA.length !== hashB.length) {
      return false;
    }
    return timingSafeEqual(Buffer.from(hashA, 'hex'), Buffer.from(hashB, 'hex'));
  }

  /**
   * Verifies an incoming access token's signature, algorithm, issuer, and audience.
   */
  async verifyAccessToken(token: string): Promise<JwtPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.jwtConfig.accessSecret,
        issuer: this.jwtConfig.issuer,
        audience: this.jwtConfig.audience,
        algorithms: ['HS256'], // Explicit allowlist prevents algorithm-confusion attacks
      });

      if (!payload.sub || !payload.sessionId || !payload.jti) {
        throw new UnauthorizedException('Access token missing required security claims');
      }

      return payload;
    } catch (error: unknown) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.debug(
        `Access token verification failed: ${error instanceof Error ? error.message : 'Invalid token'}`,
      );
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }

  /**
   * Helper to parse a time span string (e.g. '15m', '1h', '7d') to seconds.
   */
  private parseTtlToSeconds(ttl: string): number {
    const match = ttl.match(/^([0-9]+)([smhd])$/);
    if (!match || !match[1] || !match[2]) {
      return 900; // default 15 minutes
    }
    const value = parseInt(match[1], 10);
    const unit = match[2];
    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 3600;
      case 'd':
        return value * 86400;
      default:
        return 900;
    }
  }
}

