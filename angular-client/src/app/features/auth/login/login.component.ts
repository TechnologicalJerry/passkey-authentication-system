import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-login',
  imports: [RouterLink, FormsModule],
  template: `
    <div
      class="flex min-h-[calc(100vh-4.5rem)] items-center justify-center px-4 py-12 sm:px-6 lg:px-8"
    >
      <div
        class="w-full max-w-md space-y-8 rounded-3xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl backdrop-blur-xl sm:p-10"
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
                d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z"
              />
            </svg>
          </div>
          <h2 class="mt-5 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Sign in with Passkey
          </h2>
          <p class="mt-2 text-sm text-slate-400">
            Secure, passwordless authentication backed by Touch ID, Windows Hello, Face ID, or
            Security Keys.
          </p>
        </div>

        @if (!isWebAuthnSupported()) {
          <div
            class="rounded-xl border border-amber-500/30 bg-amber-950/30 p-4 text-sm text-amber-300"
            role="alert"
          >
            <p class="font-semibold">WebAuthn not supported</p>
            <p class="mt-1 text-xs">
              Your current browser or device does not support WebAuthn / Passkeys.
            </p>
          </div>
        }

        <!-- Primary Action: 1-Click Discoverable Login -->
        <div class="space-y-4">
          <button
            type="button"
            (click)="onDiscoverableLogin()"
            [disabled]="authService.isLoading() || !isWebAuthnSupported()"
            class="group relative flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 transition-all hover:from-indigo-500 hover:to-violet-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            @if (authService.isLoading() && !isEmailLogin()) {
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
              <span>Verifying biometric...</span>
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
                  d="M7.864 4.243A7.5 7.5 0 0119.5 10.5c0 2.92-.556 5.709-1.568 8.268M5.742 6.364A7.465 7.465 0 004.5 10.5a7.464 7.464 0 01-1.15 3.993m1.989 3.559A11.209 11.209 0 008.25 10.5a3.75 3.75 0 117.5 0c0 .527-.021 1.049-.064 1.565M12 10.5a14.94 14.94 0 01-3.6 9.75m6.633-4.596a18.666 18.666 0 01-2.485 5.346"
                />
              </svg>
              <span>Sign in with Device Passkey</span>
            }
          </button>

          <!-- Divider -->
          <div class="relative flex items-center justify-center">
            <div class="w-full border-t border-slate-800"></div>
            <span class="bg-slate-900 px-3 text-xs uppercase tracking-wider text-slate-500">
              or enter account email
            </span>
          </div>

          <!-- Targeted Login Form -->
          <form (ngSubmit)="onEmailLogin()" class="space-y-4">
            <div>
              <label for="email" class="block text-xs font-medium text-slate-300">
                Email Address
              </label>
              <div class="mt-1.5">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autocomplete="username webauthn"
                  [(ngModel)]="email"
                  placeholder="name@example.com"
                  required
                  class="block w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <button
              type="submit"
              [disabled]="authService.isLoading() || !email.trim()"
              class="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-slate-600 hover:bg-slate-750 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              @if (authService.isLoading() && isEmailLogin()) {
                <svg class="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
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
                <span>Authenticating...</span>
              } @else {
                <span>Continue with Email</span>
              }
            </button>
          </form>
        </div>

        <!-- Footer link -->
        <p class="text-center text-xs text-slate-400">
          Don't have an account yet?
          <a
            routerLink="/auth/register"
            class="font-medium text-indigo-400 transition hover:text-indigo-300"
          >
            Create an account
          </a>
        </p>
      </div>
    </div>
  `,
})
export class LoginComponent {
  readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);

  email = '';
  readonly isEmailLogin = signal<boolean>(false);

  isWebAuthnSupported(): boolean {
    return this.authService.isWebAuthnSupported();
  }

  async onDiscoverableLogin(): Promise<void> {
    this.isEmailLogin.set(false);
    try {
      const res = await this.authService.loginWithPasskey();
      this.notificationService.showSuccess(
        `Welcome back, ${res.user.displayName || res.user.email}!`,
      );
      this.router.navigate(['/dashboard']);
    } catch (err) {
      this.notificationService.showError(err, 'Sign In Failed');
    }
  }

  async onEmailLogin(): Promise<void> {
    if (!this.email.trim()) return;
    this.isEmailLogin.set(true);
    try {
      const res = await this.authService.loginWithPasskey(this.email.trim());
      this.notificationService.showSuccess(
        `Welcome back, ${res.user.displayName || res.user.email}!`,
      );
      this.router.navigate(['/dashboard']);
    } catch (err) {
      this.notificationService.showError(err, 'Sign In Failed');
    }
  }
}
