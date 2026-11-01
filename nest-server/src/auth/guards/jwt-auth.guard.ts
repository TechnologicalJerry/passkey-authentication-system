import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { TokenService } from '../token.service.js';
import { SessionsService } from '../../sessions/sessions.service.js';
import type { AuthenticatedUser } from '../../common/types/index.js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly tokenService: TokenService,
    private readonly sessionsService: SessionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Authorization header with Bearer token is required');
    }

    // 1. Verify cryptographic JWT signature, claims, issuer, and audience
    const payload = await this.tokenService.verifyAccessToken(token);

    // 2. Validate session in real-time (detects immediate logout and revocation)
    await this.sessionsService.validateSession(payload.sessionId, payload.sub);

    // 3. Attach typed user identity to request context
    const authenticatedUser: AuthenticatedUser = {
      id: payload.sub,
      email: payload.email,
      sessionId: payload.sessionId,
      tokenId: payload.jti,
    };

    (request as Request & { user: AuthenticatedUser }).user = authenticatedUser;

    return true;
  }

  private extractTokenFromHeader(request: Request): string | null {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      return null;
    }

    const [type, token] = authHeader.split(' ');
    if (type !== 'Bearer' || !token) {
      return null;
    }

    return token.trim();
  }
}

