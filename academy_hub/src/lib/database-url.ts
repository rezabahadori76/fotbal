const DATABASE_URL_FALLBACK_KEYS = [
  "DATABASE_POSTGRES_PRISMA_URL",
  "DATABASE_POSTGRES_URL",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL",
  "STORAGE_URL",
  "NEON_DATABASE_URL",
] as const;

const DIRECT_URL_FALLBACK_KEYS = [
  "DIRECT_URL",
  "DATABASE_POSTGRES_URL_NON_POOLING",
  "POSTGRES_URL_NON_POOLING",
] as const;

function firstDefined(keys: readonly string[]) {
  for (const key of keys) {
    const value = process.env[key];
    if (value) return value;
  }

  return undefined;
}

function toDirectDatabaseUrl(url?: string) {
  if (!url) return undefined;
  if (!url.includes("-pooler.")) return url;

  return url.replace("-pooler.", ".");
}

function normalizeAppUrl(url?: string) {
  if (!url) return undefined;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `https://${url}`;
}

export function ensureDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  const value = firstDefined(DATABASE_URL_FALLBACK_KEYS);
  if (value) {
    process.env.DATABASE_URL = value;
    return value;
  }

  return undefined;
}

export function ensureDirectUrl() {
  if (process.env.DIRECT_URL) return process.env.DIRECT_URL;

  const value =
    firstDefined(DIRECT_URL_FALLBACK_KEYS) ?? toDirectDatabaseUrl(process.env.DATABASE_URL);

  if (value) {
    process.env.DIRECT_URL = value;
    return value;
  }

  return undefined;
}

export function ensureAuthUrl() {
  if (process.env.NEXTAUTH_URL && !process.env.AUTH_URL) {
    process.env.AUTH_URL = process.env.NEXTAUTH_URL;
    return process.env.NEXTAUTH_URL;
  }

  if (process.env.AUTH_URL && !process.env.NEXTAUTH_URL) {
    process.env.NEXTAUTH_URL = process.env.AUTH_URL;
    return process.env.AUTH_URL;
  }

  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL;

  const derived = normalizeAppUrl(
    process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL,
  );

  if (derived) {
    process.env.NEXTAUTH_URL = derived;
    process.env.AUTH_URL = derived;
    return derived;
  }

  return undefined;
}

ensureDatabaseUrl();
ensureDirectUrl();
ensureAuthUrl();
