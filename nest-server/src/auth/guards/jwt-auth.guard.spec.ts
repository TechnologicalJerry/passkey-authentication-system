import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException, ExecutionContext } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import type { TokenService } from '../token.service.js';
import type { SessionsService } from '../../sessions/sessions.service.js';
import type {
  JwtPayload,
  AuthenticatedUser,
} from '../../common/types/index.js';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let mockTokenService: { verifyAccessToken: ReturnType<typeof vi.fn> };
  let mockSessionsService: { validateSession: ReturnType<typeof vi.fn> };

  const validPayload: JwtPayload = {
    sub: 'user-uuid-123',
    email: 'user@example.com',
    sessionId: 'session-uuid-456',
    jti: 'jti-token-uuid-789',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 900,
  };

  const createMockExecutionContext = (
    headers: Record<string, string | undefined>,
  ): ExecutionContext => {
    const request: {
      headers: Record<string, string | undefined>;
      user?: AuthenticatedUser;
    } = {
      headers,
    };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    mockTokenService = {
      verifyAccessToken: vi.fn(),
    };
    mockSessionsService = {
      validateSession: vi.fn(),
    };

    guard = new JwtAuthGuard(
      mockTokenService as unknown as TokenService,
      mockSessionsService as unknown as SessionsService,
    );
  });

  it('should throw UnauthorizedException if Authorization header is missing', async () => {
    const context = createMockExecutionContext({});

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
    await expect(guard.canActivate(context)).rejects.toThrow(
      'Authorization header with Bearer token is required',
    );
    expect(mockTokenService.verifyAccessToken).not.toHaveBeenCalled();
    expect(mockSessionsService.validateSession).not.toHaveBeenCalled();
  });

  it('should throw UnauthorizedException if Authorization header is not a Bearer token', async () => {
    const context = createMockExecutionContext({
      authorization: 'Basic dXNlcjpwYXNz',
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(mockTokenService.verifyAccessToken).not.toHaveBeenCalled();
  });

  it('should throw UnauthorizedException if Bearer token is empty or whitespace only', async () => {
    const context = createMockExecutionContext({
      authorization: 'Bearer ',
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(mockTokenService.verifyAccessToken).not.toHaveBeenCalled();
  });

  it('should throw UnauthorizedException if TokenService rejects token (expired or invalid signature)', async () => {
    const context = createMockExecutionContext({
      authorization: 'Bearer invalid.token.value',
    });

    mockTokenService.verifyAccessToken.mockRejectedValue(
      new UnauthorizedException('Access token is invalid or malformed'),
    );

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(mockTokenService.verifyAccessToken).toHaveBeenCalledWith(
      'invalid.token.value',
    );
    expect(mockSessionsService.validateSession).not.toHaveBeenCalled();
  });

  it('should throw UnauthorizedException if SessionsService reports session is revoked or inactive', async () => {
    const context = createMockExecutionContext({
      authorization: 'Bearer valid.jwt.token',
    });

    mockTokenService.verifyAccessToken.mockResolvedValue(validPayload);
    mockSessionsService.validateSession.mockRejectedValue(
      new UnauthorizedException('Session has been revoked or expired'),
    );

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(mockTokenService.verifyAccessToken).toHaveBeenCalledWith(
      'valid.jwt.token',
    );
    expect(mockSessionsService.validateSession).toHaveBeenCalledWith(
      validPayload.sessionId,
      validPayload.sub,
    );
  });

  it('should return true and attach authenticated user to request when token and session are valid', async () => {
    const request: {
      headers: Record<string, string | undefined>;
      user?: AuthenticatedUser;
    } = {
      headers: {
        authorization: 'Bearer valid.jwt.token',
      },
    };
    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;

    mockTokenService.verifyAccessToken.mockResolvedValue(validPayload);
    mockSessionsService.validateSession.mockResolvedValue({
      id: validPayload.sessionId,
      userId: validPayload.sub,
    });

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(request.user).toEqual({
      id: 'user-uuid-123',
      email: 'user@example.com',
      sessionId: 'session-uuid-456',
      tokenId: 'jti-token-uuid-789',
    });
    expect(mockTokenService.verifyAccessToken).toHaveBeenCalledWith(
      'valid.jwt.token',
    );
    expect(mockSessionsService.validateSession).toHaveBeenCalledWith(
      'session-uuid-456',
      'user-uuid-123',
    );
  });
});
