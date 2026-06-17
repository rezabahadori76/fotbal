#!/usr/bin/env node
/**
 * End-to-end tests for: Development Goals, Training Load, Announcements,
 * Statistics Charts, Export CSV/PDF.
 */
const BASE = process.env.HUB_URL ?? "http://127.0.0.1:3000/hub";

const ACCOUNTS = {
  player: { email: "player@academy.com", password: "password123" },
  coach: { email: "coach@academy.com", password: "password123" },
  admin: { email: "admin@academy.com", password: "password123" },
};

const FEATURE_ROUTES = {
  player: [
    { path: "/player/goals", mustInclude: ["Development Goals"] },
    { path: "/player/training", mustInclude: ["Training Load", "Weekly trend"] },
    { path: "/player", mustInclude: ["Team announcements"] },
  ],
  coach: [
    { path: "/coach/goals", mustInclude: ["Development Goals", "Create goal"] },
    { path: "/coach/announcements", mustInclude: ["Announcements", "New announcement"] },
    { path: "/coach/statistics", mustInclude: ["Squad statistics", "Response overview"] },
    { path: "/coach/health", mustInclude: ["Export"] },
  ],
  admin: [
    { path: "/admin/goals", mustInclude: ["Development Goals"] },
    { path: "/admin/announcements", mustInclude: ["Announcements"] },
  ],
};

const EXPORT_ROUTES = [
  { path: "/api/export/wellness", contentType: "text/csv", minBytes: 20 },
  { path: "/api/export/responses", contentType: "text/csv", minBytes: 20 },
  { path: "/api/export/training-load", contentType: "text/csv", minBytes: 20 },
];

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
  const { csrfToken } = await csrfRes.json();

  const signInRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookieHeader(jar),
    },
    body: new URLSearchParams({
      csrfToken,
      email,
      password,
      callbackUrl: `${BASE}/`,
      json: "true",
    }),
    redirect: "manual",
  });
  for (const [k, v] of parseCookies(signInRes.headers.getSetCookie?.() ?? [])) jar.set(k, v);

  const sessionRes = await fetch(`${BASE}/api/auth/session`, {
    headers: { Cookie: cookieHeader(jar) },
  });
  const session = await sessionRes.json();
  if (!session?.user?.email) throw new Error(`Login failed for ${email}`);
  return { jar, session };
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
  return { status: res.status, text, hasError, len: text.length };
}

