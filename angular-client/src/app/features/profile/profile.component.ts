import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { UserService } from '../../core/services/user.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import type { UserProfile } from '../../core/models/user.models';

@Component({
  selector: 'app-profile',
  imports: [FormsModule, DatePipe],
  template: `
    <div class="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <!-- Header -->
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-white sm:text-3xl">Account Settings</h1>
        <p class="mt-1 text-sm text-slate-400">
          Manage your personal identity information, preferences, and account lifecycle.
        </p>
      </div>

      @if (isLoading()) {
        <div class="flex items-center justify-center py-16">
          <div
            class="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"
          ></div>
        </div>
      } @else if (profile()) {
        <div class="mt-8 space-y-8">
          <!-- Profile Card -->
          <div class="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-sm sm:p-8">
            <h2 class="text-lg font-semibold text-white">Identity Details</h2>
            <p class="mt-1 text-xs text-slate-400">
              Basic identification tied to your passkey credentials.
            </p>

            <form (ngSubmit)="onUpdateProfile()" class="mt-6 space-y-5">
              <div>
                <label for="profileEmail" class="block text-xs font-medium text-slate-400">
                  Email Address
                </label>
                <div class="mt-1.5 flex items-center gap-2">
                  <input
                    id="profileEmail"
                    type="email"
                    [value]="profile()?.email"
                    disabled
                    class="block w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3.5 py-2.5 text-sm text-slate-400 shadow-sm cursor-not-allowed"
                  />
                  <span
                    class="shrink-0 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400"
                  >
                    Verified
                  </span>
                </div>
                <p class="mt-1 text-[11px] text-slate-500">
                  Your email is the unique cryptographic account identifier and cannot be modified.
                </p>
              </div>

              <div>
                <label for="displayName" class="block text-xs font-medium text-slate-300">
                  Display Name
                </label>
                <div class="mt-1.5">
                  <input
                    id="displayName"
                    name="displayName"
                    type="text"
                    [(ngModel)]="displayName"
                    placeholder="Enter full name"
                    required
                    class="block w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div
                class="grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs text-slate-400 pt-2 border-t border-slate-800"
              >
                <div>
                  <span class="text-slate-500">Account ID:</span>
                  <p class="font-mono text-slate-300 truncate">{{ profile()?.id }}</p>
                </div>
                <div>
                  <span class="text-slate-500">Created:</span>
                  <p class="text-slate-300">{{ profile()?.createdAt | date: 'medium' }}</p>
                </div>
              </div>

              <div class="flex justify-end pt-2">
                <button
                  type="submit"
                  [disabled]="isUpdating() || displayName.trim() === profile()?.displayName"
                  class="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:opacity-50"
                >
                  {{ isUpdating() ? 'Saving...' : 'Save Profile' }}
                </button>
              </div>
            </form>
          </div>

          <!-- Danger Zone -->
          <div class="rounded-2xl border border-rose-900/40 bg-rose-950/10 p-6 sm:p-8">
            <h2 class="text-lg font-semibold text-rose-300">Danger Zone</h2>
            <p class="mt-1 text-xs text-slate-400">
              Actions that impact account state or permanently revoke your credentials.
            </p>

            <div class="mt-6 divide-y divide-rose-900/30">
              <!-- Deactivate -->
              <div class="flex flex-col justify-between gap-4 py-4 sm:flex-row sm:items-center">
                <div>
                  <h3 class="text-sm font-semibold text-white">Deactivate Account</h3>
                  <p class="text-xs text-slate-400">
                    Temporarily suspend login capabilities and invalidate all active sessions.
                  </p>
                </div>
                <button
                  type="button"
                  (click)="onDeactivateAccount()"
                  class="rounded-xl border border-amber-600/50 bg-amber-950/30 px-4 py-2 text-xs font-semibold text-amber-300 transition hover:bg-amber-900/50 sm:shrink-0"
                >
                  Deactivate Account
                </button>
              </div>

              <!-- Delete Account -->
              <div class="flex flex-col justify-between gap-4 py-4 sm:flex-row sm:items-center">
                <div>
                  <h3 class="text-sm font-semibold text-rose-400">Delete Account (GDPR Erasure)</h3>
                  <p class="text-xs text-slate-400">
                    Permanently delete all registered passkeys, invalidate sessions, and anonymize
                    your identity data.
                  </p>
                </div>
                <button
                  type="button"
                  (click)="onDeleteAccount()"
                  class="rounded-xl border border-rose-600 bg-rose-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-rose-500 sm:shrink-0"
                >
                  Permanently Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class ProfileComponent implements OnInit {
  private readonly userService = inject(UserService);
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);

  readonly profile = signal<UserProfile | null>(null);
  readonly isLoading = signal<boolean>(false);
  readonly isUpdating = signal<boolean>(false);
  displayName = '';

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    this.isLoading.set(true);
    this.userService.getProfile().subscribe({
      next: (data) => {
        this.profile.set(data);
        this.displayName = data.displayName || '';
        this.isLoading.set(false);
      },
      error: (err) => {
        this.notificationService.showError(err, 'Failed to load profile');
        this.isLoading.set(false);
      },
    });
  }

  onUpdateProfile(): void {
    if (!this.displayName.trim()) return;
    this.isUpdating.set(true);

    this.userService.updateProfile({ displayName: this.displayName.trim() }).subscribe({
      next: (updated) => {
        this.profile.set(updated);
        // Sync auth state
        if (this.authService.currentUser()) {
          this.authService.currentUser.set({
            ...this.authService.currentUser()!,
            displayName: updated.displayName,
          });
        }
        this.notificationService.showSuccess('Profile updated successfully.');
        this.isUpdating.set(false);
      },
      error: (err) => {
        this.notificationService.showError(err, 'Update failed');
        this.isUpdating.set(false);
      },
    });
  }

  onDeactivateAccount(): void {
    if (
      !confirm(
        'Are you sure you want to deactivate your account? All active sessions will be terminated immediately.',
      )
    ) {
      return;
    }

    this.userService.deactivateAccount().subscribe({
      next: () => {
        this.notificationService.showSuccess('Account has been deactivated.');
        this.authService.logout();
      },
      error: (err) => {
        this.notificationService.showError(err, 'Deactivation failed');
      },
    });
  }

  onDeleteAccount(): void {
    const confirmation = prompt(
      'DANGER: This action is permanent and irreversible. All your passkeys will be deleted.\n\nType "DELETE" to confirm:',
    );
    if (confirmation !== 'DELETE') {
      return;
    }

    this.userService.deleteAccount().subscribe({
      next: () => {
        this.notificationService.showSuccess('Account deleted and PII anonymized.');
        this.authService.logout();
      },
      error: (err) => {
        this.notificationService.showError(err, 'Deletion failed');
      },
    });
  }
}
