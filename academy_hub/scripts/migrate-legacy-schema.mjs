/**
 * Migrates production DB from manager/free-text schema to coach/4-option schema
 * without wiping existing rows. Safe to run multiple times.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function columnExists(table, column) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2
     LIMIT 1`,
    table,
    column,
  );
  return Array.isArray(rows) && rows.length > 0;
}

async function enumHasValue(enumName, value) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT 1 FROM pg_enum e
     JOIN pg_type t ON e.enumtypid = t.oid
     WHERE t.typname = $1 AND e.enumlabel = $2
     LIMIT 1`,
    enumName,
    value,
  );
  return Array.isArray(rows) && rows.length > 0;
}

async function tableExists(table) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = $1
     LIMIT 1`,
    table,
  );
  return Array.isArray(rows) && rows.length > 0;
}

async function main() {
  console.log("Checking for legacy schema…");

  if (!(await tableExists("User"))) {
    console.log("No existing tables; skipping legacy migration.");
    return;
  }

  const hasManagerRole = await enumHasValue("Role", "MANAGER");
  const hasCoachRole = await enumHasValue("Role", "COACH");

  if (hasManagerRole && !hasCoachRole) {
    console.log("Renaming Role enum value MANAGER → COACH");
    await prisma.$executeRawUnsafe(`ALTER TYPE "Role" RENAME VALUE 'MANAGER' TO 'COACH'`);
  }

  if (await columnExists("PlayerProfile", "managerId")) {
    console.log("Renaming PlayerProfile.managerId → coachId");
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "PlayerProfile" RENAME COLUMN "managerId" TO "coachId"`,
    );
  }

  if (await columnExists("QuestionAssignment", "managerId")) {
    console.log("Renaming QuestionAssignment.managerId → coachId");
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "QuestionAssignment" RENAME COLUMN "managerId" TO "coachId"`,
    );
  }

  const optionCols = ["optionA", "optionB", "optionC", "optionD"];
  const defaults = [
    "Excellent",
    "Good",
    "Fair",
    "Needs improvement",
  ];

  for (let i = 0; i < optionCols.length; i++) {
    const col = optionCols[i];
    if (!(await columnExists("QuestionTemplate", col))) {
      console.log(`Adding QuestionTemplate.${col}`);
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "QuestionTemplate" ADD COLUMN "${col}" TEXT`,
      );
    }
    await prisma.$executeRawUnsafe(
      `UPDATE "QuestionTemplate" SET "${col}" = $1 WHERE "${col}" IS NULL OR "${col}" = ''`,
      defaults[i],
    );
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "QuestionTemplate" ALTER COLUMN "${col}" SET NOT NULL`,
    );
  }

  if (!(await columnExists("Answer", "selectedOption"))) {
    console.log("Adding Answer.selectedOption");
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "Answer" ADD COLUMN "selectedOption" INTEGER`,
    );
  }

  await prisma.$executeRawUnsafe(
    `UPDATE "Answer" SET "selectedOption" = 0 WHERE "selectedOption" IS NULL`,
  );

  await prisma.$executeRawUnsafe(
    `ALTER TABLE "Answer" ALTER COLUMN "selectedOption" SET NOT NULL`,
  );

  console.log("Legacy schema migration complete.");
}

main()
  .catch((err) => {
    console.error("Legacy migration failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
