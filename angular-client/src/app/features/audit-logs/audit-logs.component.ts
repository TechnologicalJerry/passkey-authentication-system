import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { UserService } from '../../core/services/user.service';
import { NotificationService } from '../../core/services/notification.service';
import type { AuditLog, PaginatedResult } from '../../core/models/user.models';

@Component({
  selector: 'app-audit-logs',
  imports: [DatePipe],
  template: `
    <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <!-- Header -->
      <div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 class="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Security Audit Timeline
          </h1>
          <p class="mt-1 text-sm text-slate-400">
            Immutable log of all authentication events, credential modifications, and session
            activity.
          </p>
        </div>

        <button
          type="button"
          (click)="loadAuditLogs()"
          [disabled]="isLoading()"
          class="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-700 hover:text-white disabled:opacity-50"
        >
          <svg
            class="h-4 w-4"
            [class.animate-spin]="isLoading()"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
            />
          </svg>
          <span>Refresh</span>
        </button>
      </div>

      <!-- Audit Logs Table -->
      <div
        class="mt-8 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 shadow-sm"
      >
        @if (isLoading()) {
          <div class="flex items-center justify-center py-20">
            <div
              class="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"
            ></div>
          </div>
        } @else if (logs().items.length === 0) {
          <div class="p-12 text-center text-sm text-slate-400">
            No audit log entries recorded yet.
          </div>
        } @else {
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-slate-800 text-left text-sm">
              <thead
                class="bg-slate-950/60 text-xs font-semibold uppercase tracking-wider text-slate-400"
              >
                <tr>
                  <th scope="col" class="px-6 py-4">Event</th>
                  <th scope="col" class="px-6 py-4">Outcome</th>
                  <th scope="col" class="px-6 py-4">IP & Location</th>
                  <th scope="col" class="px-6 py-4">User Agent</th>
                  <th scope="col" class="px-6 py-4">Timestamp</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-800/80 text-xs">
                @for (log of logs().items; track log.id) {
                  <tr class="transition hover:bg-slate-800/40">
                    <td class="whitespace-nowrap px-6 py-4 font-semibold text-white">
                      {{ formatEventType(log.eventType) }}
                    </td>
                    <td class="whitespace-nowrap px-6 py-4">
                      @if (log.outcome === 'SUCCESS') {
                        <span
                          class="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 font-semibold text-emerald-400"
                        >
                          <span class="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                          Success
                        </span>
                      } @else if (log.outcome === 'FAILURE') {
                        <span
                          class="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2.5 py-0.5 font-semibold text-rose-400"
                        >
                          <span class="h-1.5 w-1.5 rounded-full bg-rose-400"></span>
                          Failure
                        </span>
                      } @else {
                        <span
                          class="inline-flex items-center gap-1 rounded-full bg-sky-500/10 px-2.5 py-0.5 font-semibold text-sky-400"
                        >
                          Challenge
                        </span>
                      }
                    </td>
                    <td class="whitespace-nowrap px-6 py-4 font-mono text-slate-300">
                      {{ log.ipAddress || '—' }}
                    </td>
                    <td
                      class="max-w-xs truncate px-6 py-4 font-mono text-slate-400"
                      [title]="log.userAgent || ''"
                    >
                      {{ log.userAgent || '—' }}
                    </td>
                    <td class="whitespace-nowrap px-6 py-4 text-slate-400">
                      {{ log.createdAt | date: 'medium' }}
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Pagination Footer -->
          <div
            class="flex items-center justify-between border-t border-slate-800 bg-slate-950/40 px-6 py-4 text-xs text-slate-400"
          >
            <div>
              Showing <span class="font-semibold text-white">{{ offset + 1 }}</span> to
              <span class="font-semibold text-white">
                {{ Math.min(offset + limit, logs().total) }}
              </span>
              of <span class="font-semibold text-white">{{ logs().total }}</span> events
            </div>

            <div class="flex items-center gap-2">
              <button
                type="button"
                (click)="prevPage()"
                [disabled]="offset === 0"
                class="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 font-semibold text-slate-200 transition hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                type="button"
                (click)="nextPage()"
                [disabled]="!logs().hasMore"
                class="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 font-semibold text-slate-200 transition hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class AuditLogsComponent implements OnInit {
  private readonly userService = inject(UserService);
  private readonly notificationService = inject(NotificationService);

  readonly logs = signal<PaginatedResult<AuditLog>>({
    items: [],
    total: 0,
    limit: 20,
    offset: 0,
    hasMore: false,
  });
  readonly isLoading = signal<boolean>(false);

  limit = 20;
  offset = 0;
  readonly Math = Math;

  ngOnInit(): void {
    this.loadAuditLogs();
  }

  loadAuditLogs(): void {
    this.isLoading.set(true);
    this.userService.getAuditLogs(this.limit, this.offset).subscribe({
      next: (data) => {
        this.logs.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.notificationService.showError(err, 'Failed to fetch audit timeline');
        this.isLoading.set(false);
      },
    });
  }

  nextPage(): void {
    if (this.logs().hasMore) {
      this.offset += this.limit;
      this.loadAuditLogs();
    }
  }

  prevPage(): void {
    if (this.offset > 0) {
      this.offset = Math.max(0, this.offset - this.limit);
      this.loadAuditLogs();
    }
  }

  formatEventType(type: string): string {
    const map: Record<string, string> = {
      SESSION_CREATED: 'Session Established',
      SESSION_REVOKED: 'Session Revoked',
      PASSKEY_REGISTERED: 'Passkey Registered',
      PASSKEY_AUTHENTICATED: 'Passkey Authenticated',
      PASSKEY_REVOKED: 'Passkey Revoked',
      PASSKEY_RENAMED: 'Passkey Renamed',
      USER_PROFILE_UPDATED: 'Profile Updated',
      ACCOUNT_DEACTIVATED: 'Account Deactivated',
      ACCOUNT_DELETED: 'Account Deleted',
    };
    return map[type] || type.replace(/_/g, ' ');
  }
}
