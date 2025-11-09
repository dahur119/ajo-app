import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateThriftTables1762438726469 implements MigrationInterface {
    name = 'CreateThriftTables1762438726469'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "group_members" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "groupId" uuid NOT NULL, "userId" uuid NOT NULL, "role" character varying(24) NOT NULL DEFAULT 'member', "joinedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_53f644f66a416c1542b743c0295" UNIQUE ("groupId", "userId"), CONSTRAINT "PK_86446139b2c96bfd0f3b8638852" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "groups" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(120) NOT NULL, "ownerUserId" uuid NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_659d1483316afb28afd3a90646e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "cycle_slots" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "cycleId" uuid NOT NULL, "userId" uuid NOT NULL, "order" integer NOT NULL, "scheduledAt" TIMESTAMP WITH TIME ZONE, "status" character varying(24) NOT NULL DEFAULT 'pending', CONSTRAINT "UQ_cbd8ea5ee97be8020b034ddb528" UNIQUE ("cycleId", "order"), CONSTRAINT "PK_49fa23c3b20fd852a4eeaa55153" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "cycles" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "groupId" uuid NOT NULL, "amount" numeric(12,2) NOT NULL, "frequency" character varying(24) NOT NULL, "startAt" TIMESTAMP WITH TIME ZONE, "endAt" TIMESTAMP WITH TIME ZONE, "status" character varying(24) NOT NULL DEFAULT 'draft', "rotationStrategy" character varying(24) NOT NULL DEFAULT 'fixed', CONSTRAINT "PK_52e5eeb9c7c6e4ad1aed657967a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "group_members" ADD CONSTRAINT "FK_1aa8d31831c3126947e7a713c2b" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "cycle_slots" ADD CONSTRAINT "FK_03381dad62102b7560decd78396" FOREIGN KEY ("cycleId") REFERENCES "cycles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "cycles" ADD CONSTRAINT "FK_7f7f0cdff162b5143c7b23cab7d" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "cycles" DROP CONSTRAINT "FK_7f7f0cdff162b5143c7b23cab7d"`);
        await queryRunner.query(`ALTER TABLE "cycle_slots" DROP CONSTRAINT "FK_03381dad62102b7560decd78396"`);
        await queryRunner.query(`ALTER TABLE "group_members" DROP CONSTRAINT "FK_1aa8d31831c3126947e7a713c2b"`);
        await queryRunner.query(`DROP TABLE "cycles"`);
        await queryRunner.query(`DROP TABLE "cycle_slots"`);
        await queryRunner.query(`DROP TABLE "groups"`);
        await queryRunner.query(`DROP TABLE "group_members"`);
    }

}
