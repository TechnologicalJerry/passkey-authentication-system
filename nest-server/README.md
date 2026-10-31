# Passkey Authentication System — Backend (`nest-server`)

A production-grade, passwordless authentication backend built with NestJS, TypeScript (ESM), PostgreSQL, and WebAuthn/FIDO2 passkey standards.

---

## 1. Project Purpose

The primary objective is to deliver a secure, scalable, backend-only passwordless authentication service utilizing FIDO2/WebAuthn passkeys. This service replaces traditional passwords with public-key cryptographic credentials stored securely in client authenticators (e.g., biometric sensors, platform authenticators, hardware security keys), exposing a versioned REST API.

---

## 2. Technology Stack

- **Runtime:** Node.js 24 LTS
- **Framework:** NestJS (ESM — ECMAScript Modules)
- **Language:** TypeScript 6 (Strict mode, NodeNext resolution)
- **WebAuthn / FIDO2:** `@simplewebauthn/server`
- **Database & ORM:** PostgreSQL 17 with TypeORM 0.3.x
- **Configuration & Validation:** `@nestjs/config`, Joi, `class-validator`, `class-transformer`
- **Security:** Helmet, `@nestjs/throttler`, explicit CORS allowlists, safe error masking
- **Structured Logging:** Pino, `nestjs-pino`, `pino-pretty` (local dev)
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
│   ├── main.ts                 # Application bootstrap & global pipeline
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
│   │       └── 1730400000000-CreateIdentityAndPasskeyTables.ts
│   ├── logging/
│   │   └── logging.module.ts   # Pino structured logging module & redaction
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
│   ├── auth/
│   │   ├── auth.module.ts      # Passkey authentication module
│   │   ├── auth.controller.ts  # Registration & authentication ceremony endpoints
│   │   ├── auth.service.ts     # WebAuthn ceremony business logic & validation
│   │   ├── challenge.service.ts# Atomic challenge persistence and lifecycle service
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
    ├── app.e2e-spec.ts               # Bootstrap and routing integration tests
    ├── health.e2e-spec.ts            # Health probe HTTP integration tests
    ├── auth-registration.e2e-spec.ts # Passkey registration ceremony integration tests
    └── auth-authentication.e2e-spec.ts # Passkey authentication ceremony integration tests
```

---

## 4. Stage Status Tracker

- **Stage 1 — Foundation & Architecture:** Implementation complete; verification pending.
- **Stage 2 — Identity & Passkey Authentication:** Implementation complete; verification pending.
- **Stage 3 — Sessions, Tokens & Security:** Pending.
- **Stage 4 — Production Features & Hardening:** Pending.
- **Stage 5 — Testing, Verification & Deployment:** Pending.

- **Completed stages:** 2/5 (implementation completed)
- **Remaining stages:** 3/5

*Note: Per project rules, Stages 1–4 are implementation-only. All runtime execution, build steps, and test suites are verified in Stage 5.*

---

## 5. User Identity & Passkey Credential Models

### 5.1 User Entity (`users` table)
- `id` (UUID): Primary key generated via `gen_random_uuid()`.
- `email` (varchar 255): Unique, indexed, strictly normalized (trimmed, lowercased).
- `status` (`ACTIVE` | `PENDING` | `SUSPENDED`): Account state. Initialized as `PENDING` upon options generation, transitioned to `ACTIVE` upon successful credential registration.
- `email_verified_at` (timestamptz): Nullable verification timestamp.
- `created_at`, `updated_at` (timestamptz): Managed audit timestamps.
- **Security Rule:** No passwords or password hashes are stored in the database.

### 5.2 Passkey Credential Entity (`passkey_credentials` table)
- `id` (UUID): Internal credential record identifier.
- `user_id` (UUID): Foreign key referencing `users(id)` with `ON DELETE CASCADE`.
- `credential_id` (varchar 1024): Base64URL credential ID issued by the authenticator; globally unique indexed.
- `public_key` (bytea): Binary public key bytes in COSE format.
- `counter` (bigint): Signature counter used to detect cloned authenticators.
- `transports` (text[]): Authenticator transports hint array (e.g. `internal`, `hybrid`, `usb`).
- `device_type` (varchar 64): `singleDevice` or `multiDevice` credential metadata.
- `backed_up` (boolean): Backup state flag reported by authenticator.
- `label` (varchar 128): Optional human-readable nickname for the passkey.
- `aaguid` (varchar 64): Authenticator Attestation GUID.
- `last_used_at` (timestamptz): Timestamp of most recent authentication ceremony.
- `revoked_at` (timestamptz): Nullable revocation timestamp.
- **Security Rule:** No private keys are ever stored on the server.

### 5.3 Challenge Entity & Lifecycle (`auth_challenges` table)
- `id` (UUID): Challenge record identifier.
- `challenge` (varchar 512): Cryptographically secure random challenge string.
- `ceremony_type` (`REGISTRATION` | `AUTHENTICATION`): Strict ceremony binding.
- `user_id` (UUID, nullable): Bound user identity (required for registration, optional for discoverable authentication).
- `expires_at` (timestamptz): Bounded expiration deadline (default: 60s).
- `consumed_at` (timestamptz, nullable): Timestamp of consumption.
- **Replay Protection:** Challenges are consumed atomically within a database transaction using a conditional update:
  `WHERE id = :id AND ceremony_type = :ceremony AND consumed_at IS NULL AND expires_at > NOW()`. Any attempt to reuse, replay, or execute with an expired challenge fails immediately.

---

## 6. WebAuthn Configuration & Environment Variables

| Variable | Description | Default | Allowed Values |
|---|---|---|---|
| `RP_NAME` | Relying Party display name | `Passkey Authentication System` | Non-empty string |
| `RP_ID` | Relying Party domain identifier | `localhost` | FQDN or hostname |
| `RP_ORIGIN` | Allowed WebAuthn frontend origins | `http://localhost:3000,http://localhost:3001` | Comma-delimited URLs |
| `CHALLENGE_TTL_MS` | Challenge lifespan in milliseconds | `60000` (60s) | Positive integer |
| `USER_VERIFICATION` | User verification policy | `preferred` | `preferred`, `required`, `discouraged` |

