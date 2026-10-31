import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateIdentityAndPasskeyTables1730400000000 implements MigrationInterface {
  name = 'CreateIdentityAndPasskeyTables1730400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create Enums
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "users_status_enum" AS ENUM ('ACTIVE', 'PENDING', 'SUSPENDED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "auth_challenges_ceremonytype_enum" AS ENUM ('REGISTRATION', 'AUTHENTICATION');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // 2. Create Users Table
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "email" character varying(255) NOT NULL,
        "status" "users_status_enum" NOT NULL DEFAULT 'ACTIVE',
        "email_verified_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "pk_users" PRIMARY KEY ("id")
      );
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_users_email" ON "users" ("email");
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_users_status" ON "users" ("status");
    `);

    // 3. Create Passkey Credentials Table
    await queryRunner.query(`
      CREATE TABLE "passkey_credentials" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "credential_id" character varying(1024) NOT NULL,
        "public_key" bytea NOT NULL,
        "counter" bigint NOT NULL DEFAULT 0,
        "transports" text[],
        "device_type" character varying(64),
        "backed_up" boolean NOT NULL DEFAULT false,
        "label" character varying(128),
        "aaguid" character varying(64),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "last_used_at" TIMESTAMP WITH TIME ZONE,
        "revoked_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "pk_passkey_credentials" PRIMARY KEY ("id"),
        CONSTRAINT "fk_passkey_credentials_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_passkey_credentials_credential_id" ON "passkey_credentials" ("credential_id");
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_passkey_credentials_user_id" ON "passkey_credentials" ("user_id");
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_passkey_credentials_user_revoked" ON "passkey_credentials" ("user_id", "revoked_at");
    `);

    // 4. Create Auth Challenges Table
    await queryRunner.query(`
      CREATE TABLE "auth_challenges" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "challenge" character varying(512) NOT NULL,
        "ceremony_type" "auth_challenges_ceremonytype_enum" NOT NULL,
        "user_id" uuid,
        "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "consumed_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "pk_auth_challenges" PRIMARY KEY ("id"),
        CONSTRAINT "fk_auth_challenges_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_auth_challenges_challenge" ON "auth_challenges" ("challenge");
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_auth_challenges_user_id" ON "auth_challenges" ("user_id");
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_auth_challenges_expires_at" ON "auth_challenges" ("expires_at");
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_auth_challenges_consumed_at" ON "auth_challenges" ("consumed_at");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "auth_challenges" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "passkey_credentials" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users" CASCADE;`);
    await queryRunner.query(`DROP TYPE IF EXISTS "auth_challenges_ceremonytype_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "users_status_enum";`);
  }
}

