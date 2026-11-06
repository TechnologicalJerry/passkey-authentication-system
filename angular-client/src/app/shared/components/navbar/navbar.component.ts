import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <!-- Brand / Logo -->
        <a routerLink="/" class="flex items-center gap-2.5 text-white transition hover:opacity-90">
          <div
            class="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 shadow-md shadow-indigo-500/20"
          >
            <svg
              class="h-5 w-5 text-white"
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
            <span class="text-lg font-bold tracking-tight text-white">Passkey Auth</span>
            <span
              class="hidden rounded-full bg-indigo-500/10 px-2 py-0.5 text-xs font-semibold text-indigo-400 sm:inline-block sm:ml-2"
              >FIDO2</span
            >
          </div>
        </a>

        <!-- Desktop Navigation -->
        @if (authService.isAuthenticated()) {
          <div class="hidden md:flex md:items-center md:gap-1">
            <a
              routerLink="/dashboard"
              routerLinkActive="bg-slate-800 text-white shadow-inner"
              [routerLinkActiveOptions]="{ exact: true }"
              class="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
            >
              Dashboard
            </a>
            <a
              routerLink="/passkeys"
              routerLinkActive="bg-slate-800 text-white shadow-inner"
              class="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
            >
              Passkeys
            </a>
            <a
              routerLink="/sessions"
              routerLinkActive="bg-slate-800 text-white shadow-inner"
              class="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
            >
              Sessions
            </a>
            <a
              routerLink="/profile"
              routerLinkActive="bg-slate-800 text-white shadow-inner"
              class="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
            >
              Profile
            </a>
            <a
              routerLink="/audit-logs"
              routerLinkActive="bg-slate-800 text-white shadow-inner"
              class="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
            >
              Audit Logs
            </a>
          </div>

          <!-- User controls & Logout -->
          <div class="hidden md:flex md:items-center md:gap-4">
            <div class="text-right">
              <p class="text-xs font-semibold text-white">
                {{ authService.currentUser()?.displayName || 'User' }}
              </p>
              <p class="text-xs text-slate-400">
                {{ authService.currentUser()?.email }}
              </p>
            </div>
            <button
              type="button"
              (click)="authService.logout()"
              class="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-rose-600/50 hover:bg-rose-950/30 hover:text-rose-300"
            >
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              Sign out
            </button>
          </div>
        } @else {
          <div class="hidden md:flex md:items-center md:gap-3">
            <a
              routerLink="/auth/login"
              routerLinkActive="border-indigo-500 text-white"
              class="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-600 hover:bg-slate-800 hover:text-white"
            >
              Sign in
            </a>
            <a
              routerLink="/auth/register"
              class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              Get Started
            </a>
          </div>
        }

        <!-- Mobile hamburger toggle button -->
        <div class="flex md:hidden">
          <button
            type="button"
            (click)="mobileMenuOpen.set(!mobileMenuOpen())"
            class="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
            aria-label="Toggle navigation menu"
          >
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              @if (mobileMenuOpen()) {
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              } @else {
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              }
            </svg>
          </button>
        </div>
      </div>

      <!-- Mobile dropdown menu -->
      @if (mobileMenuOpen()) {
        <div class="border-t border-slate-800 bg-slate-950 px-4 py-3 md:hidden">
          @if (authService.isAuthenticated()) {
            <div class="mb-3 border-b border-slate-800 pb-3">
              <p class="font-semibold text-white">
                {{ authService.currentUser()?.displayName || 'User' }}
              </p>
              <p class="text-xs text-slate-400">{{ authService.currentUser()?.email }}</p>
            </div>
            <div class="space-y-1">
              <a
                routerLink="/dashboard"
                (click)="mobileMenuOpen.set(false)"
                class="block rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                Dashboard
              </a>
              <a
                routerLink="/passkeys"
                (click)="mobileMenuOpen.set(false)"
                class="block rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                Passkeys
              </a>
              <a
                routerLink="/sessions"
                (click)="mobileMenuOpen.set(false)"
                class="block rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                Sessions
              </a>
              <a
                routerLink="/profile"
                (click)="mobileMenuOpen.set(false)"
                class="block rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                Profile
              </a>
              <a
                routerLink="/audit-logs"
                (click)="mobileMenuOpen.set(false)"
                class="block rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                Audit Logs
              </a>
              <button
                type="button"
                (click)="mobileMenuOpen.set(false); authService.logout()"
                class="block w-full text-left rounded-lg px-3 py-2 text-sm font-medium text-rose-400 hover:bg-rose-950/30"
              >
                Sign out
              </button>
            </div>
          } @else {
            <div class="space-y-2 pt-1">
              <a
                routerLink="/auth/login"
                (click)="mobileMenuOpen.set(false)"
                class="block rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-center text-sm font-medium text-white"
              >
                Sign in
              </a>
              <a
                routerLink="/auth/register"
                (click)="mobileMenuOpen.set(false)"
                class="block rounded-lg bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white"
              >
                Get Started
              </a>
            </div>
          }
        </div>
      }
    </nav>
  `,
})
export class NavbarComponent {
  readonly authService = inject(AuthService);
  readonly mobileMenuOpen = signal<boolean>(false);
}
