<div align="center">

# 🔑 Passkey Authentication System

### *Production-Grade, Multi-Framework Passwordless Authentication Ecosystem*

<p align="center">
  <b>Backends:</b><br>
  <a href="#-backend-implementations"><img src="https://img.shields.io/badge/NestJS-12.0_Active-E0234E?style=for-the-badge&logo=nestjs&logoColor=white" alt="NestJS"></a>
  <a href="#-backend-implementations"><img src="https://img.shields.io/badge/Express-Planned-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express"></a>
  <a href="#-backend-implementations"><img src="https://img.shields.io/badge/Fastify-Planned-000000?style=for-the-badge&logo=fastify&logoColor=white" alt="Fastify"></a>
  <a href="#-backend-implementations"><img src="https://img.shields.io/badge/Hono-Planned-E36002?style=for-the-badge&logo=hono&logoColor=white" alt="Hono"></a>
</p>

<p align="center">
  <b>Frontends:</b><br>
  <a href="#-frontend-clients"><img src="https://img.shields.io/badge/Next.js-Planned-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js"></a>
  <a href="#-frontend-clients"><img src="https://img.shields.io/badge/Angular-Planned-DD0031?style=for-the-badge&logo=angular&logoColor=white" alt="Angular"></a>
  <a href="#-frontend-clients"><img src="https://img.shields.io/badge/Vue.js-Planned-4FC08D?style=for-the-badge&logo=vuedotjs&logoColor=white" alt="Vue.js"></a>
</p>

<p align="center">
  <b>Core Standards & Platform:</b><br>
  <img src="https://img.shields.io/badge/WebAuthn-FIDO2_Level_3-6C5CE7?style=flat-square&logo=fido&logoColor=white" alt="WebAuthn">
  <img src="https://img.shields.io/badge/TypeScript-6.0_Strict-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/PostgreSQL-17-4169E1?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/Node.js-24_LTS-339933?style=flat-square&logo=nodedotjs&logoColor=white" alt="Node.js">
  <img src="https://img.shields.io/badge/Vitest-Tested-FCC72B?style=flat-square&logo=vitest&logoColor=black" alt="Vitest">
  <img src="https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker&logoColor=white" alt="Docker">
</p>

<p align="center">
  A high-security, interoperable, polyglot passwordless authentication ecosystem built on <b>W3C WebAuthn / FIDO2 Level 3</b> standards.<br>
  Replaces insecure passwords with asymmetric public-key cryptography backed by platform authenticators (Touch ID, Face ID, Windows Hello) and hardware security keys across multiple backend architectures and modern frontend frameworks.
</p>

<p align="center">
  <a href="#-multi-framework-matrix"><b>Framework Matrix</b></a> •
  <a href="#-why-passkeys"><b>Why Passkeys?</b></a> •
  <a href="#-how-it-works"><b>How It Works</b></a> •
  <a href="#-system-architecture"><b>Architecture</b></a> •
  <a href="#-quick-start"><b>Quick Start</b></a> •
  <a href="#-api-specification"><b>API Docs</b></a> •
  <a href="#-security-architecture"><b>Security Model</b></a>
</p>

---

</div>

## 🌐 Multi-Framework Matrix

This repository serves as the definitive reference implementation for passwordless passkey authentication. Every backend implements the **identical REST API contract and WebAuthn protocol specification**, allowing **any frontend client to pair with any backend server interchangeably** with zero code changes.

### ⚙️ Backend Implementations

