import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateWalletLedgerTransfers1762510310000 implements MigrationInterface {
    name = 'CreateWalletLedgerTransfers1762510310000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

        await queryRunner.query(`
            CREATE TABLE "wallet_accounts" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "userId" uuid,
                "groupId" uuid,
                "type" varchar(24) NOT NULL,
                "balance" numeric(14,2) NOT NULL DEFAULT 0,
                "currency" varchar(3) NOT NULL DEFAULT 'NGN',
                "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
                CONSTRAINT "PK_wallet_accounts_id" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`CREATE INDEX "IDX_wallet_user" ON "wallet_accounts" ("userId")`);
        await queryRunner.query(`CREATE INDEX "IDX_wallet_group" ON "wallet_accounts" ("groupId")`);
        await queryRunner.query(`CREATE INDEX "IDX_wallet_type" ON "wallet_accounts" ("type")`);

        await queryRunner.query(`
            CREATE TABLE "ledger_entries" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "requestId" varchar(120) NOT NULL,
                "debitAccountId" uuid NOT NULL,
                "creditAccountId" uuid NOT NULL,
                "amount" numeric(14,2) NOT NULL,
                "currency" varchar(3) NOT NULL DEFAULT 'NGN',
                "meta" jsonb,
                "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
                CONSTRAINT "PK_ledger_entries_id" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`CREATE INDEX "IDX_ledger_requestId" ON "ledger_entries" ("requestId")`);

        await queryRunner.query(`
            CREATE TABLE "transfers" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "requestId" varchar(120) NOT NULL,
                "fromAccountId" uuid NOT NULL,
                "toAccountId" uuid NOT NULL,
                "amount" numeric(14,2) NOT NULL,
                "currency" varchar(3) NOT NULL DEFAULT 'NGN',
                "status" varchar(24) NOT NULL DEFAULT 'pending',
                "error" text,
                "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
                CONSTRAINT "PK_transfers_id" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_transfers_requestId" ON "transfers" ("requestId")`);
        await queryRunner.query(`CREATE INDEX "IDX_transfers_status" ON "transfers" ("status")`);
        await queryRunner.query(`CREATE INDEX "IDX_transfers_createdAt" ON "transfers" ("createdAt")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_transfers_createdAt"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_transfers_status"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "UQ_transfers_requestId"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "transfers"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_ledger_requestId"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "ledger_entries"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_wallet_type"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_wallet_group"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_wallet_user"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "wallet_accounts"`);
    }
}