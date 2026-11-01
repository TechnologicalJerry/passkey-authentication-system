import {
  Injectable,
  Logger,
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  AuthenticatorTransportFuture,
} from '@simplewebauthn/server';
import { UsersService } from '../users/users.service.js';
import { User, UserStatus } from '../users/entities/user.entity.js';
import { PasskeysService } from '../passkeys/passkeys.service.js';
import { PasskeyCredential } from '../passkeys/entities/passkey-credential.entity.js';
import { ChallengeService } from './challenge.service.js';
import { ChallengeCeremony } from './entities/auth-challenge.entity.js';
import { TokenService } from './token.service.js';
import { SessionsService } from '../sessions/sessions.service.js';
import { RegistrationOptionsDto } from './dto/registration-options.dto.js';
import { RegistrationVerifyDto } from './dto/registration-verify.dto.js';
import { AuthenticationOptionsDto } from './dto/authentication-options.dto.js';
import { AuthenticationVerifyDto } from './dto/authentication-verify.dto.js';
import type { AppConfig, AuthSuccessResult } from '../common/types/index.js';

export interface RegistrationOptionsResult {
  challengeId: string;
  options: PublicKeyCredentialCreationOptionsJSON;
}

export interface AuthenticationOptionsResult {
  challengeId: string;
  options: PublicKeyCredentialRequestOptionsJSON;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
    private readonly usersService: UsersService,
    private readonly passkeysService: PasskeysService,
    private readonly challengeService: ChallengeService,
    private readonly sessionsService: SessionsService,
    private readonly tokenService: TokenService,
  ) {}

  private get webauthnConfig(): AppConfig['webauthn'] {
    return this.configService.getOrThrow<AppConfig['webauthn']>('webauthn');
  }

  /**
   * Generates WebAuthn registration options for a new user enrollment.
   *
   * Security Boundary:
   * Rejects unauthenticated attempts to add credentials to existing accounts that already have
   * registered passkeys (preventing unauthenticated passkey injection / account takeover).
   */
  async generateRegistrationOptions(
    dto: RegistrationOptionsDto,
  ): Promise<RegistrationOptionsResult> {
    const normalizedEmail = User.normalizeEmail(dto.email);
    let user = await this.usersService.findByEmail(normalizedEmail);

    if (user) {
      const hasCredentials = await this.passkeysService.hasActiveCredentials(user.id);
      if (hasCredentials) {
        throw new ConflictException(
          'An account with this email address already exists. Please authenticate first to register additional passkeys.',
        );
      }
    } else {
      user = await this.usersService.createPendingUser(normalizedEmail);
    }

    const existingCredentials = await this.passkeysService.findActiveByUserId(user.id);
    const excludeCredentials = existingCredentials.map((c) => ({
      id: c.credentialId,
      transports: (c.transports as AuthenticatorTransportFuture[]) ?? undefined,
    }));

    const options = await generateRegistrationOptions({
      rpName: this.webauthnConfig.rpName,
      rpID: this.webauthnConfig.rpId,
      userID: Buffer.from(user.id),
      userName: user.email,
      userDisplayName: dto.displayName ?? user.email,
      attestationType: 'none',
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: this.webauthnConfig.userVerification,
      },
      supportedAlgorithmIDs: [-7, -257], // ES256 (ECDSA w/ SHA-256), RS256 (RSA w/ SHA-256)
      excludeCredentials,
    });

    const challenge = await this.challengeService.createChallenge({
      challenge: options.challenge,
      ceremonyType: ChallengeCeremony.REGISTRATION,
      userId: user.id,
      ttlMs: this.webauthnConfig.challengeTtlMs,
    });

    return {
      challengeId: challenge.id,
      options,
    };
  }

  /**
   * Cryptographically verifies the authenticator registration attestation response and persists the credential.
   */
  async verifyRegistration(dto: RegistrationVerifyDto): Promise<AuthSuccessResult> {
    return this.dataSource.transaction(async (entityManager) => {
      // 1. Atomically consume the registration challenge
      const challenge = await this.challengeService.consumeChallenge(
        dto.challengeId,
        ChallengeCeremony.REGISTRATION,
        entityManager,
      );

      if (!challenge.userId) {
        throw new BadRequestException('Registration challenge is not bound to a user identity');
      }

      // 2. Validate user identity
      const user = await entityManager
        .getRepository(User)
        .findOne({ where: { id: challenge.userId } });

      if (!user) {
        throw new UnauthorizedException('User associated with registration challenge does not exist');
      }

      if (user.status === UserStatus.SUSPENDED) {
        throw new UnauthorizedException('User account is suspended');
      }

      // 3. Ensure credential ID is unique globally
      const existingCred = await entityManager
        .getRepository(PasskeyCredential)
        .findOne({ where: { credentialId: dto.response.id } });

      if (existingCred) {
        throw new ConflictException('This passkey credential has already been registered');
      }

      // 4. Verify cryptographic attestation response
      const verification = await verifyRegistrationResponse({
        response: dto.response,
        expectedChallenge: challenge.challenge,
        expectedOrigin: this.webauthnConfig.origins,
        expectedRPID: this.webauthnConfig.rpId,
        requireUserVerification: this.webauthnConfig.userVerification === 'required',
      });

      if (!verification.verified || !verification.registrationInfo) {
        throw new BadRequestException('Passkey registration attestation verification failed');
      }

      const {
        credential,
        credentialDeviceType,
        credentialBackedUp,
        aaguid,
      } = verification.registrationInfo;

      // 5. Persist the credential
      await this.passkeysService.createCredential(
        {
          userId: user.id,
          credentialId: credential.id,
          publicKey: Buffer.from(credential.publicKey),
          counter: credential.counter,
          transports: dto.response.response.transports ?? null,
          deviceType: credentialDeviceType,
          backedUp: credentialBackedUp,
          label: dto.label ?? 'Passkey',
          aaguid,
        },
        entityManager.getRepository(PasskeyCredential),
      );

      // 6. Transition pending user to active upon credential registration
      if (user.status === UserStatus.PENDING) {
        user.status = UserStatus.ACTIVE;
        await entityManager.getRepository(User).save(user);
      }

      return {
        verified: true,
        user: {
          id: user.id,
          email: user.email,
          status: user.status,
          emailVerified: !!user.emailVerifiedAt,
          createdAt: user.createdAt.toISOString(),
        },
      };
    });
  }

  /**
   * Generates WebAuthn authentication options supporting discoverable or user-specific ceremonies.
   */
  async generateAuthenticationOptions(
    dto: AuthenticationOptionsDto,
  ): Promise<AuthenticationOptionsResult> {
    let allowCredentials:
      | { id: string; transports?: AuthenticatorTransportFuture[] }[]
      | undefined = undefined;
    let boundUserId: string | null = null;

    if (dto.email) {
      const normalizedEmail = User.normalizeEmail(dto.email);
      const user = await this.usersService.findByEmail(normalizedEmail);

      if (!user) {
        throw new BadRequestException('No credentials found for the specified account');
      }

      const userCredentials = await this.passkeysService.findActiveByUserId(user.id);
      if (userCredentials.length === 0) {
        throw new BadRequestException('No active passkeys registered for this account');
      }

      boundUserId = user.id;
      allowCredentials = userCredentials.map((c) => ({
        id: c.credentialId,
        transports: (c.transports as AuthenticatorTransportFuture[]) ?? undefined,
      }));
    }

    const options = await generateAuthenticationOptions({
      rpID: this.webauthnConfig.rpId,
      allowCredentials,
      userVerification: this.webauthnConfig.userVerification,
    });

    const challenge = await this.challengeService.createChallenge({
      challenge: options.challenge,
      ceremonyType: ChallengeCeremony.AUTHENTICATION,
      userId: boundUserId,
      ttlMs: this.webauthnConfig.challengeTtlMs,
    });

    return {
      challengeId: challenge.id,
      options,
    };
  }

  /**
   * Cryptographically verifies the authenticator assertion signature, updates usage metadata,
   * creates an authenticated session, and issues access and refresh tokens.
   */
  async verifyAuthentication(
    dto: AuthenticationVerifyDto,
    metadata?: { ipAddress?: string | null; userAgent?: string | null },
  ): Promise<AuthSuccessResult> {
    return this.dataSource.transaction(async (entityManager) => {
      // 1. Atomically consume the authentication challenge
      const challenge = await this.challengeService.consumeChallenge(
        dto.challengeId,
        ChallengeCeremony.AUTHENTICATION,
        entityManager,
      );

      // 2. Locate the credential presented by the client
      const credential = await entityManager.getRepository(PasskeyCredential).findOne({
        where: { credentialId: dto.response.id },
        relations: ['user'],
      });

      if (!credential || credential.revokedAt !== null) {
        throw new UnauthorizedException('Passkey credential not recognized or has been revoked');
      }

      // 3. Verify user binding if options were bound to a specific user
      if (challenge.userId && challenge.userId !== credential.userId) {
        throw new UnauthorizedException('Presented passkey does not belong to the requested account');
      }

      const user = credential.user;
      if (!user || user.status === UserStatus.SUSPENDED) {
        throw new UnauthorizedException('User account is suspended or inactive');
      }

      // 4. Verify assertion signature via SimpleWebAuthn
      const verification = await verifyAuthenticationResponse({
        response: dto.response,
        expectedChallenge: challenge.challenge,
        expectedOrigin: this.webauthnConfig.origins,
        expectedRPID: this.webauthnConfig.rpId,
        credential: {
          id: credential.credentialId,
          publicKey: new Uint8Array(credential.publicKey),
          counter: Number(credential.counter),
          transports: (credential.transports as AuthenticatorTransportFuture[]) ?? undefined,
        },
        requireUserVerification: this.webauthnConfig.userVerification === 'required',
      });

      if (!verification.verified || !verification.authenticationInfo) {
        throw new UnauthorizedException('Passkey authentication verification failed');
      }

      // 5. Update signature counter and last-used timestamp
      await this.passkeysService.updateCounterAndLastUsed(
        credential.credentialId,
        verification.authenticationInfo.newCounter,
        entityManager.getRepository(PasskeyCredential),
      );

      // 6. Stage 3: Atomically create authenticated session and enforce active session limits
      const { session, rawRefreshToken } = await this.sessionsService.createSession({
        userId: user.id,
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent,
        entityManager,
      });

      // 7. Stage 3: Generate short-lived JWT access token
      const accessTokenResult = await this.tokenService.generateAccessToken({
        userId: user.id,
        email: user.email,
        sessionId: session.id,
      });

      return {
        verified: true,
        user: {
          id: user.id,
          email: user.email,
          status: user.status,
          emailVerified: !!user.emailVerifiedAt,
          createdAt: user.createdAt.toISOString(),
        },
        tokens: {
          accessToken: accessTokenResult.token,
          refreshToken: rawRefreshToken,
          expiresIn: accessTokenResult.expiresIn,
          tokenType: 'Bearer',
        },
      };
    });
  }
}
