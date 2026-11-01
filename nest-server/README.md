# Passkey Authentication System — Backend (`nest-server`)

A production-grade, passwordless authentication backend built with NestJS, TypeScript (ESM), PostgreSQL, and WebAuthn/FIDO2 passkey standards.

---

## 1. Project Purpose

The primary objective is to deliver a secure, scalable, backend-only passwordless authentication service utilizing FIDO2/WebAuthn passkeys and high-security session/token lifecycle management. This service replaces traditional passwords with public-key cryptographic credentials stored securely in client authenticators (e.g., biometric sensors, platform authenticators, hardware security keys), issuing short-lived JWT access tokens and rotatable HMAC-SHA256 hashed refresh tokens.

---

## 2. Technology Stack

- **Runtime:** Node.js 24 LTS
- **Framework:** NestJS 12 (ESM — ECMAScript Modules)
- **Language:** TypeScript 6 (Strict mode, NodeNext resolution)
- **WebAuthn / FIDO2:** `@simplewebauthn/server` 14
- **Tokens & Security:** `@nestjs/jwt`, HMAC-SHA256, timingSafeEqual, `cookie-parser`, Helmet
- **Database & ORM:** PostgreSQL 17 with TypeORM 0.3.x
- **Configuration & Validation:** `@nestjs/config`, Joi, `class-validator`, `class-transformer`
- **Rate Limiting & Protection:** `@nestjs/throttler`, explicit CORS allowlists, safe exception filtering
- **Structured Logging:** Pino, `nestjs-pino`, `pino-pretty` (with automated credential & secret redaction)
- **API Documentation:** OpenAPI / Swagger (`@nestjs/swagger`)
- **Testing:** Vitest, Supertest
- **Code Quality:** Oxlint, Prettier
- **Containerization:** Docker, Docker Compose

---

## 3. Project Architecture

The architecture adheres to modular NestJS design with strict separation of concerns:

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
│   ├── main.ts                 # Application bootstrap, cookie-parser & Swagger setup
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
│   │       └── 1730500000000-CreateSessionsTable.ts
│   ├── logging/
│   │   └── logging.module.ts   # Pino structured logging module & sensitive data redaction
│   ├── health/
│   │   ├── health.module.ts    # Health probes module
│   │   ├── health.controller.ts# Liveness & readiness endpoints
│   │   ├── health.service.ts   # Dependency check service (PostgreSQL ping)
│   │   └── health.controller.spec.ts # Health unit tests
│   ├── users/
│   │   ├── users.module.ts     # User identity domain module
│   │   ├── users.service.ts    # User query, creation, and activation service
│   │   └── entities/
│   │       └── user.entity.ts  # Persistent user identity model
│   ├── passkeys/
│   │   ├── passkeys.module.ts  # Passkey credentials domain module
│   │   ├── passkeys.service.ts # Passkey persistence & signature counter service
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
│       └── filters/
│           ├── all-exceptions.filter.ts      # Safe exception filter
│           └── all-exceptions.filter.spec.ts # Filter unit tests
└── test/
    ├── app.e2e-spec.ts                 # Bootstrap and routing integration tests
    ├── health.e2e-spec.ts              # Health probe HTTP integration tests
    ├── auth-registration.e2e-spec.ts   # Passkey registration ceremony integration tests
    ├── auth-authentication.e2e-spec.ts # Passkey authentication ceremony integration tests
    └── auth-sessions.e2e-spec.ts       # Session rotation, logout, and token integration tests
