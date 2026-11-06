import { Injectable, signal } from '@angular/core';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title?: string;
  message: string;
}

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private readonly _toast = signal<ToastMessage | null>(null);
  readonly toast = this._toast.asReadonly();
  private timeoutId: ReturnType<typeof setTimeout> | null = null;

  show(
    message: string,
    type: 'success' | 'error' | 'info' = 'info',
    title?: string,
    duration = 5000,
  ): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    const toast: ToastMessage = {
      id: Math.random().toString(36).substring(2, 9),
      type,
      title,
      message,
    };

    this._toast.set(toast);

    if (duration > 0) {
      this.timeoutId = setTimeout(() => {
        this.dismiss();
      }, duration);
    }
  }

  showSuccess(message: string, title = 'Success', duration = 4000): void {
    this.show(message, 'success', title, duration);
  }

  showError(error: unknown, title = 'Error', duration = 6000): void {
    let message = 'An unexpected error occurred';
    if (typeof error === 'string') {
      message = error;
    } else if (error && typeof error === 'object') {
      const err = error as { message?: string | string[]; error?: { message?: string | string[] } };
      if (err.error?.message) {
        message = Array.isArray(err.error.message)
          ? err.error.message.join('. ')
          : err.error.message;
      } else if (err.message) {
        message = Array.isArray(err.message) ? err.message.join('. ') : err.message;
      }
    }
    this.show(message, 'error', title, duration);
  }

  showInfo(message: string, title = 'Notice', duration = 4000): void {
    this.show(message, 'info', title, duration);
  }

  dismiss(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this._toast.set(null);
  }
}
