# Passkey Authentication System — Backend (`nest-server`)

A production-grade, passwordless authentication backend built with NestJS, TypeScript (ESM), PostgreSQL, and WebAuthn/FIDO2 passkey standards.

---

## 1. Project Purpose

The primary objective is to deliver a secure, scalable, backend-only passwordless authentication service utilizing FIDO2/WebAuthn passkeys, high-security session/token lifecycle management, production-hardened user account lifecycles, and a durable security audit trail.

---

## 2. Technology Stack

- **Runtime:** Node.js 24 LTS
- **Framework:** NestJS 12 (ESM — ECMAScript Modules)
- **Language:** TypeScript 6 (Strict mode, NodeNext resolution)
- **WebAuthn / FIDO2:** `@simplewebauthn/server` 14
- **Tokens & Security:** `@nestjs/jwt`, HMAC-SHA256, timingSafeEqual, `cookie-parser`, Helmet
- **Database & ORM:** PostgreSQL 17 with TypeORM 0.3.x
- **Configuration & Validation:** `@nestjs/config`, Joi, `class-validator`, `class-transformer`
- **Rate Limiting & Protection:** `@nestjs/throttler`, route-specific throttling, explicit CORS allowlists, safe exception filtering
- **Structured Logging & Audit:** Pino, `nestjs-pino`, durable `audit_logs` database table with sensitive data redaction
- **API Documentation:** OpenAPI / Swagger (`@nestjs/swagger`)
- **Testing:** Vitest, Supertest
- **Code Quality:** Oxlint, Prettier
- **Containerization:** Docker, Docker Compose

---

## 3. Project Architecture

```
nest-server/
├── Dockerfile                  # Multi-stage production Dockerfile
├── docker-compose.yml          # PostgreSQL 17 local container definition
├── package.json                # Dependencies, scripts, and module metadata
├── tsconfig.json               # Strict TypeScript configuration (NodeNext)
├── vitest.config.ts            # Unit test configuration
├── vitest.config.e2e.ts        # Integration/E2E test configuration
├── .env.example                # Safe local environment variable template
├── src/
│   ├── main.ts                 # Bootstrap, trusted proxy, X-Request-Id & Swagger setup
│   ├── app.module.ts           # Root module aggregating infrastructure & domain modules
│   ├── app.controller.ts       # Service identification controller
│   ├── app.service.ts          # Service information provider
│   ├── config/
│   │   ├── configuration.ts    # Centralized configuration factory
│   │   ├── env.validation.ts   # Joi schema for environment validation
│   │   └── configuration.spec.ts # Config & validation unit tests
│   ├── database/
│   │   ├── database.module.ts  # Asynchronous TypeORM database module
│   │   ├── data-source.ts      # TypeORM CLI DataSource configuration
│   │   └── migrations/         # Version-controlled migration files
│   │       ├── 1730400000000-CreateIdentityAndPasskeyTables.ts
│   │       ├── 1730500000000-CreateSessionsTable.ts
│   │       └── 1730600000000-CreateAuditLogsAndHardenSchema.ts
│   ├── logging/
│   │   └── logging.module.ts   # Pino structured logging module & sensitive data redaction
│   ├── audit/
│   │   ├── audit.module.ts     # Global audit trail module
│   │   ├── audit.service.ts    # Durable audit logging & user audit queries
│   │   └── entities/
│   │       └── audit-log.entity.ts # Persistent audit log entity
│   ├── enrollment/
│   │   ├── enrollment.module.ts# Enrollment security boundary module
│   │   ├── enrollment.service.ts # Single-use invitation generation & validation
│   │   └── entities/
│   │       └── enrollment-invitation.entity.ts # Single-use invitation entity
│   ├── health/
│   │   ├── health.module.ts    # Health probes module
│   │   ├── health.controller.ts# Liveness & readiness endpoints
│   │   ├── health.service.ts   # Dependency check service (PostgreSQL ping)
│   │   └── health.controller.spec.ts # Health unit tests
│   ├── users/
│   │   ├── users.module.ts     # User identity domain module
│   │   ├── users.service.ts    # Profile update, deactivation, and deletion
│   │   ├── users.controller.ts # Account lifecycle endpoints (/users/me)
│   │   ├── dto/                # User profile & update DTOs
│   │   └── entities/
│   │       └── user.entity.ts  # User identity model with displayName
│   ├── passkeys/
│   │   ├── passkeys.module.ts  # Passkey credentials domain module
│   │   ├── passkeys.service.ts # Passkey listing, renaming, and lockout-safe revocation
│   │   ├── passkeys.controller.ts # Passkey management endpoints (/passkeys)
│   │   ├── dto/                # Passkey summary & rename DTOs
│   │   └── entities/
│   │       └── passkey-credential.entity.ts # Persistent WebAuthn credential model
│   ├── sessions/
│   │   ├── sessions.module.ts  # Sessions domain module
│   │   ├── sessions.service.ts # Session lifecycle, rotation, and reuse detection service
│   │   ├── sessions.controller.ts # Refresh, logout, session management endpoints
│   │   ├── entities/
│   │   │   └── session.entity.ts # Persistent Session model with token hashes
│   │   └── dto/
│   │       ├── refresh-token.dto.ts
│   │       └── session-id-param.dto.ts
│   ├── auth/
│   │   ├── auth.module.ts      # Passkey authentication module
│   │   ├── auth.controller.ts  # Registration & authentication ceremony endpoints
│   │   ├── auth.service.ts     # WebAuthn ceremony business logic & validation
│   │   ├── challenge.service.ts# Atomic challenge persistence and lifecycle service
│   │   ├── token.service.ts    # JWT and raw refresh token generation/hashing service
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts     # Real-time session-aware JWT guard
│   │   │   └── jwt-auth.guard.spec.ts
│   │   ├── decorators/
│   │   │   └── current-user.decorator.ts # Typed AuthenticatedUser parameter decorator
│   │   ├── entities/
│   │   │   └── auth-challenge.entity.ts # Challenge model with TTL and consumption tracking
│   │   └── dto/
│   │       ├── registration-options.dto.ts
│   │       ├── registration-verify.dto.ts
│   │       ├── authentication-options.dto.ts
│   │       └── authentication-verify.dto.ts
│   └── common/
│       ├── constants/          # Application-wide constants & redaction keys
│       ├── types/              # Common interfaces and shared types
│       ├── dto/                # Pagination & UUID param DTOs
│       └── filters/
│           ├── all-exceptions.filter.ts      # Safe exception filter with X-Request-Id
│           └── all-exceptions.filter.spec.ts # Filter unit tests
└── test/
    ├── app.e2e-spec.ts                 # Bootstrap and routing integration tests
    ├── health.e2e-spec.ts              # Health probe HTTP integration tests
    ├── auth-registration.e2e-spec.ts   # Passkey registration ceremony integration tests
    ├── auth-authentication.e2e-spec.ts # Passkey authentication ceremony integration tests
    ├── auth-sessions.e2e-spec.ts       # Session rotation, logout, and token integration tests
    ├── account-lifecycle.e2e-spec.ts   # User profile, deactivation, and deletion tests
    ├── passkeys-management.e2e-spec.ts # Passkey listing, renaming, and lockout tests
    └── rate-limiting.e2e-spec.ts       # Route-specific rate limiting tests
```