```

---

## 4. Stage Status Tracker

- **Stage 1 — Foundation & Architecture:** Implementation complete; verification pending.
- **Stage 2 — Identity & Passkey Authentication:** Implementation complete; verification pending.
- **Stage 3 — Sessions, Tokens & Security:** Implementation complete; verification pending.
- **Stage 4 — Production Features & Hardening:** Pending.
- **Stage 5 — Testing, Verification & Deployment:** Pending.

- **Completed stages:** 3/5 (implementation completed)
- **Remaining stages:** 2/5

_Note: Per project rules, Stages 1–4 are implementation-only. All runtime execution, build steps, and test suites are verified in Stage 5._

---

## 5. Session & Token Architecture (Stage 3)

### 5.1 Short-Lived Access Tokens (JWT)

- **Algorithm:** HS256 with explicit allowlist (rejects algorithm switching and `none` attacks).
- **TTL:** 15 minutes by default (`JWT_ACCESS_TTL=15m`).
- **Standard Claims:**
  - `sub`: User ID (UUID).
  - `email`: Normalized user email.
  - `sessionId`: Associated active session ID (UUID).
  - `jti`: Unique token identifier for tracing (UUID).
  - `iss`: Issuer (`passkey-auth-api`).
  - `aud`: Audience (`passkey-auth-app`).
- **Real-Time Revocation Validation:** The `JwtAuthGuard` does not rely solely on stateless JWT expiration; on every protected request it invokes `SessionsService.validateSession(payload.sessionId, payload.sub)` to verify immediately whether the session was revoked or logged out.

### 5.2 Opaque Refresh Tokens

- **Entropy:** 256 bits (32 cryptographically secure random bytes generated via `crypto.randomBytes(32)`).
- **Storage:** Only HMAC-SHA256 hashes (`refreshTokenHash`) are persisted in the database; raw refresh tokens are never stored.
- **Constant-Time Comparison:** Hashed token comparison utilizes `crypto.timingSafeEqual` to eliminate timing side-channel attacks.
- **TTL:** 7 days by default (`REFRESH_TOKEN_TTL_DAYS=7`).

### 5.3 Concurrency-Safe Rotation & Reuse Detection

- **Pessimistic Locking:** Token rotation queries the session table using row-level locking (`pessimistic_write`) to prevent concurrent race conditions.
- **Grace Window:** During rotation, the outgoing token hash is retained in `previousRefreshTokenHash`. If a concurrent request arrives with the previous token during a brief network window, the session remains valid.
- **Replay / Reuse Attack Detection:** If a previously rotated token is presented after the grace window or outside valid rotation, a reuse attack is detected: the session and **all sessions in that `refreshTokenFamily`** are immediately revoked with reason `REUSE_DETECTED`.

### 5.4 Dual Transport Delivery

- **Web Clients:** Refresh tokens are delivered and received via secure `HttpOnly`, `SameSite=Lax`, `Path=/api/v1/auth` cookies.
- **Mobile / Native Clients:** Refresh tokens are also returned in the JSON response body and accepted via `RefreshTokenDto.refreshToken`.

### 5.5 Active Session Concurrency Limit

- Each user is limited to a maximum number of concurrent active sessions (`MAX_ACTIVE_SESSIONS_PER_USER=5`).
- When a new passkey authentication occurs that exceeds the limit, the oldest active session is automatically revoked with `SESSION_LIMIT_EXCEEDED`.

---

## 6. Entity & Database Architecture

### 6.1 User Entity (`users` table)

- `id` (UUID): Primary key generated via `gen_random_uuid()`.
- `email` (varchar 255): Unique, indexed, strictly normalized.
- `status` (`ACTIVE` | `PENDING` | `SUSPENDED`): Account state.
- `email_verified_at` (timestamptz): Nullable verification timestamp.
- `created_at`, `updated_at` (timestamptz): Managed audit timestamps.
- **Security Rule:** No passwords or password hashes exist.

### 6.2 Passkey Credential Entity (`passkey_credentials` table)

- `id` (UUID): Credential record identifier.
- `user_id` (UUID): Foreign key referencing `users(id)` with `ON DELETE CASCADE`.
- `credential_id` (varchar 1024): Base64URL credential ID; globally unique indexed.
- `public_key` (bytea): Binary public key bytes in COSE format.
- `counter` (bigint): Signature counter used to detect cloned authenticators.
- `transports` (text[]): Authenticator transports hint array.
- `device_type`, `backed_up`, `label`, `aaguid`: Device and backup metadata.
- `last_used_at`, `revoked_at` (timestamptz): Credential lifecycle tracking.

### 6.3 Challenge Entity (`auth_challenges` table)

- `id` (UUID): Challenge record identifier.
- `challenge` (varchar 512): Cryptographically secure random challenge string.
- `ceremony_type` (`REGISTRATION` | `AUTHENTICATION`): Strict ceremony binding.
- `user_id` (UUID, nullable): Bound user identity.
- `expires_at`, `consumed_at` (timestamptz): Atomic single-use lifecycle.

### 6.4 Session Entity (`sessions` table)

- `id` (UUID): Session identifier.
- `user_id` (UUID): Foreign key referencing `users(id)` with `ON DELETE CASCADE`.
- `refresh_token_hash` (varchar 255): HMAC-SHA256 hash of active refresh token.
- `previous_refresh_token_hash` (varchar 255, nullable): Hash of previous token for rotation grace period.
- `refresh_token_family` (UUID): Family identifier for tracking reuse attacks.
- `expires_at` (timestamptz): Absolute session expiration timestamp.
- `last_activity_at` (timestamptz): Timestamp of most recent token refresh or request.
- `last_refresh_at` (timestamptz): Timestamp of most recent token rotation.
- `revoked_at` (timestamptz, nullable): Revocation timestamp.
- `revocation_reason` (varchar 64, nullable): Reason (`USER_LOGOUT`, `ALL_SESSIONS_LOGOUT`, `REUSE_DETECTED`, `SESSION_LIMIT_EXCEEDED`).
- `ip_address` (varchar 45, nullable): Client IP.
- `user_agent` (text, nullable): Client User-Agent string.
- `device_label` (varchar 128, nullable): Human-readable device nickname.
- `version` (int): TypeORM optimistic lock version.

---

## 7. Environment Configuration Reference

| Variable                       | Description                       | Default                                   | Allowed Values                         |
| ------------------------------ | --------------------------------- | ----------------------------------------- | -------------------------------------- |
| `PORT`                         | HTTP server listening port        | `3000`                                    | 1–65535                                |
| `NODE_ENV`                     | Environment mode                  | `development`                             | `development`, `production`, `test`    |
| `DATABASE_HOST`                | PostgreSQL hostname               | `localhost`                               | Hostname / IP                          |
| `DATABASE_PORT`                | PostgreSQL port                   | `5432`                                    | 1–65535                                |
| `DATABASE_USER`                | PostgreSQL username               | `postgres`                                | String                                 |
| `DATABASE_PASSWORD`            | PostgreSQL password               | `postgres`                                | String                                 |
| `DATABASE_NAME`                | PostgreSQL database name          | `passkey_auth`                            | String                                 |
| `RP_NAME`                      | WebAuthn Relying Party name       | `Passkey Authentication System`           | Non-empty string                       |
| `RP_ID`                        | WebAuthn Relying Party domain     | `localhost`                               | FQDN or hostname                       |
| `RP_ORIGIN`                    | Allowed WebAuthn origins          | `http://localhost:3000`                   | Comma-delimited URLs                   |
| `CHALLENGE_TTL_MS`             | Challenge lifespan in ms          | `60000` (60s)                             | Positive integer                       |
| `USER_VERIFICATION`            | WebAuthn user verification policy | `preferred`                               | `preferred`, `required`, `discouraged` |
| `JWT_ACCESS_SECRET`            | Secret key for JWT signing        | `dev-jwt-access-secret-min-32-chars-key!` | Min 32 chars                           |
| `JWT_ACCESS_TTL`               | JWT access token lifetime         | `15m`                                     | Time format (`15m`, `1h`)              |
| `JWT_ISSUER`                   | JWT issuer (`iss`) claim          | `passkey-auth-api`                        | String                                 |
| `JWT_AUDIENCE`                 | JWT audience (`aud`) claim        | `passkey-auth-app`                        | String                                 |
| `REFRESH_TOKEN_TTL_DAYS`       | Refresh token lifespan in days    | `7`                                       | Integer (1–90)                         |
| `REFRESH_TOKEN_SECRET`         | Salt key for HMAC-SHA256 hashing  | `dev-refresh-token-hmac-salt-32-chars!`   | Min 32 chars                           |
| `MAX_ACTIVE_SESSIONS_PER_USER` | Concurrent session limit          | `5`                                       | Integer (1–20)                         |
| `COOKIE_NAME`                  | Refresh token cookie name         | `refresh_token`                           | String                                 |
| `COOKIE_SECURE`                | Secure cookie flag                | `false` (dev) / `true` (prod)             | Boolean                                |
| `COOKIE_SAME_SITE`             | SameSite cookie policy            | `lax`                                     | `lax`, `strict`, `none`                |

