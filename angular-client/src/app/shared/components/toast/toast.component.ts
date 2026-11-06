import { Component, inject } from '@angular/core';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-toast',
  template: `
    @if (notificationService.toast(); as toast) {
      <div
        class="fixed bottom-5 right-5 z-50 flex max-w-md items-start gap-3 rounded-xl border p-4 shadow-xl backdrop-blur-md transition-all duration-300"
        [class.bg-emerald-950/90]="toast.type === 'success'"
        [class.border-emerald-600]="toast.type === 'success'"
        [class.text-emerald-200]="toast.type === 'success'"
        [class.bg-rose-950/90]="toast.type === 'error'"
        [class.border-rose-600]="toast.type === 'error'"
        [class.text-rose-200]="toast.type === 'error'"
        [class.bg-sky-950/90]="toast.type === 'info'"
        [class.border-sky-600]="toast.type === 'info'"
        [class.text-sky-200]="toast.type === 'info'"
        role="alert"
      >
        <div class="mt-0.5 shrink-0">
          @if (toast.type === 'success') {
            <svg class="h-5 w-5 text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
              <path
                fill-rule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                clip-rule="evenodd"
              />
            </svg>
          } @else if (toast.type === 'error') {
            <svg class="h-5 w-5 text-rose-400" viewBox="0 0 20 20" fill="currentColor">
              <path
                fill-rule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                clip-rule="evenodd"
              />
            </svg>
          } @else {
            <svg class="h-5 w-5 text-sky-400" viewBox="0 0 20 20" fill="currentColor">
              <path
                fill-rule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
                clip-rule="evenodd"
              />
            </svg>
          }
        </div>
        <div class="flex-1">
          @if (toast.title) {
            <p class="font-semibold leading-tight text-white">{{ toast.title }}</p>
          }
          <p class="text-sm leading-snug">{{ toast.message }}</p>
        </div>
        <button
          type="button"
          (click)="notificationService.dismiss()"
          class="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white"
          aria-label="Dismiss alert"
        >
          <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path
              d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"
            />
          </svg>
        </button>
      </div>
    }
  `,
})
export class ToastComponent {
  readonly notificationService = inject(NotificationService);
}
