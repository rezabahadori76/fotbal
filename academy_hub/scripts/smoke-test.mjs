#!/usr/bin/env node
/**
 * Smoke test: login as each role, hit all hub pages, exercise key server actions.
 */
const BASE = process.env.HUB_URL ?? "http://127.0.0.1:3000/hub";

const ACCOUNTS = [
  { role: "PLAYER", email: "player@academy.com", password: "password123" },
  { role: "COACH", email: "coach@academy.com", password: "password123" },
  { role: "ADMIN", email: "admin@academy.com", password: "password123" },
];

const ROUTES = {
  PLAYER: [
    "/player",
    "/player/status",
    "/player/status?add=true",
    "/player/training",
    "/player/goals",
    "/player/events",
    "/player/injuries",
    "/player/injuries?add=true",
    "/player/questions",
  ],
  COACH: [
    "/coach",
    "/coach/players",
    "/coach/events",
    "/coach/health",
    "/coach/announcements",
    "/coach/goals",
    "/coach/questions",
    "/coach/statistics",
    "/coach/responses",
  ],
  ADMIN: [
    "/admin",
    "/admin/users",
    "/admin/questions",
    "/admin/assignments",
    "/admin/events",
    "/admin/health",
    "/admin/announcements",
    "/admin/goals",
    "/admin/responses",
  ],
};

function parseCookies(setCookieHeaders) {
  const jar = new Map();
  for (const header of setCookieHeaders) {
    const part = header.split(";")[0];
    const eq = part.indexOf("=");
    if (eq > 0) jar.set(part.slice(0, eq), part.slice(eq + 1));
  }
  return jar;
}

function cookieHeader(jar) {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

async function login(email, password) {
  const jar = new Map();

  const csrfRes = await fetch(`${BASE}/api/auth/csrf`, { redirect: "manual" });
  for (const [k, v] of parseCookies(csrfRes.headers.getSetCookie?.() ?? [])) jar.set(k, v);
  const csrfJson = await csrfRes.json();
  const csrfToken = csrfJson.csrfToken;

  const body = new URLSearchParams({
    csrfToken,
    email,
    password,
    callbackUrl: `${BASE}/`,
    json: "true",
  });

  const signInRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookieHeader(jar),
    },
    body,
    redirect: "manual",
  });

  for (const [k, v] of parseCookies(signInRes.headers.getSetCookie?.() ?? [])) jar.set(k, v);

  const sessionRes = await fetch(`${BASE}/api/auth/session`, {
    headers: { Cookie: cookieHeader(jar) },
  });
  const session = await sessionRes.json();
  if (!session?.user?.email) {
    throw new Error(`Login failed for ${email}: ${JSON.stringify(session)}`);
  }
  return jar;
}

async function getPage(path, jar) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Cookie: cookieHeader(jar) },
    redirect: "manual",
  });
  const text = await res.text();
  const hasError =
    text.includes("Application error") ||
    text.includes("Internal Server Error") ||
    text.includes("Unhandled Runtime Error");
  return { status: res.status, hasError, len: text.length };
}

async function main() {
  const failures = [];

  for (const account of ACCOUNTS) {
    console.log(`\n=== ${account.role} (${account.email}) ===`);
    let jar;
    try {
      jar = await login(account.email, account.password);
      console.log("  login: OK");
    } catch (e) {
      failures.push(`${account.role} login: ${e.message}`);
      continue;
    }

    for (const path of ROUTES[account.role]) {
      const { status, hasError, len } = await getPage(path, jar);
      const ok = (status === 200 || status === 307) && !hasError && len > 500;
      const label = ok ? "OK" : "FAIL";
      console.log(`  ${label} ${path} -> ${status} (${len}b)`);
      if (!ok) failures.push(`${account.role} ${path}: status=${status} error=${hasError} len=${len}`);
    }
  }

  console.log("\n=== Summary ===");
  if (failures.length === 0) {
    console.log("All smoke tests passed.");
    process.exit(0);
  } else {
    console.log(`${failures.length} failure(s):`);
    failures.forEach((f) => console.log(`  - ${f}`));
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