---

## 8. API Endpoints

### 8.1 Passkey Ceremonies (`/api/v1/auth/passkeys`)

- `POST /api/v1/auth/passkeys/registration/options`: Generate WebAuthn registration options.
- `POST /api/v1/auth/passkeys/registration/verify`: Verify registration attestation and activate user.
- `POST /api/v1/auth/passkeys/authentication/options`: Generate authentication options (discoverable or email-bound).
- `POST /api/v1/auth/passkeys/authentication/verify`: Verify assertion signature, establish session, and issue tokens.

### 8.2 Session & Token Lifecycle (`/api/v1/auth`)

- `POST /api/v1/auth/token/refresh`: Rotate refresh token and issue new JWT access token. Accepts token via HttpOnly cookie or request body.
- `POST /api/v1/auth/logout`: Revoke current session, invalidate refresh token, and clear cookie. (Requires Bearer token).
- `POST /api/v1/auth/logout/all`: Revoke all active sessions for current user across all devices and clear cookie. (Requires Bearer token).
- `GET /api/v1/auth/sessions`: List active and historical sessions for current user with masked metadata (`isCurrent`, `deviceLabel`, `ipAddress`, `lastActivityAt`). (Requires Bearer token).
- `DELETE /api/v1/auth/sessions/:id`: Revoke a specific session belonging to current user. (Requires Bearer token).

