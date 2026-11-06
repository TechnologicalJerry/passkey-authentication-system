import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import { startRegistration } from '@simplewebauthn/browser';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import type { PasskeySummary, RenamePasskeyDto } from '../models/passkey.models';
import type { AuthSuccessResult, RegistrationOptionsResult } from '../models/auth.models';
import type { SuccessMessageResponse } from '../models/api-response.models';

@Injectable({
  providedIn: 'root',
})
export class PasskeyService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly baseUrl = `${environment.apiUrl}/passkeys`;

  listPasskeys(): Observable<PasskeySummary[]> {
    return this.http.get<PasskeySummary[]>(this.baseUrl, {
      withCredentials: true,
    });
  }

  renamePasskey(id: string, label: string): Observable<PasskeySummary> {
    const payload: RenamePasskeyDto = { label };
    return this.http.patch<PasskeySummary>(`${this.baseUrl}/${id}`, payload, {
      withCredentials: true,
    });
  }

  revokePasskey(id: string): Observable<SuccessMessageResponse> {
    return this.http.delete<SuccessMessageResponse>(`${this.baseUrl}/${id}`, {
      withCredentials: true,
    });
  }

  getAddPasskeyOptions(): Observable<RegistrationOptionsResult> {
    return this.http.post<RegistrationOptionsResult>(
      `${this.baseUrl}/registration/options`,
      {},
      { withCredentials: true },
    );
  }

  async registerAdditionalPasskey(label?: string): Promise<AuthSuccessResult> {
    if (!this.authService.isWebAuthnSupported()) {
      throw new Error('Passkeys are not supported on this browser or platform.');
    }

    // 1. Request authenticated registration options
    const optionsRes = await firstValueFrom(this.getAddPasskeyOptions());

    // 2. Invoke browser creation ceremony
    const attestation = await startRegistration({
      optionsJSON: optionsRes.options,
    });

    // 3. Verify and bind new credential to active account
    return await firstValueFrom(
      this.authService.verifyRegistration({
        challengeId: optionsRes.challengeId,
        response: attestation,
        label,
      }),
    );
  }
}
