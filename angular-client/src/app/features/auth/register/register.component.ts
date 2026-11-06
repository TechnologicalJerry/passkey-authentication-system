import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-register',
  imports: [RouterLink, FormsModule],
  template: `
    <div
      class="flex min-h-[calc(100vh-4.5rem)] items-center justify-center px-4 py-12 sm:px-6 lg:px-8"
    >
      <div
        class="w-full max-w-lg space-y-8 rounded-3xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl backdrop-blur-xl sm:p-10"
      >
        <!-- Header -->
        <div class="text-center">
          <div
            class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 shadow-lg shadow-indigo-500/25"
          >
            <svg
              class="h-7 w-7 text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
              />
            </svg>
          </div>
          <h2 class="mt-5 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Create Your Account
          </h2>
          <p class="mt-2 text-sm text-slate-400">
            Never create, remember, or lose another password. Your passkey is bound securely to your
            hardware.
          </p>
        </div>

        @if (!authService.isWebAuthnSupported()) {
          <div
            class="rounded-xl border border-rose-500/30 bg-rose-950/30 p-4 text-sm text-rose-300"
            role="alert"
          >
            <p class="font-semibold">WebAuthn not supported</p>
            <p class="mt-1 text-xs">Your current browser does not support passkey creation.</p>
          </div>
        }

        <!-- Registration Form -->
        <form (ngSubmit)="onSubmit()" class="space-y-5">
          <div>
            <label for="email" class="block text-xs font-medium text-slate-300">
              Email Address <span class="text-rose-400">*</span>
            </label>
            <div class="mt-1.5">
              <input
                id="email"
                name="email"
                type="email"
                autocomplete="username"
                [(ngModel)]="email"
                placeholder="name@example.com"
                required
                class="block w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label for="displayName" class="block text-xs font-medium text-slate-300">
              Full Name or Nickname <span class="text-slate-500">(Optional)</span>
            </label>
            <div class="mt-1.5">
              <input
                id="displayName"
                name="displayName"
                type="text"
                autocomplete="name"
                [(ngModel)]="displayName"
                placeholder="Alex Morgan"
                class="block w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label for="label" class="block text-xs font-medium text-slate-300">
              Passkey Label
              <span class="text-slate-500">(e.g. MacBook Touch ID, Work YubiKey)</span>
            </label>
            <div class="mt-1.5">
              <input
                id="label"
                name="label"
                type="text"
                [(ngModel)]="label"
                placeholder="Primary Authenticator"
                class="block w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label for="invitationToken" class="block text-xs font-medium text-slate-300">
              Invitation Token
              <span class="text-slate-500">(Optional, if required by administrator)</span>
            </label>
            <div class="mt-1.5">
              <input
                id="invitationToken"
                name="invitationToken"
                type="text"
                [(ngModel)]="invitationToken"
                placeholder="inv_..."
                class="block w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <button
            type="submit"
            [disabled]="
              authService.isLoading() || !email.trim() || !authService.isWebAuthnSupported()
            "
            class="group relative flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 transition-all hover:from-indigo-500 hover:to-violet-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            @if (authService.isLoading()) {
              <svg class="h-5 w-5 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                ></circle>
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <span>Creating hardware passkey...</span>
            } @else {
              <svg
                class="h-5 w-5 transition-transform group-hover:scale-110"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>Register with Device Passkey</span>
            }
          </button>
        </form>

        <!-- Security Guarantee notice -->
        <div class="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
          <div class="flex items-start gap-3">
            <svg class="h-5 w-5 shrink-0 text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
              <path
                fill-rule="evenodd"
                d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z"
                clip-rule="evenodd"
              />
            </svg>
            <div class="text-xs text-slate-400">
              <span class="font-semibold text-slate-200">End-to-End Cryptography:</span>
              Your biometric data (fingerprint or face) never leaves your device chip. The server
              only receives cryptographic signatures verified via public key cryptography.
            </div>
          </div>
        </div>

        <!-- Footer link -->
        <p class="text-center text-xs text-slate-400">
          Already registered?
          <a
            routerLink="/auth/login"
            class="font-medium text-indigo-400 transition hover:text-indigo-300"
          >
            Sign in to your account
          </a>
        </p>
      </div>
    </div>
  `,
})
export class RegisterComponent {
  readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);

  email = '';
  displayName = '';
  label = '';
  invitationToken = '';

  async onSubmit(): Promise<void> {
    if (!this.email.trim()) {
      this.notificationService.showError('Please enter a valid email address');
      return;
    }

    try {
      const res = await this.authService.registerWithPasskey({
        email: this.email.trim(),
        displayName: this.displayName.trim() || undefined,
        label: this.label.trim() || undefined,
        invitationToken: this.invitationToken.trim() || undefined,
      });

      this.notificationService.showSuccess(
        `Account created successfully! Welcome, ${res.user.displayName || res.user.email}.`,
      );
      this.router.navigate(['/dashboard']);
    } catch (err) {
      this.notificationService.showError(err, 'Registration Failed');
    }
  }
}
