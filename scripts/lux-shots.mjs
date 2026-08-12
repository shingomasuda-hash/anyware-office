// LUXURY METAVERSE PASS — visual acceptance shots (§12).
// For each finished area: the approach, the moment of entry, the hero
// shot, and the place you stop. Dev server on :3000.
import { createRequire } from "module";
import { mkdirSync } from "fs";

const req = createRequire(import.meta.url);
const { chromium } = req("playwright");
const WebSocket = req("ws");

const BASE = "http://localhost:3000";
const OUT = process.env.SHOT_DIR ?? "/tmp/lux";
mkdirSync(OUT, { recursive: true });

async function bridge(ctx) {
  await ctx.route(/^https:\/\/[^/]*\.supabase\.co\/.*/, async (route) => {
    const r = route.request();
    const headers = { ...r.headers() };
    delete headers["host"]; delete headers["accept-encoding"]; delete headers["content-length"];
    try {
      const resp = await fetch(r.url(), { method: r.method(), headers,
        body: ["GET", "HEAD"].includes(r.method()) ? undefined : (r.postDataBuffer() ?? undefined) });
      const body = Buffer.from(await resp.arrayBuffer());
      const h = {};
      resp.headers.forEach((v, k) => { if (!["content-encoding","transfer-encoding","content-length","connection"].includes(k)) h[k] = v; });
      await route.fulfill({ status: resp.status, headers: h, body });
    } catch { await route.abort(); }
  });
  await ctx.routeWebSocket(/supabase\.co/, (ws) => {
    const server = new WebSocket(ws.url());
    const pending = [];
    server.on("open", () => { for (const m of pending) server.send(m); pending.length = 0; });
    ws.onMessage((m) => { if (server.readyState === 1) server.send(m); else pending.push(m); });
    server.on("message", (d, bin) => { try { ws.send(bin ? d : d.toString()); } catch {} });
    ws.onClose(() => { try { server.close(); } catch {} });
    server.on("close", () => { try { ws.close(); } catch {} });
    server.on("error", () => { try { ws.close(); } catch {} });
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const login = async (page, email, password) => {
  await page.goto(`${BASE}/login`);
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click('[data-testid="login-submit"]');
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 60000 });
};
const labReady = async (p) => {
  await p.locator('[data-testid="office-lab-canvas"] canvas').waitFor({ timeout: 180000 });
  await p.locator('[data-testid="lab-loading"]').waitFor({ state: "detached", timeout: 180000 });
};
const settle = async (p, frames = 7) => {
  for (let i = 0; i < frames; i++) {
    await p.evaluate(() => new Promise((r) => requestAnimationFrame(() => r(1))));
  }
  await sleep(900);
};
const shot = async (p, name) => {
  await settle(p);
  await p.screenshot({ path: `${OUT}/${name}.png` });
  const s = await p.evaluate(() => window.__officeLab.stats());
  console.log(`shot ${name}  — ${s.calls} calls / ${s.triangles} tris`);
  return s;
};

const browser = await chromium.launch({
  args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--disable-dev-shm-usage"],
});
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
await bridge(ctx);
const A = await ctx.newPage();
await login(A, process.env.TEST_ADMIN_EMAIL, process.env.TEST_ADMIN_PASSWORD);
await A.goto(`${BASE}/office-lab`);
await labReady(A);

const U = 0.075;
const plan = await A.evaluate(() => window.__officeLab.buildings());
const campus = (x, y) => A.evaluate(([a, b]) => window.__officeLab.campus(a, b), [x, y]);
const teleport = (x, y) => A.evaluate(([a, b]) => window.__officeGame.teleport(a, b), [x, y]);
const setCam = (pos, look) => A.evaluate(([a, b]) => window.__officeLab.setCamera(a, b), [pos, look]);
const centre = await campus(880, 600);
const cx = centre.x * U;
const cz = centre.y * U;
const peak = { calls: 0, triangles: 0, where: "" };
const track = (s, where) => {
  if (s.calls > peak.calls) Object.assign(peak, { calls: s.calls, triangles: s.triangles, where });
};

const ONLY = (process.env.ONLY ?? "").split(",").filter(Boolean);
const want = (name) => ONLY.length === 0 || ONLY.includes(name);

// ── CENTRAL PLAZA ───────────────────────────────────────────────────
if (want("PLAZA")) {
  await setCam([cx + 30, 14, cz + 62], [cx, 6, cz]);
  track(await shot(A, "plaza-hero"), "plaza-hero");
  await setCam([cx + 96, 44, cz + 118], [cx, 4, cz]);
  track(await shot(A, "plaza-overview"), "plaza-overview");
}

// ── per-area: approach → entry → hero → dwell ───────────────────────
// local metres inside a building, relative to its centre, with +Z out
// of the entrance. The transform gives us the world position of any
// local point via the building's own frame.
// local metres inside a building -> world metres, using the renderer's
// own frame transform so a shot lands exactly where it was authored.
const local = (id, lx, ly, lz) =>
  A.evaluate(([a, b, c, d]) => window.__officeLab.localToWorld(a, b, c, d), [id, lx, ly, lz]);

async function area(id, shots) {
  if (!want(id)) return;
  const b = plan.find((x) => x.id === id);
  const door = await campus(b.doorX, b.doorY);
  const cc = await campus(b.cx, b.cy);
  const fx = door.x - cc.x;
  const fy = door.y - cc.y;
  const fl = Math.hypot(fx, fy) || 1;
  const f = [fx / fl, fy / fl];
  const dm = [door.x * U, door.y * U];

  // stand the avatar inside so interior LOD + roof fade engage
  await teleport(b.cx, b.cy);
  await sleep(1200);

  // 1. approach — outside, looking at the entrance
  await setCam([dm[0] + f[0] * 34, 11, dm[1] + f[1] * 34], [dm[0], 5, dm[1]]);
  track(await shot(A, `${id.toLowerCase()}-1-approach`), `${id} approach`);

  // 2. entry moment — in the opening, looking in
  await setCam([dm[0] + f[0] * 5.5, 3.4, dm[1] + f[1] * 5.5], [
    cc.x * U,
    2.6,
    cc.y * U,
  ]);
  track(await shot(A, `${id.toLowerCase()}-2-entry`), `${id} entry`);

  for (const [name, camL, lookL] of shots) {
    const pos = await local(id, camL[0], camL[1], camL[2]);
    const look = await local(id, lookL[0], lookL[1], lookL[2]);
    await setCam(pos, look);
    track(await shot(A, `${id.toLowerCase()}-${name}`), `${id} ${name}`);
  }
}

await area("ENTRANCE", [
  ["3-hero-datacore", [1.6, 2.3, 11.5], [0, 4.2, -2.2]],
  ["4-dwell-lounge", [1.0, 2.0, 3.0], [8.6, 1.1, -2.0]],
]);
await area("STAFF", [
  ["3-hero-island", [1.2, 2.4, 8.5], [0, 2.0, -1.4]],
  ["4-dwell-pods", [3.6, 2.0, 3.4], [-9.6, 1.3, 3.4]],
]);
await area("MEETING", [
  ["3-hero-conference", [1.4, 2.4, 5.0], [0, 1.9, -7.0]],
  ["4-dwell-waiting", [1.5, 2.0, 2.0], [8.4, 1.2, 8.6]],
]);
await area("SIGNAL", [
  ["3-hero-mediawall", [1.4, 2.5, 7.5], [0, 3.4, -12.4]],
  ["4-dwell-storyboard", [1.5, 2.2, 2.0], [11.2, 2.6, 7.0]],
]);

// ── two users, human scale check (§8) ───────────────────────────────
if (!want("EXTRA")) {
  console.log(`\nPEAK: ${peak.calls} draw calls / ${peak.triangles} triangles (${peak.where})`);
  await browser.close();
  process.exit(0);
}
const ctxB = await browser.newContext({ viewport: { width: 900, height: 700 } });
await bridge(ctxB);
const B = await ctxB.newPage();
await login(B, process.env.TEST_MEMBER_EMAIL, process.env.TEST_MEMBER_PASSWORD);
await B.goto(`${BASE}/office-lab`);
await labReady(B);
const ent = plan.find((x) => x.id === "ENTRANCE");
await teleport(ent.cx - 40, ent.cy + 40);
await B.evaluate(([a, b]) => window.__officeGame.teleport(a, b), [ent.cx + 40, ent.cy + 30]);
await sleep(5000);
const twoPos = await local("ENTRANCE", 0, 2.8, 10.5);
const twoLook = await local("ENTRANCE", 0, 1.4, -1.0);
await setCam(twoPos, twoLook);
track(await shot(A, "entrance-5-two-user"), "two-user");

// mobile
const ctxM = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 2,
});
await bridge(ctxM);
const Mo = await ctxM.newPage();
await login(Mo, process.env.TEST_ADMIN_EMAIL, process.env.TEST_ADMIN_PASSWORD);
await Mo.goto(`${BASE}/office-lab`);
await labReady(Mo);
await Mo.evaluate(([a, b]) => window.__officeGame.teleport(a, b), [ent.cx, ent.cy + 60]);
await sleep(3500);
await settle(Mo);
await Mo.screenshot({ path: `${OUT}/mobile.png` });
console.log("shot mobile");

console.log(`\nPEAK: ${peak.calls} draw calls / ${peak.triangles} triangles (${peak.where})`);
console.log(`wrote shots to ${OUT}`);
await browser.close();
