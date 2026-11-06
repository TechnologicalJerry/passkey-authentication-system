import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { PasskeyService } from '../../core/services/passkey.service';
import { NotificationService } from '../../core/services/notification.service';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import type { PasskeySummary } from '../../core/models/passkey.models';

@Component({
  selector: 'app-passkeys',
  imports: [FormsModule, DatePipe, ModalComponent],
  template: `
    <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <!-- Header -->
      <div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 class="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Passkey Credentials
          </h1>
          <p class="mt-1 text-sm text-slate-400">
            Manage your hardware authenticators, biometric keys, and security tokens.
          </p>
        </div>
        <button
          type="button"
          (click)="openAddModal()"
          class="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-500"
        >
          <svg
            class="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          <span>Register New Passkey</span>
        </button>
      </div>

      <!-- Safeguard Reminder Banner -->
      @if (passkeys().length === 1) {
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
              d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z"
              clip-rule="evenodd"
            />
          </svg>
          <div class="text-xs sm:text-sm">
            <p class="font-semibold text-amber-300">Last-Passkey Safeguard Active</p>
            <p class="mt-0.5 text-amber-200/80">
              The server will reject deleting your only active passkey to protect your account from
              permanent lockout. Add a second passkey before removing this one.
            </p>
          </div>
        </div>
      }

      <!-- Passkey Cards Grid -->
      <div class="mt-8 space-y-4">
        @if (isLoading()) {
          <div class="flex items-center justify-center py-16">
            <div
              class="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"
            ></div>
          </div>
        } @else if (passkeys().length === 0) {
          <div class="rounded-2xl border border-dashed border-slate-800 p-12 text-center">
            <p class="text-sm text-slate-400">No passkeys found.</p>
          </div>
        } @else {
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            @for (passkey of passkeys(); track passkey.id) {
              <div
                class="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-sm transition hover:border-slate-700"
              >
                <div>
                  <!-- Card Top info -->
                  <div class="flex items-start justify-between gap-3">
                    <div class="flex items-center gap-3">
                      <div
                        class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400"
                      >
                        <svg
                          class="h-5 w-5"
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
                      <div>
                        <h2 class="text-base font-semibold text-white">
                          {{ passkey.label || 'Unnamed Authenticator' }}
                        </h2>
                        <span
                          class="inline-block rounded-md bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-400"
                        >
                          {{ passkey.deviceType || 'Platform / Cross-Platform' }}
                        </span>
                      </div>
                    </div>

                    <!-- Backup status pill -->
                    @if (passkey.backedUp) {
                      <span
                        class="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-400"
                        title="Synced via iCloud Keychain or Google Password Manager"
                      >
                        Synced
                      </span>
                    } @else {
                      <span
                        class="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-slate-400"
                        title="Hardware Bound"
                      >
                        Hardware
                      </span>
                    }
                  </div>

                  <!-- Details -->
                  <div
                    class="mt-4 space-y-2 border-t border-slate-800/80 pt-3 text-xs text-slate-400"
                  >
                    <div class="flex justify-between">
                      <span class="text-slate-500">Credential ID:</span>
                      <span class="font-mono text-slate-300" [title]="passkey.credentialId">
                        {{ passkey.credentialId.substring(0, 12) }}...
                      </span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-slate-500">Transports:</span>
                      <span class="text-slate-300">
                        {{ passkey.transports?.join(', ') || 'internal' }}
                      </span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-slate-500">Registered:</span>
                      <span class="text-slate-300">{{
                        passkey.createdAt | date: 'mediumDate'
                      }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-slate-500">Last Used:</span>
                      <span class="text-slate-300">
                        {{ passkey.lastUsedAt ? (passkey.lastUsedAt | date: 'short') : 'Never' }}
                      </span>
                    </div>
                  </div>
                </div>

                <!-- Actions -->
                <div
                  class="mt-5 flex items-center justify-end gap-2 border-t border-slate-800/80 pt-4"
                >
                  <button
                    type="button"
                    (click)="openRenameModal(passkey)"
                    class="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-slate-700 hover:text-white"
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    (click)="onRevokePasskey(passkey)"
                    [disabled]="passkeys().length === 1"
                    [class.opacity-40]="passkeys().length === 1"
                    [class.cursor-not-allowed]="passkeys().length === 1"
                    class="rounded-lg border border-rose-900/50 bg-rose-950/30 px-3 py-1.5 text-xs font-semibold text-rose-300 transition hover:border-rose-700 hover:bg-rose-900/50"
                  >
                    Revoke
                  </button>
                </div>
              </div>
            }
          </div>
        }
      </div>
    </div>

    <!-- Add Passkey Modal -->
    <app-modal
      [isOpen]="isAddModalOpen()"
      title="Register New Passkey"
      (closed)="isAddModalOpen.set(false)"
    >
      <form (ngSubmit)="confirmAddPasskey()" class="space-y-4">
        <p class="text-xs text-slate-400">
          Give your new authenticator a recognizable label (e.g., "Personal MacBook", "Android
          Pixel", "YubiKey 5C").
        </p>
        <div>
          <label for="newPasskeyLabel" class="block text-xs font-medium text-slate-300">
            Passkey Label
          </label>
          <div class="mt-1.5">
            <input
              id="newPasskeyLabel"
              name="newPasskeyLabel"
              type="text"
              [(ngModel)]="newPasskeyLabel"
              placeholder="e.g. Work MacBook Touch ID"
              required
              class="block w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div class="flex justify-end gap-3 pt-4 border-t border-slate-800">
          <button
            type="button"
            (click)="isAddModalOpen.set(false)"
            class="rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            [disabled]="isSubmitting() || !newPasskeyLabel.trim()"
            class="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
          >
            {{ isSubmitting() ? 'Prompting hardware...' : 'Proceed with Biometrics' }}
          </button>
        </div>
      </form>
    </app-modal>

    <!-- Rename Modal -->
    <app-modal
      [isOpen]="isRenameModalOpen()"
      title="Rename Passkey"
      (closed)="isRenameModalOpen.set(false)"
    >
      <form (ngSubmit)="confirmRenamePasskey()" class="space-y-4">
        <div>
          <label for="editPasskeyLabel" class="block text-xs font-medium text-slate-300">
            New Label
          </label>
          <div class="mt-1.5">
            <input
              id="editPasskeyLabel"
              name="editPasskeyLabel"
              type="text"
              [(ngModel)]="editPasskeyLabel"
              required
              class="block w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div class="flex justify-end gap-3 pt-4 border-t border-slate-800">
          <button
            type="button"
            (click)="isRenameModalOpen.set(false)"
            class="rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            [disabled]="isSubmitting() || !editPasskeyLabel.trim()"
            class="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
          >
            Save Changes
          </button>
        </div>
      </form>
    </app-modal>
  `,
})
export class PasskeysComponent implements OnInit {
  private readonly passkeyService = inject(PasskeyService);
  private readonly notificationService = inject(NotificationService);