---

## 9. Database Migrations

- **1730400000000-CreateIdentityAndPasskeyTables.ts:** Creates `users`, `passkey_credentials`, and `auth_challenges` tables, enums, constraints, and indexes.
- **1730500000000-CreateSessionsTable.ts:** Creates `sessions` table, foreign keys with cascade delete, and performance indexes on `user_id`, `refresh_token_hash`, `previous_refresh_token_hash`, `refresh_token_family`, and `revoked_at`.

---

## 10. Testing Infrastructure (Write-Only per Stages 1–4)

1. **`src/auth/token.service.spec.ts`:**
   - JWT access token generation with claims verification (`sub`, `email`, `sessionId`, `jti`).
   - Signature verification with HS256 enforcement.
   - HMAC-SHA256 refresh token hashing and `timingSafeEqual` comparison.
   - Rejection of expired tokens and malformed signatures.
2. **`src/sessions/sessions.service.spec.ts`:**
   - Session creation with device label parsing and active session limit eviction.
   - Concurrency-safe refresh token rotation.
   - Immediate family-wide session revocation upon refresh token reuse detection.
   - Real-time session validation for guards.
   - Session revocation (single and all user sessions).
3. **`src/auth/guards/jwt-auth.guard.spec.ts`:**
   - Bearer token extraction from headers.
   - Missing/malformed header rejection.
   - Token signature failure rejection.
   - Real-time session status check rejection (detects revoked sessions).
   - Context attachment of `AuthenticatedUser`.
4. **`src/config/configuration.spec.ts`:**
   - Default configuration validation for JWT and session settings.
   - Joi schema validation for production configuration.
   - Rejection of short secrets, invalid TTL formats, and invalid SameSite values.
5. **`test/auth-sessions.e2e-spec.ts`:**
   - HTTP integration tests for token refresh via body and cookie.
   - Token refresh failure and reuse detection.
   - Logout and logout-all endpoints with cookie clearing.
   - Protected session listing and single session deletion.
6. **Existing Suites:**
   - `src/auth/challenge.service.spec.ts`
   - `src/auth/auth.service.spec.ts`
   - `src/auth/auth.controller.spec.ts`
   - `src/common/filters/all-exceptions.filter.spec.ts`
   - `src/health/health.controller.spec.ts`
   - `test/app.e2e-spec.ts`
   - `test/health.e2e-spec.ts`
   - `test/auth-registration.e2e-spec.ts`
   - `test/auth-authentication.e2e-spec.ts`

---

## 11. Explicit Scope Exclusions (Deferred to Stages 4–5)

- **Email verification & account recovery workflows:** Deferred to Stage 4.
- **Fine-grained authentication rate limiting & IP throttling:** Deferred to Stage 4.
- **Production hardening & security headers tuning:** Deferred to Stage 4.
- **Runtime verification & test execution:** Deferred to Stage 5.
