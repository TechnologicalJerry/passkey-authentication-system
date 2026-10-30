# Passkey Authentication System — Backend (`nest-server`)

A production-grade, passwordless authentication backend built with NestJS, TypeScript (ESM), PostgreSQL, and WebAuthn/FIDO2 passkey standards.

---

## 1. Project Purpose

The primary objective is to deliver a secure, scalable, backend-only passwordless authentication service utilizing FIDO2/WebAuthn passkeys. This service replaces traditional passwords with public-key cryptographic credentials stored securely in client authenticators (e.g., biometric sensors, security keys, platform credentials), exposing a versioned REST API.

---

## 2. Technology Stack

- **Runtime:** Node.js 24 LTS
- **Framework:** NestJS (ESM — ECMAScript Modules)
- **Language:** TypeScript 6 (Strict mode, NodeNext resolution)
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
│   ├── app.module.ts           # Root module aggregating infrastructure
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
│   ├── logging/
│   │   └── logging.module.ts   # Pino structured logging module & redaction
│   ├── health/
│   │   ├── health.module.ts    # Health probes module
│   │   ├── health.controller.ts# Liveness & readiness endpoints
│   │   ├── health.service.ts   # Dependency check service (PostgreSQL ping)
│   │   └── health.controller.spec.ts # Health unit tests
│   └── common/
│       ├── constants/          # Application-wide constants & redaction keys
│       ├── types/              # Common interfaces and shared types
│       └── filters/
│           ├── all-exceptions.filter.ts      # Safe exception filter
│           └── all-exceptions.filter.spec.ts # Filter unit tests
└── test/
    ├── app.e2e-spec.ts         # Bootstrap and routing integration tests
    └── health.e2e-spec.ts      # Health probe HTTP integration tests
```

---

## 4. Stage Status Tracker

- **Stage 1 — Foundation & Architecture:** Implementation complete; verification pending.
- **Stage 2 — Identity & Passkey Authentication:** Pending.
- **Stage 3 — Sessions, Tokens & Security:** Pending.
- **Stage 4 — Production Features & Hardening:** Pending.
- **Stage 5 — Testing, Verification & Deployment:** Pending.

- **Completed stages:** 0/5
- **Remaining stages:** 5/5

*Note: Per project rules, Stages 1–4 are implementation-only. All runtime execution, build steps, and test suites are verified in Stage 5.*

---

## 5. Prerequisites

- **Node.js:** v24.x LTS
- **Package Manager:** npm (v10+)
- **Docker Engine & Docker Compose:** For running local PostgreSQL instances

---

## 6. Installation & Environment Setup

### 6.1 Install Dependencies

```bash
npm install
```

### 6.2 Configure Environment Variables

Copy the provided safe template to `.env`:

```bash
cp .env.example .env
```

Review and adjust settings in `.env`:

| Variable | Description | Default | Allowed Values |
|---|---|---|---|
| `NODE_ENV` | Application runtime environment | `development` | `development`, `production`, `test` |
| `PORT` | Listening port | `3000` | `1`–`65535` |
| `API_PREFIX` | Global route prefix | `api` | String |
| `API_VERSION` | Default API version | `1` | String |
| `DATABASE_HOST` | PostgreSQL hostname | `localhost` | String |
| `DATABASE_PORT` | PostgreSQL port | `5432` | `1`–`65535` |
| `DATABASE_USER` | PostgreSQL user | `postgres` | String |
| `DATABASE_PASSWORD` | PostgreSQL password | `postgres` | String |
| `DATABASE_NAME` | PostgreSQL database | `passkey_auth`| String |
| `DATABASE_SSL` | Enable PostgreSQL SSL | `false` | `true`, `false` |
| `DATABASE_URL` | Optional full connection string | *(empty)* | PostgreSQL URI |
| `CORS_ORIGINS` | Comma-delimited allowed origins | `http://localhost:3000` | Comma-separated URLs |
| `LOG_LEVEL` | Pino logging level | `info` | `fatal`, `error`, `warn`, `info`, `debug`, `trace` |
| `SWAGGER_ENABLED` | Enable OpenAPI Swagger docs | `true` in dev, `false` in prod | `true`, `false` |
| `THROTTLE_TTL` | Throttler window in ms | `60000` | Positive integer |
| `THROTTLE_LIMIT` | Max requests per IP in window | `100` | Positive integer |

