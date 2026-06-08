# Academy Hub — Soccer Manager Dashboard

A Next.js web dashboard for soccer academy clubs with three roles:

| Role | Capabilities |
|------|----------------|
| **Coach** | Manage squad players, send predefined or custom questions, review responses |
| **Player** | View and answer questions from their coach |
| **Admin** | Full access: manage all users, maintain the global question library |

## Tech stack

- **Next.js 15** (App Router) + TypeScript
- **Prisma** + PostgreSQL (Neon / Vercel Postgres)
- **NextAuth** (credentials)
- **Tailwind CSS 4**

## Getting started

```bash
npm install
npm run db:setup    # migrate + seed demo data
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Demo accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@academy.com | password123 |
| Coach | manager@academy.com | password123 |
| Player | player@academy.com | password123 |

## Environment

Copy `.env.example` to `.env` and set:

- `DATABASE_URL` — PostgreSQL connection string
- `NEXTAUTH_SECRET` — random string for production
- `NEXTAUTH_URL` — app URL (e.g. `http://localhost:3000`)

## Scripts

- `npm run dev` — development server
- `npm run build` — production build
- `npm run db:setup` — push schema + seed
- `npm run db:seed` — re-seed demo data

## Project structure

```
src/
  app/
    admin/      # Admin routes
    coach/      # Coach routes
    player/     # Player routes
    login/
  components/
  lib/
    actions/    # Server actions
    auth.ts
prisma/
  schema.prisma
  seed.ts
```

## Deploy to Vercel

### 1. Create a Postgres database

SQLite does not work on Vercel. Use **[Neon](https://neon.tech)** (free) or **Vercel Postgres** from the [Marketplace](https://vercel.com/marketplace):

1. Create a project and copy the **connection string** (`postgresql://...`).
2. In Vercel → **Settings** → **Environment Variables**, add:

| Name | Value | Environments |
|------|--------|--------------|
| `DATABASE_URL` | Your `postgresql://...` connection string (or set Neon prefix to **DATABASE** so `DATABASE_URL` is created automatically) | Production, Preview |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` | Production, Preview |
| `NEXTAUTH_URL` | `https://your-app.vercel.app` | Production |

3. **Redeploy** (Deployments → ⋮ → Redeploy).

The `vercel-build` script migrates legacy schemas, then runs `prisma db push` on deploy.
`vercel.json` pins Vercel to `npm run vercel-build`, so production and preview deploys use the same setup path.
If your provider exposes a direct or non-pooling Postgres URL, set `DIRECT_URL` too for smoother Prisma deploys.

If deploy fails with schema errors on an old database, set **`ALLOW_DB_RESET=true`** in Vercel, redeploy once (wipes data), run the seed URL, then remove `ALLOW_DB_RESET`.

### 2. Seed production data (once)

**Option A — from the browser (if local `npm run db:seed` can't reach Neon):**

1. Add `SETUP_SECRET` in Vercel env vars (`openssl rand -base64 32`).
2. Redeploy.
3. Visit once: `https://your-app.vercel.app/api/setup/seed?secret=YOUR_SETUP_SECRET`
4. You should see JSON with `ok: true` and demo accounts.

**Option B — from your machine:**

```bash
export DATABASE_URL="postgresql://..."
npm run db:seed
```

Demo logins: `manager@academy.com` / `password123` (coach role), plus the admin/player accounts from the seed response.

### 3. Local development

Point `.env` at the same Neon DB or a local Postgres instance — see `.env.example`.

## Production notes

- Use a strong `NEXTAUTH_SECRET` and HTTPS.
- Consider email magic links or OAuth instead of password-only auth.
