import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { PasskeyService } from '../../core/services/passkey.service';
import { NotificationService } from '../../core/services/notification.service';
import type { UserProfile } from '../../core/models/user.models';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, DatePipe],
  template: `
    <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <!-- Welcome Hero Banner -->
      <div
        class="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 p-6 shadow-2xl sm:p-10"
      >
        <div class="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div>
            <div
              class="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-400"
            >
              <span class="h-2 w-2 rounded-full bg-emerald-400"></span>
              Passwordless Protected
            </div>
            <h1 class="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Hello, {{ profile()?.displayName || profile()?.email || 'User' }}
            </h1>
            <p class="mt-2 text-sm text-slate-400">
              Your account is cryptographically fortified with FIDO2 WebAuthn passkeys.
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-3">
            <button
              type="button"
              (click)="onAddPasskey()"
              [disabled]="isAddingPasskey()"
              class="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-500 disabled:opacity-50"
            >
              @if (isAddingPasskey()) {
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
                <span>Enrolling key...</span>
              } @else {
                <svg
                  class="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                <span>Add Backup Passkey</span>
              }
            </button>
            <a
              routerLink="/passkeys"
              class="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-700 hover:text-white"
            >
              Manage Keys
            </a>
          </div>
        </div>
      </div>

      <!-- Safeguard Warning Alert if only 1 Passkey enrolled -->
      @if (profile() && profile()!.passkeyCount === 1) {
        <div
          class="mt-6 flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4 text-amber-200"
        >
          <svg
            class="h-5 w-5 shrink-0 text-amber-400 mt-0.5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fill-rule="evenodd"
              d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
              clip-rule="evenodd"
            />
          </svg>
          <div class="text-sm">
            <p class="font-semibold text-amber-300">
              Security Recommendation: Enroll a second passkey
            </p>
            <p class="mt-0.5 text-xs text-amber-200/80">
              You currently have only 1 registered passkey. To prevent accidental lockout if your
              primary device is lost or reset, we recommend registering a secondary key (such as an
              iPhone, Windows laptop, or hardware YubiKey).
            </p>
          </div>
        </div>
      }

      <!-- Metric Grid -->
      <div class="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <!-- Passkeys Count Card -->
        <div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-sm">
          <div class="flex items-center justify-between">
            <p class="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Enrolled Passkeys
            </p>
            <div
              class="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400"
            >
              <svg
                class="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
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
          </div>
          <p class="mt-3 text-3xl font-bold text-white">{{ profile()?.passkeyCount ?? 0 }}</p>
          <p class="mt-1 text-xs text-slate-400">Cryptographic hardware keys</p>
        </div>

        <!-- Active Sessions Card -->
        <div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-sm">
          <div class="flex items-center justify-between">
            <p class="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Active Sessions
            </p>
            <div
              class="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400"
            >
              <svg
                class="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0H3"
                />
              </svg>
            </div>
          </div>
          <p class="mt-3 text-3xl font-bold text-white">{{ profile()?.activeSessionCount ?? 0 }}</p>
          <p class="mt-1 text-xs text-slate-400">Devices currently authenticated</p>
        </div>

        <!-- Account Status Card -->
        <div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-sm">
          <div class="flex items-center justify-between">
            <p class="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Account Status
            </p>
            <div
              class="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400"
            >
              <svg
                class="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
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
          </div>
          <p class="mt-3 flex items-center gap-2">
            <span
              class="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400"
            >
              <span class="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
              {{ profile()?.status ?? 'ACTIVE' }}
            </span>
          </p>
          <p class="mt-1 text-xs text-slate-400">Verified passwordless identity</p>
        </div>

        <!-- Member Since Card -->
        <div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-sm">
          <div class="flex items-center justify-between">
            <p class="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Member Since
            </p>
            <div
              class="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400"
            >
              <svg
                class="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
                />
              </svg>
            </div>
          </div>
          <p class="mt-3 text-lg font-bold text-white">
            {{ profile()?.createdAt | date: 'mediumDate' }}
          </p>
          <p class="mt-1 text-xs text-slate-400">Enrollment date</p>
        </div>
      </div>

      <!-- Quick Navigation Grid -->
      <div class="mt-10">
        <h2 class="text-lg font-bold text-white">Security & Management Hub</h2>
        <div class="mt-4 grid grid-cols-1 gap-5 md:grid-cols-3">
          <a
            routerLink="/passkeys"
            class="group rounded-2xl border border-slate-800 bg-slate-900/60 p-6 transition hover:border-indigo-500/50 hover:bg-slate-850"
          >
            <div
              class="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600/10 text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition"
            >
              <svg
                class="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
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
            <h3 class="mt-4 text-base font-semibold text-white">Passkey Manager</h3>
            <p class="mt-1 text-xs text-slate-400">
              View, rename, or revoke your hardware credentials and register new devices.
            </p>
          </a>

          <a
            routerLink="/sessions"
            class="group rounded-2xl border border-slate-800 bg-slate-900/60 p-6 transition hover:border-emerald-500/50 hover:bg-slate-850"
          >
            <div
              class="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600/10 text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition"
            >
              <svg
                class="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0H3"
                />
              </svg>
            </div>
            <h3 class="mt-4 text-base font-semibold text-white">Active Sessions</h3>
            <p class="mt-1 text-xs text-slate-400">
              Monitor browsers, devices, IP locations, and remotely revoke untrusted logins.
            </p>
          </a>

          <a
            routerLink="/audit-logs"
            class="group rounded-2xl border border-slate-800 bg-slate-900/60 p-6 transition hover:border-sky-500/50 hover:bg-slate-850"
          >
            <div
              class="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-600/10 text-sky-400 group-hover:bg-sky-600 group-hover:text-white transition"
            >
              <svg
                class="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 class="mt-4 text-base font-semibold text-white">Audit Timeline</h3>
            <p class="mt-1 text-xs text-slate-400">
              Inspect full immutable security audit history including logins, additions, and
              updates.
            </p>
          </a>
        </div>
      </div>
    </div>
  `,
})
export class DashboardComponent implements OnInit {
  readonly authService = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly passkeyService = inject(PasskeyService);
  private readonly notificationService = inject(NotificationService);

  readonly profile = signal<UserProfile | null>(null);
  readonly isAddingPasskey = signal<boolean>(false);

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    this.userService.getProfile().subscribe({
      next: (data) => this.profile.set(data),
      error: (err) => this.notificationService.showError(err, 'Could not load profile'),
    });
  }

  async onAddPasskey(): Promise<void> {
    this.isAddingPasskey.set(true);
    try {
      await this.passkeyService.registerAdditionalPasskey('Backup Device Passkey');
      this.notificationService.showSuccess('New passkey enrolled successfully!');
      this.loadProfile();
    } catch (err) {
      this.notificationService.showError(err, 'Passkey Registration Failed');
    } finally {
      this.isAddingPasskey.set(false);
    }
  }
}
