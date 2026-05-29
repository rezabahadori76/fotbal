import { execSync } from "node:child_process";

/** Neon / Vercel Storage may use a custom prefix instead of DATABASE_URL */
function resolveDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  const candidates = [
    "DATABASE_POSTGRES_PRISMA_URL",
    "DATABASE_POSTGRES_URL",
    "POSTGRES_PRISMA_URL",
    "POSTGRES_URL",
    "POSTGRES_URL_NON_POOLING",
    "STORAGE_URL",
    "NEON_DATABASE_URL",
  ];

  for (const key of candidates) {
    if (process.env[key]) {
      console.log(`Using ${key} as DATABASE_URL for Prisma`);
      return process.env[key];
    }
  }

  return null;
}

function resolveDirectDatabaseUrl() {
  const explicit =
    process.env.DIRECT_URL ??
    process.env.DATABASE_POSTGRES_URL_NON_POOLING ??
    process.env.POSTGRES_URL_NON_POOLING;

  if (explicit) return explicit;

  const databaseUrl = resolveDatabaseUrl();
  if (databaseUrl?.includes("-pooler.")) {
    return databaseUrl.replace("-pooler.", ".");
  }

  return databaseUrl;
}

function resolveAuthUrl() {
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL;
  if (process.env.AUTH_URL) return process.env.AUTH_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return null;
}

const databaseUrl = resolveDatabaseUrl();
const directDatabaseUrl = resolveDirectDatabaseUrl();
const authUrl = resolveAuthUrl();

if (!databaseUrl) {
  console.error(
    [
      "No database URL found for build.",
      "In Vercel → Settings → Environment Variables, set DATABASE_URL to your Neon connection string,",
      "or use Custom Prefix DATABASE when connecting Neon (creates DATABASE_URL).",
    ].join("\n"),
  );
  process.exit(1);
}

if (directDatabaseUrl) {
  process.env.DATABASE_URL = directDatabaseUrl;
  process.env.DIRECT_URL = directDatabaseUrl;
  if (directDatabaseUrl !== databaseUrl) {
    console.log("Using a direct database connection for Prisma build steps");
  }
} else {
  process.env.DATABASE_URL = databaseUrl;
}

if (authUrl) {
  process.env.NEXTAUTH_URL = authUrl;
  process.env.AUTH_URL = authUrl;
}

function run(cmd) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: "inherit", env: process.env });
}

function tryRun(cmd) {
  try {
    run(cmd);
    return true;
  } catch {
    return false;
  }
}

run("npx prisma generate");

// Upgrade existing Neon data (manager → coach, add 4 options) before push
tryRun("node scripts/migrate-legacy-schema.mjs");

const pushArgs =
  process.env.ALLOW_DB_RESET === "true"
    ? "npx prisma db push --force-reset --accept-data-loss"
    : "npx prisma db push";

if (!tryRun(pushArgs)) {
  if (process.env.ALLOW_DB_RESET === "true") {
    process.exit(1);
  }
  console.error(`
prisma db push failed. Your database has an incompatible schema.

Option A (recommended for demo data): In Vercel env vars, set ALLOW_DB_RESET=true,
redeploy once, then remove ALLOW_DB_RESET and redeploy again. This wipes the DB;
visit /api/setup/seed?secret=YOUR_SETUP_SECRET to recreate demo users.

Option B: Run "node scripts/migrate-legacy-schema.mjs" locally against production DATABASE_URL, then redeploy.
`);
  process.exit(1);
}

if (process.env.ALLOW_DB_RESET === "true" && process.env.AUTO_SEED_ON_DEPLOY === "true") {
  tryRun("npx tsx prisma/seed.ts");
}

run("npx next build");
