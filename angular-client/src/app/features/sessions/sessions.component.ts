import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { SessionService } from '../../core/services/session.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import type { SessionSummary } from '../../core/models/session.models';

@Component({
  selector: 'app-sessions',
  imports: [DatePipe],
  template: `
    <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <!-- Header -->
      <div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 class="text-2xl font-bold tracking-tight text-white sm:text-3xl">Active Sessions</h1>
          <p class="mt-1 text-sm text-slate-400">
            View and manage devices currently signed into your account.
          </p>
        </div>
        @if (sessions().length > 1) {
          <button
            type="button"
            (click)="onRevokeAllOtherSessions()"
            [disabled]="isRevokingAll()"
            class="inline-flex items-center gap-2 rounded-xl border border-rose-800/60 bg-rose-950/30 px-4 py-2.5 text-sm font-semibold text-rose-300 shadow-sm transition hover:bg-rose-900/50 disabled:opacity-50"
          >
            <svg
              class="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"
              />
            </svg>
            <span>{{ isRevokingAll() ? 'Revoking...' : 'Sign Out All Other Devices' }}</span>
          </button>
        }
      </div>

      <!-- Sessions List -->
      <div class="mt-8">
        @if (isLoading()) {
          <div class="flex items-center justify-center py-16">
            <div
              class="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"
            ></div>
          </div>
        } @else if (sessions().length === 0) {
          <div class="rounded-2xl border border-dashed border-slate-800 p-12 text-center">
            <p class="text-sm text-slate-400">No active sessions found.</p>
          </div>
        } @else {
          <div class="space-y-4">
            @for (session of sessions(); track session.id) {
              <div
                class="flex flex-col justify-between gap-4 rounded-2xl border p-5 shadow-sm transition sm:flex-row sm:items-center"
                [class.border-emerald-500/40]="session.isCurrent"
                [class.bg-slate-900/90]="session.isCurrent"
                [class.border-slate-800]="!session.isCurrent"
                [class.bg-slate-900/60]="!session.isCurrent"
              >
                <!-- Device Details -->
                <div class="flex items-start gap-4">
                  <div
                    class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                    [class.bg-emerald-500/10]="session.isCurrent"
                    [class.text-emerald-400]="session.isCurrent"
                    [class.bg-slate-800]="!session.isCurrent"
                    [class.text-slate-400]="!session.isCurrent"
                  >
                    <svg
                      class="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      stroke-width="1.8"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0H3"
                      />
                    </svg>
                  </div>

                  <div>
                    <div class="flex flex-wrap items-center gap-2">
                      <h2 class="text-base font-semibold text-white">
                        {{ session.deviceLabel || 'Browser Session' }}
                      </h2>
                      @if (session.isCurrent) {
                        <span
                          class="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400"
                        >
                          <span class="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                          This Device (Current)
                        </span>
                      }
                    </div>

                    <div
                      class="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400"
                    >
                      <span
                        >IP:
                        <strong class="text-slate-300 font-mono">{{
                          session.ipAddress || 'Unknown'
                        }}</strong></span
                      >
                      <span
                        >Last active:
                        <strong class="text-slate-300">{{
                          session.lastActivityAt | date: 'medium'
                        }}</strong></span
                      >
                      <span
                        >Expires:
                        <strong class="text-slate-300">{{
                          session.expiresAt | date: 'mediumDate'
                        }}</strong></span
                      >
                    </div>

                    @if (session.userAgent) {
                      <p
                        class="mt-1.5 truncate max-w-xl text-[11px] text-slate-500 font-mono"
                        [title]="session.userAgent"
                      >
                        {{ session.userAgent }}
                      </p>
                    }
                  </div>
                </div>

                <!-- Revoke Action -->
                <div class="flex items-center justify-end sm:shrink-0">
                  @if (session.isCurrent) {
                    <button
                      type="button"
                      (click)="authService.logout()"
                      class="rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-700 hover:text-white"
                    >
                      Sign Out
                    </button>
                  } @else {
                    <button
                      type="button"
                      (click)="onRevokeSession(session)"
                      class="rounded-xl border border-rose-900/50 bg-rose-950/20 px-3.5 py-2 text-xs font-semibold text-rose-300 transition hover:border-rose-700 hover:bg-rose-900/40"
                    >
                      Revoke Device
                    </button>
                  }
                </div>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class SessionsComponent implements OnInit {
  private readonly sessionService = inject(SessionService);
  readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);

  readonly sessions = signal<SessionSummary[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly isRevokingAll = signal<boolean>(false);

  ngOnInit(): void {
    this.loadSessions();
  }

  loadSessions(): void {
    this.isLoading.set(true);
    this.sessionService.listSessions().subscribe({
      next: (data) => {
        this.sessions.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.notificationService.showError(err, 'Failed to load sessions');
        this.isLoading.set(false);
      },
    });
  }

  onRevokeSession(session: SessionSummary): void {
    if (
      !confirm(
        `Are you sure you want to revoke the session from "${session.deviceLabel || 'this device'}"?`,
      )
    ) {
      return;
    }

    this.sessionService.revokeSession(session.id).subscribe({
      next: () => {
        this.sessions.update((list) => list.filter((s) => s.id !== session.id));
        this.notificationService.showSuccess('Device session revoked.');
      },
      error: (err) => {
        this.notificationService.showError(err, 'Failed to revoke session');
      },
    });
  }

  onRevokeAllOtherSessions(): void {
    if (
      !confirm(
        'Are you sure you want to sign out all other devices? Only your current session will remain active.',
      )
    ) {
      return;
    }

    this.isRevokingAll.set(true);
    this.sessionService.revokeAllOtherSessions().subscribe({
      next: (res) => {
        this.notificationService.showSuccess(
          res.message || 'All other sessions have been revoked.',
        );
        this.loadSessions();
        this.isRevokingAll.set(false);
      },
      error: (err) => {
        this.notificationService.showError(err, 'Revocation failed');
        this.isRevokingAll.set(false);
      },
    });
  }
}