  readonly passkeys = signal<PasskeySummary[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly isSubmitting = signal<boolean>(false);

  // Add modal state
  readonly isAddModalOpen = signal<boolean>(false);
  newPasskeyLabel = '';

  // Rename modal state
  readonly isRenameModalOpen = signal<boolean>(false);
  selectedPasskey: PasskeySummary | null = null;
  editPasskeyLabel = '';

  ngOnInit(): void {
    this.loadPasskeys();
  }

  loadPasskeys(): void {
    this.isLoading.set(true);
    this.passkeyService.listPasskeys().subscribe({
      next: (data) => {
        this.passkeys.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.notificationService.showError(err, 'Failed to load passkeys');
        this.isLoading.set(false);
      },
    });
  }

  openAddModal(): void {
    this.newPasskeyLabel = 'Security Passkey';
    this.isAddModalOpen.set(true);
  }

  async confirmAddPasskey(): Promise<void> {
    if (!this.newPasskeyLabel.trim()) return;
    this.isSubmitting.set(true);
    try {
      await this.passkeyService.registerAdditionalPasskey(this.newPasskeyLabel.trim());
      this.notificationService.showSuccess('Passkey registered successfully!');
      this.isAddModalOpen.set(false);
      this.loadPasskeys();
    } catch (err) {
      this.notificationService.showError(err, 'Passkey Creation Failed');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  openRenameModal(passkey: PasskeySummary): void {
    this.selectedPasskey = passkey;
    this.editPasskeyLabel = passkey.label;
    this.isRenameModalOpen.set(true);
  }

  confirmRenamePasskey(): void {
    if (!this.selectedPasskey || !this.editPasskeyLabel.trim()) return;
    this.isSubmitting.set(true);

    this.passkeyService
      .renamePasskey(this.selectedPasskey.id, this.editPasskeyLabel.trim())
      .subscribe({
        next: (updated) => {
          this.passkeys.update((list) =>
            list.map((k) => (k.id === updated.id ? { ...k, label: updated.label } : k)),
          );
          this.notificationService.showSuccess('Passkey renamed.');
          this.isRenameModalOpen.set(false);
          this.isSubmitting.set(false);
        },
        error: (err) => {
          this.notificationService.showError(err, 'Could not rename passkey');
          this.isSubmitting.set(false);
        },
      });
  }

  onRevokePasskey(passkey: PasskeySummary): void {
    if (this.passkeys().length <= 1) {
      this.notificationService.showError(
        'Cannot revoke your only active passkey. Register a secondary passkey first.',
      );
      return;
    }

    if (
      !confirm(
        `Are you sure you want to revoke the passkey "${passkey.label}"? This action cannot be undone.`,
      )
    ) {
      return;
    }

    this.passkeyService.revokePasskey(passkey.id).subscribe({
      next: () => {
        this.passkeys.update((list) => list.filter((k) => k.id !== passkey.id));
        this.notificationService.showSuccess('Passkey revoked.');
      },
      error: (err) => {
        this.notificationService.showError(err, 'Revocation Failed');
      },
    });
  }
}
