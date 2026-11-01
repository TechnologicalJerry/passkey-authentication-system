import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuditLogsAndHardenSchema1730600000000 implements MigrationInterface {
  name = 'CreateAuditLogsAndHardenSchema1730600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add display_name column to users table
    await queryRunner.query(`
      ALTER TABLE "users" 
      ADD COLUMN IF NOT EXISTS "display_name" character varying(128) DEFAULT NULL;
    `);

    // 2. Create Audit Outcome Enum
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."audit_logs_outcome_enum" AS ENUM('SUCCESS', 'FAILURE');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // 3. Create audit_logs table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "audit_logs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "event_type" character varying(64) NOT NULL,
        "actor_user_id" uuid,
        "target_resource_id" character varying(255),
        "outcome" "public"."audit_logs_outcome_enum" NOT NULL DEFAULT 'SUCCESS',
        "ip_address" character varying(45),
        "user_agent" text,
        "metadata" jsonb,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "pk_audit_logs" PRIMARY KEY ("id")
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_audit_logs_event_type" ON "audit_logs" ("event_type");
      CREATE INDEX IF NOT EXISTS "idx_audit_logs_actor_user_id" ON "audit_logs" ("actor_user_id");
      CREATE INDEX IF NOT EXISTS "idx_audit_logs_created_at" ON "audit_logs" ("created_at");
    `);

    // 4. Create enrollment_invitations table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "enrollment_invitations" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "email" character varying(255) NOT NULL,
        "token_hash" character varying(255) NOT NULL,
        "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "consumed_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "pk_enrollment_invitations" PRIMARY KEY ("id"),
        CONSTRAINT "uq_enrollment_invitations_token_hash" UNIQUE ("token_hash")
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_enrollment_invitations_email" ON "enrollment_invitations" ("email");
      CREATE INDEX IF NOT EXISTS "idx_enrollment_invitations_token_hash" ON "enrollment_invitations" ("token_hash");
      CREATE INDEX IF NOT EXISTS "idx_enrollment_invitations_expires_at" ON "enrollment_invitations" ("expires_at");
      CREATE INDEX IF NOT EXISTS "idx_enrollment_invitations_consumed_at" ON "enrollment_invitations" ("consumed_at");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "enrollment_invitations";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_logs";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."audit_logs_outcome_enum";`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "display_name";`);
  }
}