---

## 4. Stage Status Tracker

- **Stage 1 — Foundation & Architecture:** Implementation complete; verification pending.
- **Stage 2 — Identity & Passkey Authentication:** Implementation complete; verification pending.
- **Stage 3 — Sessions, Tokens & Security:** Implementation complete; verification pending.
- **Stage 4 — Production Features & Hardening:** Implementation complete; verification pending.
- **Stage 5 — Testing, Verification & Deployment:** Pending.

- **Completed stages:** 4/5 (implementation completed)
- **Remaining stages:** 1/5

*Note: Per project rules, Stages 1–4 are implementation-only. All runtime execution, build steps, and test suites are verified in Stage 5.*

---

## 5. Production Hardening Features (Stage 4)

### 5.1 User Account Lifecycle
- **Profile Management (`GET /api/v1/users/me` & `PATCH /api/v1/users/me`):** Authenticated users can retrieve their profile and update permitted fields (`displayName`). Protected fields (`id`, `email`, `status`, `emailVerifiedAt`) cannot be altered.
- **Account Deactivation (`POST /api/v1/users/me/deactivate`):** Transitions account to `SUSPENDED` and immediately revokes all active sessions across all devices. Suspended accounts are rejected from future authentication and session refreshes.
- **Documented Account Deletion / Anonymization (`DELETE /api/v1/users/me`):** Suspends the account, revokes all active sessions and passkeys, and anonymizes personal identifiers (`email = deleted_{id}@anonymized.local`, `displayName = Deleted User`). Audit records are preserved to fulfill security and regulatory compliance.

### 5.2 Passkey & Credential Management
- **Safe Metadata Listing (`GET /api/v1/passkeys`):** Returns registered passkeys with human-readable labels, creation dates, device types, backup state, and last used timestamps. Cryptographic public key bytes and signature counters are never leaked.
- **Device Renaming (`PATCH /api/v1/passkeys/:id`):** Allows users to update device labels with strict database ownership enforcement.
- **Last-Passkey Lockout Safeguard (`DELETE /api/v1/passkeys/:id`):** Prevents a user from removing their only active passkey (`activeCount <= 1`), returning `400 Bad Request` to avert permanent account lockout.
- **Adding Additional Passkeys (`POST /api/v1/passkeys/registration/options`):** Allows authenticated users to generate registration options with their existing credentials excluded, seamlessly enrolling additional devices.

