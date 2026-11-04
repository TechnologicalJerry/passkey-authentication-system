import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSessionsTable1730500000000 implements MigrationInterface {
  name = 'CreateSessionsTable1730500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "sessions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "refresh_token_hash" character varying(128) NOT NULL,
        "previous_refresh_token_hash" character varying(128),
        "refresh_token_family" uuid NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "last_activity_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "last_refresh_at" TIMESTAMP WITH TIME ZONE,
        "revoked_at" TIMESTAMP WITH TIME ZONE,
        "revocation_reason" character varying(64),
        "ip_address" character varying(64),
        "user_agent" character varying(512),
        "device_label" character varying(128),
        "version" integer NOT NULL DEFAULT 1,
        CONSTRAINT "pk_sessions" PRIMARY KEY ("id"),
        CONSTRAINT "fk_sessions_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_sessions_user_id" ON "sessions" ("user_id");
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_sessions_refresh_token_hash" ON "sessions" ("refresh_token_hash");
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_sessions_prev_token_hash" ON "sessions" ("previous_refresh_token_hash");
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_sessions_family" ON "sessions" ("refresh_token_family");
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_sessions_revoked_at" ON "sessions" ("revoked_at");
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_sessions_active" ON "sessions" ("user_id", "revoked_at", "expires_at");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "sessions" CASCADE;`);
  }
}