---

## 7. Passkey API Endpoints & Workflows

### 7.1 Registration Ceremony

1. **`POST /api/v1/auth/passkeys/registration/options`**
   - **Request Body:**
     ```json
     {
       "email": "alice@example.com",
       "displayName": "Alice Smith"
     }
     ```
   - **Enrollment Boundary Protection:**
     - If the account does not exist, a new user record in `PENDING` status is created.
     - If the account exists and already has active passkeys, the request is rejected with `409 Conflict` to prevent unauthenticated credential injection or account takeover.
   - **Response Body (`200 OK`):**
     ```json
     {
       "challengeId": "uuid-v4",
       "options": {
         "rp": { "name": "Passkey Authentication System", "id": "localhost" },
         "user": { "id": "...", "name": "alice@example.com", "displayName": "Alice Smith" },
         "challenge": "base64url-challenge",
         "pubKeyCredParams": [{ "alg": -7, "type": "public-key" }, { "alg": -257, "type": "public-key" }],
         "authenticatorSelection": { "residentKey": "preferred", "userVerification": "preferred" }
       }
     }
     ```

2. **`POST /api/v1/auth/passkeys/registration/verify`**
   - **Request Body:**
     ```json
     {
       "challengeId": "uuid-v4",
       "response": {
         "id": "credential-id-base64url",
         "rawId": "credential-id-base64url",
         "type": "public-key",
         "response": {
           "clientDataJSON": "...",
           "attestationObject": "...",
           "transports": ["internal", "hybrid"]
         }
       },
       "label": "MacBook Touch ID"
     }
     ```
   - **Validation & Persistence:**
     - Challenge is consumed atomically inside a database transaction.
     - Attestation response is verified with `@simplewebauthn/server`.
     - Credential ID uniqueness is verified.
     - Public key bytes (`bytea`) and metadata are stored.
     - User is transitioned to `ACTIVE`.
   - **Response Body (`200 OK`):**
     ```json
     {
       "verified": true,
       "user": {
         "id": "uuid-v4",
         "email": "alice@example.com",
         "status": "ACTIVE",
         "emailVerified": false,
         "createdAt": "2026-10-31T20:00:00.000Z"
       }
     }
     ```

### 7.2 Authentication Ceremony