| Framework | Directory | Runtime / Language | ORM / Storage | Status | Highlights |
|---|---|---|---|:---:|---|
| **NestJS** | [`nest-server/`](file:///d:/GitHub/passkey-authentication-system/nest-server) | Node.js 24 (ESM), TypeScript | PostgreSQL 17, TypeORM | 🟢 **Active (Production-Ready)** | Modular architecture, DI, TypeORM migrations, Pino logging, Swagger, Vitest, CI |
| **Express** | `express-server/` | Node.js (ESM), TypeScript | PostgreSQL, Drizzle ORM | 🟡 *Planned* | Minimalist, unopinionated, lightweight middleware pipeline |
| **Fastify** | `fastify-server/` | Node.js (ESM), TypeScript | PostgreSQL, Prisma ORM | 🟡 *Planned* | High-performance, schema-based serialization, low overhead |
| **Hono** | `hono-server/` | Multi-runtime (Node / Bun / Cloudflare) | PostgreSQL / Edge KV | 🟡 *Planned* | Ultrafast, web-standards compliant, edge & serverless ready |

### 💻 Frontend Clients

| Framework | Directory | Tech Stack | WebAuthn Integration | Status | Highlights |
|---|---|---|---|:---:|---|
| **Angular** | [`angular-client/`](file:///d:/GitHub/passkey-authentication-system/angular-client) | Angular 22 LTS, Signals, Tailwind CSS v4 | `@simplewebauthn/browser` | 🟢 **Active (Production-Ready)** | 100% Standalone, Signals state, functional interceptor & refresh queue, SSR safe |
| **Next.js** | `next-client/` | React 19, Next.js App Router, Tailwind CSS | `@simplewebauthn/browser` | 🟡 *Planned* | Server components, autofill biometrics, cookie auth |
| **Vue.js** | `vue-client/` | Vue 3, Composition API, Pinia, Vite | `@simplewebauthn/browser` | 🟡 *Planned* | Lightweight reactive UI, composables for passkeys |

> [!TIP]
> **Interoperability Guarantee:** Because all backends conform strictly to the standardized OpenAPI 3.0 specification (`/api/v1/auth/passkeys/*` and `/api/v1/auth/*`), you can switch your backend from **NestJS** to **Fastify**, **Express**, or **Hono** without altering a single line of frontend code in **Next.js**, **Angular**, or **Vue.js**.

---

## 💡 Why Passkeys?

Traditional password systems are the leading cause of security breaches due to phishing, brute-force attacks, credential stuffing, and server database leaks. Passkeys eliminate shared secrets entirely by leveraging **public-key cryptography** anchored to the client's secure hardware.

| Threat / Feature | Traditional Passwords | Passkey Authentication System |
|---|---|---|
| **Phishing Resistance** | ❌ Highly vulnerable | ✅ **Immune** (bound cryptographically to origin/RP ID) |
| **Credential Storage** | ❌ Stored hashes vulnerable to leaks | ✅ **Zero server secrets** (only public keys stored) |
| **Brute-Force & Stuffing** | ❌ Constant risk | ✅ **Mathematically impossible** (256-bit ECDSA/RSA) |
| **Authenticator Cloning** | ❌ Easy (reused passwords) | ✅ **Detected** via monotonic signature counters |
| **User Experience** | ❌ Forgotten passwords & resets | ✅ **1-Click biometric** (Face ID, Touch ID, Windows Hello) |

---

## ✨ Key System Features

- 🛡️ **W3C WebAuthn & FIDO2 Level 3 Compliance:** Attestation and assertion ceremonies validated with `@simplewebauthn/server`.
- 🔐 **Zero Password Footprint:** The application schema contains no password fields, hashes, salts, or reset tokens.
- ⚡ **Enterprise Token Architecture:**
  - **Short-Lived JWT Access Tokens:** 15-minute TTL, pinned to `HS256`, strictly verified for audience (`aud`) and issuer (`iss`).
  - **Opaque Refresh Tokens:** 256-bit cryptographic entropy (`crypto.randomBytes(32)`), stored exclusively as salted **HMAC-SHA256 hashes**.
- 🔄 **Concurrency-Safe Token Rotation:** Database row-level locking (`pessimistic_write`) prevents race conditions during token rotation.
- ⏱️ **Rotation Grace Period:** Supports rapid, concurrent network retries without failing in-flight requests.
- 🚨 **Token Replay / Reuse Detection:** Replaying a previously rotated token triggers instant revocation of the compromised session and its entire **token family**.
- 🚫 **Real-Time Revocation:** Session-aware guards check database session validity in real time—logouts and administrative revocations take effect immediately.
- 🍪 **Dual Transport Support:** Secure, cross-site-isolated `HttpOnly` cookies for modern web browsers alongside JSON body transport for mobile and native apps.
- 📱 **Active Session Management:** Per-user concurrent session limits (`MAX_ACTIVE_SESSIONS_PER_USER`) with automated oldest-session eviction.
- 🔍 **Strict Observability:** Structured Pino logging with automatic redaction of cookies, tokens, authorization headers, and challenge payloads.

---

## 🔄 How It Works

### 1. Passkey Registration Ceremony

```mermaid
sequenceDiagram
    autonumber
    actor User as User / Browser
    participant Client as Frontend (Next / Angular / Vue)
    participant Auth as Backend (Nest / Express / Fastify / Hono)
    participant DB as PostgreSQL Database

    User->>Client: Initiate Enrollment (email)
    Client->>Auth: POST /api/v1/auth/passkeys/registration/options
    Auth->>DB: Create User (PENDING) & Persist Single-Use Challenge
    Auth-->>Client: PublicKeyCredentialCreationOptions + challengeId
    Client->>User: Prompt Biometric / Security Key
    User-->>Client: Consent & Generate Asymmetric Keypair
    Client->>Auth: POST /api/v1/auth/passkeys/registration/verify (Attestation Response)
    Auth->>DB: Atomically Consume Challenge (Replay Guard)
    Auth->>Auth: Cryptographically Verify Attestation Signature
    Auth->>DB: Save Public Key (COSE), Counter, & Activate User
    Auth-->>Client: 200 OK (Registration Verified)
```

### 2. Passkey Authentication & Token Issuance

```mermaid
sequenceDiagram
    autonumber
    actor User as User / Browser
    participant Client as Frontend (Next / Angular / Vue)
    participant Auth as Backend (Nest / Express / Fastify / Hono)
    participant DB as PostgreSQL Database

    User->>Client: Initiate Login (Discoverable / 1-Click)
    Client->>Auth: POST /api/v1/auth/passkeys/authentication/options
    Auth->>DB: Generate & Persist Single-Use Challenge
    Auth-->>Client: PublicKeyCredentialRequestOptions + challengeId
    Client->>User: Prompt Touch ID / Face ID / Windows Hello
    User-->>Client: Authenticate & Sign Challenge with Private Key
    Client->>Auth: POST /api/v1/auth/passkeys/authentication/verify (Assertion Response)
    Auth->>DB: Atomically Consume Challenge
    Auth->>Auth: Verify Signature with Stored Public Key & Check Counter
    Auth->>DB: Create Session & Evict Oldest if Session Limit Exceeded
    Auth->>Auth: Generate Short-Lived JWT & Raw Refresh Token
    Auth->>DB: Persist HMAC-SHA256 Hash of Refresh Token
    Auth-->>Client: 200 OK (JWT Access Token + Secure HttpOnly Cookie)
```

### 3. Concurrency-Safe Refresh Token Rotation & Replay Defense

```mermaid
flowchart TD
    Req["POST /api/v1/auth/token/refresh<br><b>(Raw Refresh Token)</b>"] --> Lock["Acquire Row-Level Lock<br><code>pessimistic_write</code> on Session"]
    Lock --> CheckHash{"Matches Active<br><code>refreshTokenHash</code>?"}
    
    CheckHash -- Yes --> Rotate["1. Generate New Refresh Token<br>2. Move Current Hash to <code>previousRefreshTokenHash</code><br>3. Save New Hash & Issue Fresh JWT"]
    Rotate --> Success["200 OK<br>New JWT & Updated Cookie"]

    CheckHash -- No --> CheckPrev{"Matches<br><code>previousRefreshTokenHash</code><br>within Grace Window?"}
    
    CheckPrev -- "Yes (Concurrent Retry)" --> Grace["Return Previous Issued Tokens<br>(Safe Concurrent Idempotency)"]
    
    CheckPrev -- "No (Token Stolen / Reused)" --> Revoke["🚨 <b>Replay Attack Detected!</b><br>1. Immediately Revoke Session<br>2. Revoke All Sessions in <b>RefreshTokenFamily</b><br>3. Log Security Incident"]
    Revoke --> Deny["401 Unauthorized<br>Session Terminated"]
```

---

## 🏗️ Monorepo & Directory Structure

```
passkey-authentication-system/
│
├── nest-server/                         # [ACTIVE] NestJS 12 Flagship Backend
│   ├── src/
│   │   ├── auth/                        # WebAuthn ceremonies, token service, guards
│   │   ├── sessions/                    # Session lifecycle, rotation, revocation
│   │   ├── users/                       # Identity entity & user service
│   │   ├── passkeys/                    # Passkey credential entity & counters
│   │   ├── database/                    # TypeORM DataSource & versioned SQL migrations
│   │   ├── health/                      # Liveness & PostgreSQL readiness probes
│   │   ├── logging/                     # Pino structured logger with redaction
│   │   ├── common/                      # Constants, DTOs, interfaces & filters
│   │   ├── config/                      # Joi-validated environment configuration
│   │   ├── app.module.ts                # Application root aggregator
│   │   └── main.ts                      # Bootstrap, security headers, cookies & Swagger
│   ├── test/                            # E2E test suites (Supertest & Vitest)
│   ├── Dockerfile                       # Production multi-stage Docker build
│   └── docker-compose.yml               # PostgreSQL 17 database service
│
├── express-server/                      # [PLANNED] Express + TypeScript Backend
│   └── ...                              # Minimalist reference implementation
│
├── fastify-server/                      # [PLANNED] Fastify + TypeScript Backend
│   └── ...                              # Low-overhead, high-throughput implementation
│
├── hono-server/                         # [PLANNED] Hono Multi-Runtime Backend
│   └── ...                              # Edge & serverless implementation
│
├── next-client/                         # [PLANNED] Next.js 15 App Router Frontend
│   └── ...                              # React 19, Tailwind CSS, Biometric UI
│
├── angular-client/                      # [PLANNED] Angular 19+ Frontend
│   └── ...                              # Standalone components, Signals, RxJS
│
├── vue-client/                          # [PLANNED] Vue 3 Frontend
│   └── ...                              # Composition API, Pinia, Vite
│
├── LICENSE                              # Project License
└── README.md                            # Ecosystem Entry Point (this file)
```

---

## 📡 Standardized API Specification

All backend implementations adhere to this versioned `/api/v1` contract. Interactive Swagger / OpenAPI 3.0 documentation is served at `/api/docs`.

### Authentication & Passkey Ceremonies

| Method | Endpoint | Auth | Description |
|---|---|:---:|---|
| `POST` | `/api/v1/auth/passkeys/registration/options` | Public | Generates WebAuthn registration challenge & options |
| `POST` | `/api/v1/auth/passkeys/registration/verify` | Public | Verifies authenticator attestation and registers passkey |
| `POST` | `/api/v1/auth/passkeys/authentication/options` | Public | Generates assertion challenge (supports discoverable credentials) |
| `POST` | `/api/v1/auth/passkeys/authentication/verify` | Public | Verifies assertion signature, creates session, returns tokens |

### User Account Lifecycle

| Method | Endpoint | Auth | Description |
|---|---|:---:|---|
| `GET` | `/api/v1/users/me` | `Bearer <JWT>` | Retrieves the authenticated user profile |
| `PATCH` | `/api/v1/users/me` | `Bearer <JWT>` | Updates permitted profile fields (e.g. `displayName`) |
| `POST` | `/api/v1/users/me/deactivate` | `Bearer <JWT>` | Suspends account and immediately revokes all active sessions |
| `DELETE` | `/api/v1/users/me` | `Bearer <JWT>` | Executes account deletion/anonymization policy |
| `GET` | `/api/v1/users/me/audit-logs` | `Bearer <JWT>` | Retrieves paginated security audit history for current user |

### Passkey & Credential Management

| Method | Endpoint | Auth | Description |
|---|---|:---:|---|
| `GET` | `/api/v1/passkeys` | `Bearer <JWT>` | Lists user registered passkeys with safe metadata (no keys) |
| `POST` | `/api/v1/passkeys/registration/options` | `Bearer <JWT>` | Generates options for adding an additional passkey |
| `PATCH` | `/api/v1/passkeys/:id` | `Bearer <JWT>` | Renames user-defined device label of a specific passkey |
| `DELETE` | `/api/v1/passkeys/:id` | `Bearer <JWT>` | Revokes passkey (**Lockout Protection:** Rejects deleting last active key) |

### Session & Token Management

| Method | Endpoint | Auth | Description |
|---|---|:---:|---|
| `POST` | `/api/v1/auth/token/refresh` | Public | Rotates refresh token (cookie or body) and returns new JWT |
| `POST` | `/api/v1/auth/logout` | `Bearer <JWT>` | Revokes current session and clears refresh token cookie |
| `POST` | `/api/v1/auth/logout/all` | `Bearer <JWT>` | Revokes all active sessions across all devices for user |
| `GET` | `/api/v1/auth/sessions` | `Bearer <JWT>` | Lists user sessions with `isCurrent` flag and safe metadata |
| `DELETE` | `/api/v1/auth/sessions/:id` | `Bearer <JWT>` | Revokes a specific active session by UUID |

### System Health Probes

| Method | Endpoint | Auth | Description |
|---|---|:---:|---|
| `GET` | `/api/v1/health/live` | Public | Liveness probe returning process uptime and timestamp |
| `GET` | `/api/v1/health/ready` | Public | Readiness probe checking live PostgreSQL database connectivity |

<details>
<summary><b>🔍 Click to view Sample Payloads & Schemas</b></summary>

#### 1. Registration Options Request
```json
POST /api/v1/auth/passkeys/registration/options
Content-Type: application/json

{
  "email": "alice@example.com",
  "displayName": "Alice Smith"
}
```

#### 2. Authentication Verification Response (Success)
```json
HTTP/1.1 200 OK
Set-Cookie: refresh_token=e4c7...; Path=/api/v1/auth; HttpOnly; SameSite=Lax

{
  "verified": true,
  "user": {
    "id": "c1f7b494-0131-4e78-9b87-d4fa7df76f1a",
    "email": "alice@example.com",
    "status": "ACTIVE",
    "emailVerified": false,
    "createdAt": "2026-11-01T20:00:00.000Z"
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "e4c79872e48fa2409581...",
    "expiresIn": 900,
    "tokenType": "Bearer"
  }
}
```

#### 3. List Active Sessions Response
```json
GET /api/v1/auth/sessions
Authorization: Bearer <accessToken>

[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "isCurrent": true,
    "deviceLabel": "Chrome on macOS",
    "ipAddress": "192.168.1.100",
    "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...",
    "createdAt": "2026-11-01T21:00:00.000Z",
    "lastActivityAt": "2026-11-01T21:15:00.000Z",
    "expiresAt": "2026-11-08T21:00:00.000Z",
    "isRevoked": false
  }
]
```
</details>

---

## 🚀 Quick Start (NestJS Reference Backend)

### Prerequisites
- **Node.js:** v24.x LTS or higher
- **Package Manager:** npm (v10+)
- **Container Engine:** Docker & Docker Compose

### 1. Clone & Setup Workspace
```bash
git clone https://github.com/your-username/passkey-authentication-system.git
cd passkey-authentication-system/nest-server
```

### 2. Configure Environment
```bash
cp .env.example .env
```
> [!NOTE]
> The pre-filled values in `.env.example` are immediately functional for local development.

### 3. Start PostgreSQL Container
```bash
docker compose up -d
```

### 4. Install Dependencies
```bash
npm install
```

### 5. Run Database Migrations
```bash
npm run migration:run
```

### 6. Launch the Development Server
```bash
npm run start:dev
```

The API will be operational at:
- **Base URL:** `http://localhost:3000`
- **Swagger Documentation:** `http://localhost:3000/api/docs`
- **Health Check:** `http://localhost:3000/api/v1/health/ready`

---

## 🔒 Security Architecture

The system incorporates defense-in-depth principles across every architectural layer:

```
[ Client Request ]
       │
       ▼
┌──────────────────────────────────────────────┐
│  Helmet Security Headers (CSP, HSTS, Sniff)  │
└──────────────────────┬───────────────────────┘
                       ▼
┌──────────────────────────────────────────────┐
│  Throttler Rate Limiting (Brute-Force Guard) │
└──────────────────────┬───────────────────────┘
                       ▼
┌──────────────────────────────────────────────┐
│  CORS Origin Whitelist Validation            │
└──────────────────────┬───────────────────────┘
                       ▼
┌──────────────────────────────────────────────┐
│  Global ValidationPipe (Whitelist & DTOs)    │
└──────────────────────┬───────────────────────┘
                       ▼
┌──────────────────────────────────────────────┐
│  JwtAuthGuard (Real-Time Revocation Check)   │
└──────────────────────┬───────────────────────┘
                       ▼
┌──────────────────────────────────────────────┐
│  TypeORM Transaction (Row-Level Locking)     │
└──────────────────────────────────────────────┘
```

1. **Private Keys Never Leave Authenticators:** Only public keys in COSE format are stored on the server.
2. **Monotonic Counter Verification:** Detects authenticator cloning by verifying signature counters on each assertion ceremony.
3. **HMAC-SHA256 Token Vaulting:** Refresh tokens are never stored raw. A database breach reveals only one-way HMAC hashes.
4. **Timing Attack Immunity:** Hash validation uses Node.js `crypto.timingSafeEqual` across constant-length buffers.
5. **Session Family Revocation:** Detecting an attempt to reuse a rotated token revokes the entire family across all associated devices.
6. **Automatic Sensitive Log Redaction:** Authorization headers, tokens, cookies, and challenges are scrubbed (`[REDACTED]`) before logs reach stdout.

---

## ⚙️ Environment Variables Reference

| Variable | Description | Default | Allowed Values |
|---|---|---|---|
| `PORT` | HTTP port | `3000` | 1–65535 |
| `NODE_ENV` | Environment mode | `development` | `development`, `production`, `test` |
| `DATABASE_HOST` | PostgreSQL host | `localhost` | Hostname / IP |
| `DATABASE_PORT` | PostgreSQL port | `5432` | 1–65535 |
| `DATABASE_NAME` | Database name | `passkey_auth` | String |
| `RP_NAME` | WebAuthn Relying Party name | `Passkey Authentication System` | Non-empty string |
| `RP_ID` | WebAuthn Relying Party domain | `localhost` | FQDN or hostname |
| `RP_ORIGIN` | Allowed WebAuthn origins | `http://localhost:3000` | Comma-delimited URLs |
| `CHALLENGE_TTL_MS` | Challenge lifespan in ms | `60000` (60s) | Positive integer |
| `USER_VERIFICATION` | User verification policy | `preferred` | `preferred`, `required`, `discouraged` |
| `JWT_ACCESS_SECRET` | Secret for signing JWTs | `dev-jwt-access-secret...` | Min 32 chars |
| `JWT_ACCESS_TTL` | Access token lifespan | `15m` | Time format (`15m`, `1h`) |
| `REFRESH_TOKEN_TTL_DAYS` | Refresh token lifespan | `7` | Integer (1–90) |
| `REFRESH_TOKEN_SECRET` | HMAC salt for refresh tokens | `dev-refresh-token-hmac...` | Min 32 chars |
| `MAX_ACTIVE_SESSIONS_PER_USER` | Concurrent session cap | `5` | Integer (1–20) |
| `COOKIE_NAME` | Refresh cookie identifier | `refresh_token` | String |
| `COOKIE_SECURE` | HTTPS-only cookie flag | `false` (dev) / `true` (prod) | Boolean |
| `COOKIE_SAME_SITE` | SameSite cookie policy | `lax` | `lax`, `strict`, `none` |

---

## 📈 Multi-Framework Project Roadmap

```mermaid
flowchart LR
    subgraph Phase1 ["Phase 1: NestJS Core Backend"]
        N1["Stage 1: Foundation"] --> N2["Stage 2: Passkeys"]
        N2 --> N3["Stage 3: Sessions & Tokens"]
        N3 --> N4["Stage 4: Hardening"]
        N4 --> N5["Stage 5: Verification"]
    end

    subgraph Phase2 ["Phase 2: Polyglot Backends"]
        EX["Express Backend"]
        FA["Fastify Backend"]
        HO["Hono Backend"]
    end

    subgraph Phase3 ["Phase 3: Polyglot Frontends"]
        NX["Next.js App"]
        AN["Angular App"]
        VU["Vue.js App"]
    end

    Phase1 ==> Phase2
    Phase1 ==> Phase3
```

- [x] **NestJS Reference Backend (In Progress)**
  - [x] Stage 1: Foundation & Architecture (ESM, NestJS 12, PostgreSQL 17, TypeORM, Pino, Health Probes)
  - [x] Stage 2: Identity & Passkey Authentication (WebAuthn, `@simplewebauthn/server`, Challenges, Public Keys)
  - [x] Stage 3: Sessions, Tokens & Security (JWTs, Rotatable Refresh Tokens, Replay Defense, Real-Time Revocation)
  - [x] Stage 4: Production Features & Hardening (Profile management, auth rate limiting, security headers)
  - [ ] Stage 5: Testing, Verification & Deployment (Automated end-to-end verification, production build)
- [ ] **Express Backend Implementation (`express-server/`)**
- [ ] **Fastify Backend Implementation (`fastify-server/`)**
- [ ] **Hono Multi-Runtime Backend (`hono-server/`)**
- [ ] **Next.js Frontend Client (`next-client/`)**
- [ ] **Angular Frontend Client (`angular-client/`)**
- [ ] **Vue.js Frontend Client (`vue-client/`)**

---

## 📄 License

This project is licensed under the terms described in the [LICENSE](LICENSE) file.

<div align="center">
  <sub>Built with ❤️ for modern passwordless application security across frameworks.</sub>
</div>
