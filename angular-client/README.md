# Passkey Authentication System — Angular Client

Production-ready, accessible, and reactive frontend application built with **Angular 22 (LTS)** and **Tailwind CSS v4** communicating with the **NestJS** backend.

---

## ✨ Features

- **Passwordless FIDO2 / WebAuthn:**
  - One-click discoverable passkey login (Touch ID, Windows Hello, Face ID, Security Keys).
  - Account-targeted passkey authentication.
  - Hardware-bound passkey enrollment with friendly device labels.
  - Multi-passkey management with enrollment of secondary backup keys.
- **Session & Token Management:**
  - Automatic `Authorization: Bearer <accessToken>` header injection.
  - Automatic token refresh queue on `401 Unauthorized` using HttpOnly rotating refresh cookies (`withCredentials: true`).
  - Active session explorer: view devices, IPs, user agents, and last activity timestamps.
  - Remote session revocation and "Sign out all other devices" action.
- **Account Lifecycle & Security:**
  - User profile management with editable display names.
  - Account deactivation (temporary suspension).
  - GDPR-compliant account anonymization & permanent deletion.
  - Security audit timeline with paginated event inspection.
- **Architecture & Performance:**
  - **100% Standalone Components:** Leveraging Angular 22 default standalone component model.
  - **Signals-Driven Reactivity:** `signal()`, `computed()`, and `linkedSignal()` for state management.
  - **Native Control Flow:** Clean `@if`, `@for`, and `@switch` syntax.
  - **Lazy-Loaded Routes:** Optimized bundle with discrete lazy chunks for every feature route.
  - **SSR & Hydration Safe:** Platform checks (`isPlatformBrowser`) preventing WebAuthn browser crashes on server render.
  - **Tailwind CSS v4:** Modern styling with zero runtime CSS overhead and dark theme.

---

## 🚀 Getting Started

### Prerequisites

- Node.js LTS (20.x or 22.x+)
- NestJS backend running on `http://localhost:3000`

### 1. Install Dependencies

```bash
cd angular-client
npm install
```

### 2. Development Server with API Proxy

```bash
npm start
# or: ng serve --proxy-config proxy.conf.json
```

Navigate to `http://localhost:4200/`. API calls to `/api/v1` are automatically proxied to `http://localhost:3000`.

### 3. Production Build

```bash
npm run build
```

Generates optimized, prerendered bundles in `dist/passkey-authentication-system`.

### 4. Running Unit Tests

```bash
npm test -- --watch=false
```

Executes all unit test suites using the Angular CLI and Vitest test runner.

---

## 📂 Project Structure

```
angular-client/src/
├── app/
│   ├── core/
│   │   ├── guards/
│   │   │   ├── auth.guard.ts           # Protects dashboard/settings routes
│   │   │   └── guest.guard.ts          # Redirects logged-in users away from auth pages
│   │   ├── interceptors/
│   │   │   └── auth.interceptor.ts     # Injects Bearer token & handles 401 refresh queue
│   │   ├── models/
│   │   │   ├── auth.models.ts          # WebAuthn options/verification payloads & TokenPair
│   │   │   ├── passkey.models.ts       # Passkey summaries and update DTOs
│   │   │   ├── session.models.ts       # Session summaries and rotation payloads
│   │   │   ├── user.models.ts          # User profiles, pagination & audit logs
│   │   │   └── api-response.models.ts  # Standard error format
│   │   └── services/
│   │       ├── auth.service.ts         # Biometric passkey ceremonies & reactive auth signals
│   │       ├── passkey.service.ts      # Passkey CRUD & additional key enrollment
│   │       ├── session.service.ts      # Active session management & remote revocation
│   │       ├── user.service.ts         # Profile update, deactivation, GDPR deletion, audit logs
│   │       └── notification.service.ts # Signal-based floating toast notifications
│   ├── shared/
│   │   └── components/
│   │       ├── navbar/                 # Responsive navigation bar with user dropdown
│   │       ├── toast/                  # Reactive toast notification container
│   │       └── modal/                  # Accessible dialog modal
│   ├── features/
│   │   ├── auth/
│   │   │   ├── login/                  # Discoverable & targeted passkey sign-in
│   │   │   └── register/               # Passkey account registration ceremony
│   │   ├── dashboard/                  # Security overview, health indicators, metrics
│   │   ├── passkeys/                   # Hardware passkey manager & last-passkey safeguard
│   │   ├── sessions/                   # Active device session viewer & remote logout
│   │   ├── profile/                    # User profile editor, deactivation, and GDPR erasure
│   │   └── audit-logs/                 # Paginated immutable security event timeline
│   ├── app.config.ts                   # Application configuration & HTTP interceptors
│   ├── app.routes.ts                   # Lazy-loaded route declarations
│   ├── app.html                        # App shell
│   └── app.ts                          # Root component
├── environments/
│   ├── environment.ts                  # Production environment config
│   └── environment.development.ts      # Development environment config
├── proxy.conf.json                     # Dev server proxy configuration to NestJS backend
└── styles.css                          # Tailwind CSS v4 entrypoint
```