async function main() {
  const failures = [];
  const passes = [];

  // --- Player feature pages ---
  console.log("\n=== PLAYER features ===");
  const playerAuth = await login(ACCOUNTS.player.email, ACCOUNTS.player.password);
  console.log("  login: OK");

  for (const { path, mustInclude } of FEATURE_ROUTES.player) {
    const { status, text, hasError, len } = await getPage(path, playerAuth.jar);
    const missing = mustInclude.filter((s) => !text.includes(s));
    const ok = status === 200 && !hasError && missing.length === 0 && len > 500;
    console.log(`  ${ok ? "OK" : "FAIL"} ${path} (${len}b)`);
    if (!ok) failures.push(`PLAYER ${path}: status=${status} error=${hasError} missing=${missing.join(",")}`);
    else passes.push(`PLAYER ${path}`);
  }

  // --- Coach feature pages ---
  console.log("\n=== COACH features ===");
  const coachAuth = await login(ACCOUNTS.coach.email, ACCOUNTS.coach.password);
  console.log("  login: OK");

  for (const { path, mustInclude } of FEATURE_ROUTES.coach) {
    const { status, text, hasError, len } = await getPage(path, coachAuth.jar);
    const missing = mustInclude.filter((s) => !text.includes(s));
    const ok = status === 200 && !hasError && missing.length === 0 && len > 500;
    console.log(`  ${ok ? "OK" : "FAIL"} ${path} (${len}b)`);
    if (!ok) failures.push(`COACH ${path}: status=${status} error=${hasError} missing=${missing.join(",")}`);
    else passes.push(`COACH ${path}`);
  }

  // Statistics charts — check chart components rendered
  const statsPage = await getPage("/coach/statistics", coachAuth.jar);
  const hasCharts =
    statsPage.text.includes("Response overview") &&
    statsPage.text.includes("Player response rates") &&
    statsPage.text.includes("By category");
  if (hasCharts) {
    console.log("  OK statistics charts rendered");
    passes.push("COACH statistics charts");
  } else {
    failures.push("COACH statistics: chart sections missing");
    console.log("  FAIL statistics charts");
  }

  // --- Admin feature pages ---
  console.log("\n=== ADMIN features ===");
  const adminAuth = await login(ACCOUNTS.admin.email, ACCOUNTS.admin.password);
  console.log("  login: OK");

  for (const { path, mustInclude } of FEATURE_ROUTES.admin) {
    const { status, text, hasError, len } = await getPage(path, adminAuth.jar);
    const missing = mustInclude.filter((s) => !text.includes(s));
    const ok = status === 200 && !hasError && missing.length === 0 && len > 500;
    console.log(`  ${ok ? "OK" : "FAIL"} ${path} (${len}b)`);
    if (!ok) failures.push(`ADMIN ${path}: status=${status} error=${hasError} missing=${missing.join(",")}`);
    else passes.push(`ADMIN ${path}`);
  }

  // --- CSV exports (coach) ---
  console.log("\n=== CSV exports (coach) ===");
  for (const { path, contentType, minBytes } of EXPORT_ROUTES) {
    const res = await fetch(`${BASE}${path}`, {
      headers: { Cookie: cookieHeader(coachAuth.jar) },
    });
    const text = await res.text();
    const ct = res.headers.get("content-type") ?? "";
    const ok = res.status === 200 && ct.includes(contentType) && text.length >= minBytes;
    const rows = text.trim().split("\n").length;
    console.log(`  ${ok ? "OK" : "FAIL"} ${path} -> ${res.status} (${text.length}b, ${rows} lines)`);
    if (!ok) failures.push(`EXPORT ${path}: status=${res.status} ct=${ct} len=${text.length}`);
    else passes.push(`EXPORT ${path}`);
  }

  // Player should NOT access exports
  const blocked = await fetch(`${BASE}/api/export/wellness`, {
    headers: { Cookie: cookieHeader(playerAuth.jar) },
  });
  if (blocked.status === 401) {
    console.log("  OK player blocked from export (401)");
    passes.push("EXPORT player blocked");
  } else {
    failures.push(`EXPORT player should be 401, got ${blocked.status}`);
    console.log(`  FAIL player export auth: ${blocked.status}`);
  }

  // --- PDF export page ---
  console.log("\n=== PDF export (coach) ===");
  const playersPage = await getPage("/coach/players", coachAuth.jar);
  const profileMatch = playersPage.text.match(/\/coach\/players\/(cm[a-z0-9]+)/);
  if (profileMatch) {
    const profileId = profileMatch[1];
    const pdfPage = await getPage(`/coach/export/player/${profileId}`, coachAuth.jar);
    const hasPdf =
      pdfPage.status === 200 &&
      !pdfPage.hasError &&
      pdfPage.text.includes("Player report preview") &&
      pdfPage.text.includes("Save as PDF");
    console.log(`  ${hasPdf ? "OK" : "FAIL"} /coach/export/player/${profileId}`);
    if (hasPdf) passes.push("PDF export page");
    else failures.push(`PDF export: status=${pdfPage.status} error=${pdfPage.hasError}`);
  } else {
    failures.push("PDF export: could not find player profile link");
    console.log("  FAIL could not find player profile link");
  }

  // --- Data presence checks on pages ---
  console.log("\n=== Data presence ===");
  const goalsCoach = await getPage("/coach/goals", coachAuth.jar);
  const hasGoals = !goalsCoach.text.includes("No goals created yet");
  console.log(`  ${hasGoals ? "OK" : "WARN"} coach goals have data`);
  if (!hasGoals) failures.push("DATA: no development goals in DB — run seed-feature-test-data");

  const trainingPlayer = await getPage("/player/training", playerAuth.jar);
  const hasTraining = trainingPlayer.text.includes("Sessions logged") &&
    !trainingPlayer.text.match(/Sessions logged[\s\S]*?>0</);
  console.log(`  ${hasTraining ? "OK" : "WARN"} player has training sessions`);
  if (!hasTraining) failures.push("DATA: demo player has no training load data");

  const playerDash = await getPage("/player", playerAuth.jar);
  const hasAnnouncements = !playerDash.text.includes("No announcements yet");
  console.log(`  ${hasAnnouncements ? "OK" : "WARN"} player sees announcements`);
  if (!hasAnnouncements) failures.push("DATA: no announcements visible to player");

  // --- Summary ---
  console.log("\n=== Summary ===");
  console.log(`Passed: ${passes.length}`);
  if (failures.length === 0) {
    console.log("All feature tests passed.");
    process.exit(0);
  } else {
    console.log(`Failed: ${failures.length}`);
    failures.forEach((f) => console.log(`  - ${f}`));
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
