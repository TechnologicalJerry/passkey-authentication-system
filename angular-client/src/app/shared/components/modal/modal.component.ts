import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-modal',
  host: {
    '(keydown.escape)': 'onEscape()',
  },
  template: `
    @if (isOpen()) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        [attr.aria-labelledby]="title() ? 'modal-title' : null"
      >
        <!-- Backdrop -->
        <div
          class="fixed inset-0 bg-slate-950/75 backdrop-blur-sm transition-opacity"
          (click)="closed.emit()"
        ></div>

        <!-- Dialog Panel -->
        <div
          class="relative w-full max-w-lg overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 p-6 text-left shadow-2xl transition-all sm:my-8"
        >
          <div class="flex items-center justify-between pb-3 border-b border-slate-800">
            @if (title()) {
              <h3 id="modal-title" class="text-lg font-semibold leading-6 text-white">
                {{ title() }}
              </h3>
            }
            <button
              type="button"
              (click)="closed.emit()"
              class="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
              aria-label="Close dialog"
            >
              <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"
                />
              </svg>
            </button>
          </div>

          <div class="mt-4">
            <ng-content></ng-content>
          </div>
        </div>
      </div>
    }
  `,
})
export class ModalComponent {
  readonly isOpen = input<boolean>(false);
  readonly title = input<string>('');
  readonly closed = output<void>();

  onEscape(): void {
    if (this.isOpen()) {
      this.closed.emit();
    }
  }
}
