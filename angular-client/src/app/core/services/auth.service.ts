import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, firstValueFrom } from 'rxjs';
import {
  startAuthentication,
  startRegistration,
  browserSupportsWebAuthn,
  browserSupportsWebAuthnAutofill,
} from '@simplewebauthn/browser';
import { environment } from '../../../environments/environment';
import type {
  AuthSuccessResult,
  AuthenticationOptionsDto,
  AuthenticationOptionsResult,
  AuthenticationVerifyDto,
  RegistrationOptionsDto,
  RegistrationOptionsResult,
  RegistrationVerifyDto,
  UserSummary,
} from '../models/auth.models';
import type { RotateTokenResult } from '../models/session.models';
import type { SuccessMessageResponse } from '../models/api-response.models';

const ACCESS_TOKEN_KEY = 'passkey_access_token';
const USER_KEY = 'passkey_user';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly baseUrl = environment.apiUrl;

  readonly currentUser = signal<UserSummary | null>(null);
  readonly accessToken = signal<string | null>(null);
  readonly isLoading = signal<boolean>(false);

  readonly isAuthenticated = computed(() => !!this.accessToken() && !!this.currentUser());

  constructor() {
    if (this.isBrowser) {
      this.restoreSessionFromStorage();
    }
  }

  isWebAuthnSupported(): boolean {
    if (!this.isBrowser) return false;
    return browserSupportsWebAuthn();
  }

  async isAutofillSupported(): Promise<boolean> {
    if (!this.isBrowser) return false;
    return browserSupportsWebAuthnAutofill();
  }

  private restoreSessionFromStorage(): void {
    try {
      const storedToken = localStorage.getItem(ACCESS_TOKEN_KEY);
      const storedUser = localStorage.getItem(USER_KEY);
      if (storedToken && storedUser) {
        this.accessToken.set(storedToken);
        this.currentUser.set(JSON.parse(storedUser) as UserSummary);
      }
    } catch {
      this.clearSession();
    }
  }

  setSession(token: string, user: UserSummary): void {
    this.accessToken.set(token);
    this.currentUser.set(user);
    if (this.isBrowser) {
      try {
        localStorage.setItem(ACCESS_TOKEN_KEY, token);
        localStorage.setItem(USER_KEY, JSON.stringify(user));
      } catch {
        // Storage might be restricted or full
      }
    }
  }

  clearSession(): void {
    this.accessToken.set(null);
    this.currentUser.set(null);
    if (this.isBrowser) {
      try {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      } catch {
        // Ignored
      }
    }
  }

  // --- Registration Ceremony ---
  getRegistrationOptions(dto: RegistrationOptionsDto): Observable<RegistrationOptionsResult> {
    return this.http.post<RegistrationOptionsResult>(
      `${this.baseUrl}/auth/passkeys/registration/options`,
      dto,
      { withCredentials: true },
    );
  }

  verifyRegistration(dto: RegistrationVerifyDto): Observable<AuthSuccessResult> {
    return this.http.post<AuthSuccessResult>(
      `${this.baseUrl}/auth/passkeys/registration/verify`,
      dto,
      { withCredentials: true },
    );
  }

  async registerWithPasskey(params: {
    email: string;
    displayName?: string;
    label?: string;
    invitationToken?: string;
  }): Promise<AuthSuccessResult> {
    if (!this.isWebAuthnSupported()) {
      throw new Error('WebAuthn / Passkeys are not supported by this browser or environment.');
    }

    this.isLoading.set(true);
    try {
      // 1. Get creation options from server
      const optionsRes = await firstValueFrom(
        this.getRegistrationOptions({
          email: params.email,
          displayName: params.displayName,
          invitationToken: params.invitationToken,
        }),
      );

      // 2. Prompt browser authenticator (Touch ID, Windows Hello, YubiKey, etc.)
      const attestationResponse = await startRegistration({
        optionsJSON: optionsRes.options,
      });

      // 3. Send attestation to server for cryptographic verification
      const verifyRes = await firstValueFrom(
        this.verifyRegistration({
          challengeId: optionsRes.challengeId,
          response: attestationResponse,
          label: params.label,
        }),
      );

      if (verifyRes.tokens?.accessToken) {
        this.setSession(verifyRes.tokens.accessToken, verifyRes.user);
      }

      return verifyRes;
    } finally {
      this.isLoading.set(false);
    }
  }

  // --- Authentication Ceremony ---
  getAuthenticationOptions(
    dto: AuthenticationOptionsDto = {},
  ): Observable<AuthenticationOptionsResult> {
    return this.http.post<AuthenticationOptionsResult>(
      `${this.baseUrl}/auth/passkeys/authentication/options`,
      dto,
      { withCredentials: true },
    );
  }

  verifyAuthentication(dto: AuthenticationVerifyDto): Observable<AuthSuccessResult> {
    return this.http.post<AuthSuccessResult>(
      `${this.baseUrl}/auth/passkeys/authentication/verify`,
      dto,
      { withCredentials: true },
    );
  }

  async loginWithPasskey(email?: string): Promise<AuthSuccessResult> {
    if (!this.isWebAuthnSupported()) {
      throw new Error('WebAuthn / Passkeys are not supported by this browser or device.');
    }

    this.isLoading.set(true);
    try {
      // 1. Get assertion options from server (discoverable if no email)
      const optionsRes = await firstValueFrom(
        this.getAuthenticationOptions(email ? { email } : {}),
      );

      // 2. Prompt authenticator for assertion signature
      const assertionResponse = await startAuthentication({
        optionsJSON: optionsRes.options,
      });

      // 3. Verify assertion signature on server and receive tokens
      const verifyRes = await firstValueFrom(
        this.verifyAuthentication({
          challengeId: optionsRes.challengeId,
          response: assertionResponse,
        }),
      );

      if (verifyRes.tokens?.accessToken) {
        this.setSession(verifyRes.tokens.accessToken, verifyRes.user);
      }

      return verifyRes;
    } finally {
      this.isLoading.set(false);
    }
  }

  // --- Token Refresh ---
  refreshToken(): Observable<RotateTokenResult> {
    return this.http.post<RotateTokenResult>(
      `${this.baseUrl}/auth/token/refresh`,
      {},
      { withCredentials: true },
    );
  }

  // --- Logout ---
  async logout(): Promise<void> {
    this.isLoading.set(true);
    try {
      if (this.accessToken()) {
        await firstValueFrom(
          this.http.post<SuccessMessageResponse>(
            `${this.baseUrl}/auth/logout`,
            {},
            { withCredentials: true },
          ),
        );
      }
    } catch {
      // Proceed with local logout regardless of network response
    } finally {
      this.clearSession();
      this.isLoading.set(false);
      this.router.navigate(['/auth/login']);
    }
  }

  async logoutAll(): Promise<void> {
    this.isLoading.set(true);
    try {
      if (this.accessToken()) {
        await firstValueFrom(
          this.http.post<SuccessMessageResponse>(
            `${this.baseUrl}/auth/logout/all`,
            {},
            { withCredentials: true },
          ),
        );
      }
    } catch {
      // Proceed with local logout regardless of network response
    } finally {
      this.clearSession();
      this.isLoading.set(false);
      this.router.navigate(['/auth/login']);
    }
  }
}