---

## 7. PostgreSQL Setup & Migrations

### 7.1 Start Local PostgreSQL Service

```bash
docker compose up -d postgres
```

The database container includes persistent volume storage and an automated health check (`pg_isready`).

### 7.2 Database Migration Commands

TypeORM schema synchronization is strictly disabled (`synchronize: false`). All schema changes are applied through migrations:

- **Generate migration from entity changes:**
  ```bash
  npm run migration:generate -- src/database/migrations/MigrationName
  ```
- **Create an empty migration:**
  ```bash
  npm run migration:create -- src/database/migrations/MigrationName
  ```
- **Run pending migrations:**
  ```bash
  npm run migration:run
  ```
- **Revert last applied migration:**
  ```bash
  npm run migration:revert
  ```
- **Drop schema (development/test only):**
  ```bash
  npm run schema:drop
  ```

---

## 8. Development & Build Commands

- **Start in development mode (watch):**
  ```bash
  npm run start:dev
  ```
- **Start in debug mode (watch):**
  ```bash
  npm run start:debug
  ```
- **Build production bundle:**
  ```bash
  npm run build
  ```
- **Run production build:**
  ```bash
  npm run start:prod
  ```

---

## 9. Testing & Code Quality

Vitest is the official test runner for unit and integration testing.

- **Run all unit tests:**
  ```bash
  npm run test
  ```
- **Run unit tests in watch mode:**
  ```bash
  npm run test:watch
  ```
- **Generate test coverage:**
  ```bash
  npm run test:cov
  ```
- **Run HTTP integration / E2E tests:**
  ```bash
  npm run test:e2e
  ```
- **Lint source code:**
  ```bash
  npm run lint
  ```
- **Format code with Prettier:**
  ```bash
  npm run format
  ```

---

## 10. Health Endpoints & Monitoring

Health checks are provided under the `/api/v1/health` namespace:

- **Liveness Probe:** `GET /api/v1/health/live`
  - Verifies that the Node.js process is active and event loop is processing requests.
  - Returns `200 OK` with `status: 'ok'`, process uptime, and ISO timestamp.
- **Readiness Probe:** `GET /api/v1/health/ready`
  - Validates active database connectivity by executing a lightweight `SELECT 1` probe against PostgreSQL.
  - Returns `200 OK` with `status: 'ok'` when database is reachable.
  - Returns `503 Service Unavailable` with `status: 'error'` if database connection is down.
  - Security guarantee: Sanitized output; no internal stack traces, connection strings, or credentials are leaked.

---

## 11. Structured Logging & Security Foundations

### 11.1 Structured Logging (Pino)
- **Production:** Formatted as single-line structured JSON logs for log ingestion systems (Datadog, CloudWatch, Loki).
- **Development:** Coloured, human-friendly output via `pino-pretty`.
- **Automatic Redaction:** Sensitive fields (`authorization`, `cookie`, `password`, `secret`, `token`, `credential`, `clientDataJSON`, `signature`, `privateKey`) are masked automatically with `[REDACTED]`.
- Health check requests are excluded from automatic access logging to avoid log noise.

### 11.2 Security Foundations
- **Helmet:** Sets secure HTTP headers (`X-Frame-Options`, `Content-Security-Policy`, `X-Content-Type-Options`, etc.).
- **CORS:** Origin allowlist configured via `CORS_ORIGINS`. Wildcards (`*`) are disallowed in production mode.
- **Rate Limiting:** Global rate limiting using `@nestjs/throttler` (default: 100 requests / 60 seconds per IP).
- **Global Validation:** Strips unwhitelisted body properties (`whitelist: true`) and rejects payloads with excess attributes (`forbidNonWhitelisted: true`).
- **Safe Error Filter (`AllExceptionsFilter`):** Centralized exception handler prevents internal SQL queries, driver stack traces, or server state from leaking in HTTP responses.
- **OpenAPI / Swagger:** Configured at `/api/docs`; disabled by default in production.