### 5.3 Durable Security Audit Trail
- **Dedicated Database Table (`audit_logs`):** Automatically records security-critical events (enrollment, ceremonies, credential revocation, session rotation, replay detection, deactivations).
- **Log Privacy & Redaction:** Tokens, cookies, authorization headers, and cryptographic challenges are scrubbed before persistence and stdout output.
- **Self-Service Audit History (`GET /api/v1/users/me/audit-logs`):** Authenticated users can inspect paginated audit events tied to their account.

### 5.4 Route-Specific Rate Limiting
- **Throttler Policies:** Applied via `@Throttle` on sensitive endpoints:
  - Registration options & verify: 5 req/min
  - Authentication options & verify: 10 req/min
  - Refresh token rotation: 20 req/min
  - Passkey revocation & account deactivation: 3–5 req/min
- **Trusted Reverse Proxy:** `app.set('trust proxy', 1)` enables accurate client IP extraction from `X-Forwarded-For` when deployed behind load balancers.

### 5.5 Input & Error Hardening
- **Pagination & UUID DTOs:** Standardized `PaginationQueryDto` (capped at 100 items) and `UUIDParamDto`.
- **Database Error Sanitization:** `AllExceptionsFilter` intercepts database constraint violations and formats safe error responses, eliminating schema leakage.
- **Correlation Tracking:** `X-Request-Id` is attached to every incoming request and returned in error responses.

---

## 6. API Endpoints Reference

### 6.1 Passkey Authentication (`/api/v1/auth/passkeys`)
- `POST /options`: Generate registration options (Throttled: 5/min).
- `POST /verify`: Verify attestation and activate user (Throttled: 5/min).
- `POST /authentication/options`: Generate assertion options (Throttled: 10/min).
- `POST /authentication/verify`: Verify assertion signature, establish session (Throttled: 10/min).

### 6.2 Sessions & Tokens (`/api/v1/auth`)
- `POST /token/refresh`: Rotate refresh token and issue new JWT (Throttled: 20/min, CSRF protected).
- `POST /logout`: Revoke current session and clear cookie (Requires Bearer token).
- `POST /logout/all`: Revoke all sessions across all devices (Requires Bearer token).
- `GET /sessions`: List active and historical sessions (Requires Bearer token, Paginated).
- `DELETE /sessions/:id`: Revoke specific session (Requires Bearer token).

### 6.3 User Account Lifecycle (`/api/v1/users`)
- `GET /me`: Retrieve authenticated user profile (Requires Bearer token).
- `PATCH /me`: Update permitted profile fields like displayName (Requires Bearer token).
- `POST /me/deactivate`: Deactivate account and revoke all sessions (Requires Bearer token, Throttled: 3/min).
- `DELETE /me`: Execute account deletion/anonymization policy (Requires Bearer token, Throttled: 2/min).
- `GET /me/audit-logs`: Retrieve paginated security audit events (Requires Bearer token).

### 6.4 Passkey & Credential Management (`/api/v1/passkeys`)
- `GET /`: List user registered passkeys with safe metadata (Requires Bearer token).
- `POST /registration/options`: Generate options for enrolling an additional passkey (Requires Bearer token, Throttled: 5/min).
- `PATCH /:id`: Rename passkey device label (Requires Bearer token).
- `DELETE /:id`: Revoke passkey with last-passkey safeguard (Requires Bearer token, Throttled: 5/min).

### 6.5 Health Probes (`/api/v1/health`)
- `GET /live`: Liveness check.
- `GET /ready`: Readiness check with PostgreSQL dependency ping.

---

## 7. Database Migrations

- **1730400000000-CreateIdentityAndPasskeyTables.ts:** Creates `users`, `passkey_credentials`, and `auth_challenges` tables, enums, constraints, and indexes.
- **1730500000000-CreateSessionsTable.ts:** Creates `sessions` table, foreign keys with cascade delete, and lookup indexes.
- **1730600000000-CreateAuditLogsAndHardenSchema.ts:** Adds `display_name` to `users`, creates `audit_logs` and `enrollment_invitations` tables with performance indexes.

---

## 8. Testing Infrastructure (Write-Only per Stages 1–4)

1. `src/users/users.service.spec.ts` & `src/users/users.controller.spec.ts`
2. `src/passkeys/passkeys.service.spec.ts` & `src/passkeys/passkeys.controller.spec.ts`
3. `src/audit/audit.service.spec.ts`
4. `src/enrollment/enrollment.service.spec.ts`
5. `src/auth/token.service.spec.ts` & `src/auth/guards/jwt-auth.guard.spec.ts`
6. `src/sessions/sessions.service.spec.ts`
7. `src/auth/auth.service.spec.ts`
8. `test/app.e2e-spec.ts`
9. `test/health.e2e-spec.ts`
10. `test/auth-registration.e2e-spec.ts`
11. `test/auth-authentication.e2e-spec.ts`
12. `test/auth-sessions.e2e-spec.ts`
13. `test/account-lifecycle.e2e-spec.ts`
14. `test/passkeys-management.e2e-spec.ts`
15. `test/rate-limiting.e2e-spec.ts`