1. **`POST /api/v1/auth/passkeys/authentication/options`**
   - **Request Body (Discoverable / Autofill):**
     ```json
     {}
     ```
   - **Request Body (Account-Specific):**
     ```json
     {
       "email": "alice@example.com"
     }
     ```
   - **Response Body (`200 OK`):**
     ```json
     {
       "challengeId": "uuid-v4",
       "options": {
         "rpId": "localhost",
         "challenge": "base64url-challenge",
         "allowCredentials": [{ "id": "credential-id-base64url", "transports": ["internal"] }],
         "userVerification": "preferred"
       }
     }
     ```

2. **`POST /api/v1/auth/passkeys/authentication/verify`**
   - **Request Body:**
     ```json
     {
       "challengeId": "uuid-v4",
       "response": {
         "id": "credential-id-base64url",
         "rawId": "credential-id-base64url",
         "type": "public-key",
         "response": {
           "clientDataJSON": "...",
           "authenticatorData": "...",
           "signature": "...",
           "userHandle": "..."
         }
       }
     }
     ```
   - **Verification & Counter Update:**
     - Challenge is consumed atomically within a transaction.
     - Credential is retrieved by ID; status verified as active.
     - Assertion signature is cryptographically validated with `@simplewebauthn/server`.
     - Signature counter is validated (detects authenticator cloning) and updated with `last_used_at`.
   - **Response Body (`200 OK`):**
     ```json
     {
       "verified": true,
       "user": {
         "id": "uuid-v4",
         "email": "alice@example.com",
         "status": "ACTIVE",
         "emailVerified": false,
         "createdAt": "2026-10-31T20:00:00.000Z"
       }
     }
     ```

---

## 8. Database Migrations

- **Migration File:** `src/database/migrations/1730400000000-CreateIdentityAndPasskeyTables.ts`
- **Tables Created:** `users`, `passkey_credentials`, `auth_challenges`.
- **Enums Created:** `users_status_enum`, `auth_challenges_ceremonytype_enum`.
- **Foreign Keys:**
  - `fk_passkey_credentials_user`: `passkey_credentials(user_id) -> users(id)` (ON DELETE CASCADE)
  - `fk_auth_challenges_user`: `auth_challenges(user_id) -> users(id)` (ON DELETE CASCADE)
- **Indexes:**
  - `idx_users_email` (unique)
  - `idx_users_status`
  - `idx_passkey_credentials_credential_id` (unique)
  - `idx_passkey_credentials_user_id`
  - `idx_passkey_credentials_user_revoked`
  - `idx_auth_challenges_challenge` (unique)
  - `idx_auth_challenges_user_id`
  - `idx_auth_challenges_expires_at`
  - `idx_auth_challenges_consumed_at`

---

## 9. Testing Infrastructure (Stage 2 Additions)

The following test suites were created for Stage 2 (execution deferred to Stage 5):

1. **`src/auth/challenge.service.spec.ts`:**
   - Challenge generation with TTL calculation.
   - Atomic challenge consumption via conditional update.
   - Ceremony mismatch rejection.
   - Replay prevention on already-consumed challenges.
   - Expiration validation.
2. **`src/auth/auth.service.spec.ts`:**
   - Registration options generation and pending user creation.
   - Conflict rejection on existing accounts with registered credentials.
   - Discoverable vs. account-specific authentication options.
   - Signature validation delegation and counter updates.
3. **`src/auth/auth.controller.spec.ts`:**
   - Controller delegation and DTO mapping.
4. **`test/auth-registration.e2e-spec.ts`:**
   - HTTP integration tests for registration options and verify endpoints.
   - Strict validation pipe checks (rejecting non-whitelisted properties and invalid UUIDs).
5. **`test/auth-authentication.e2e-spec.ts`:**
   - HTTP integration tests for authentication options and assertion verification.

---

## 10. Explicit Scope Exclusions (Deferred to Stages 3–5)

- **JWT access tokens & refresh tokens:** Deferred to Stage 3.
- **Server-side session management:** Deferred to Stage 3.
- **Session revocation & logout:** Deferred to Stage 3.
- **Email verification workflows:** Deferred to Stage 4.
- **Rate-limiting tuning for authentication:** Generic rate limiting is active; authentication-specific rate limits will be configured in Stage 3/4.
- **Runtime verification:** All tests, builds, and migrations will be executed during Stage 5.
