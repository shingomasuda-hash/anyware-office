// SIGNAL — CREATIVE MEDIA DISTRICT · visual acceptance (§18).
// The eleven required shots. Dev server on :3000.
import { createRequire } from "module";
import { mkdirSync } from "fs";

const req = createRequire(import.meta.url);
const { chromium } = req("playwright");
const WebSocket = req("ws");

const BASE = "http://localhost:3000";
const OUT = process.env.SHOT_DIR ?? "/tmp/signal";
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
const ONLY = (process.env.SHOTS ?? "").split(",").filter(Boolean);
const peak = { calls: 0, triangles: 0, where: "" };
const shot = async (p, name) => {
  if (ONLY.length && !ONLY.some((k) => name.includes(k))) return;
  await settle(p);
  await p.screenshot({ path: `${OUT}/${name}.png` });
  const s = await p.evaluate(() => window.__officeLab.stats());
  if (s.calls > peak.calls) Object.assign(peak, { calls: s.calls, triangles: s.triangles, where: name });
  console.log(`${name}  — ${s.calls} calls / ${s.triangles} tris`);
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
const sig = plan.find((b) => b.id === "SIGNAL");
const campus = (x, y) => A.evaluate(([a, b]) => window.__officeLab.campus(a, b), [x, y]);
const local = (lx, ly, lz) =>
  A.evaluate(([a, b, c, d]) => window.__officeLab.localToWorld(a, b, c, d), ["SIGNAL", lx, ly, lz]);
const teleport = (p, x, y) => p.evaluate(([a, b]) => window.__officeGame.teleport(a, b), [x, y]);
const setCam = (pos, look) => A.evaluate(([a, b]) => window.__officeLab.setCamera(a, b), [pos, look]);
const view = async (cam, look) => setCam(await local(...cam), await local(...look));

// put the local avatar in the Campaign Arena so the district is lived in
const arenaWorld = await local(4.0, 0, -4.0);
await A.evaluate(
  ([wx, wz]) => {
    // walk the probe back to canonical space via the building frame is
    // unnecessary — the arena is near the room centre, so use that
    void wx;
    void wz;
  },
  [arenaWorld[0], arenaWorld[2]],
);
await teleport(A, sig.cx + 40, sig.cy - 40);
await sleep(1500);

const door = await campus(sig.doorX, sig.doorY);
const cc = await campus(sig.cx, sig.cy);
const fx = door.x - cc.x;
const fy = door.y - cc.y;
const fl = Math.hypot(fx, fy) || 1;
const f = [fx / fl, fy / fl];
const dm = [door.x * U, door.y * U];

// 1 — approach, from the campus
await setCam([dm[0] + f[0] * 40, 13, dm[1] + f[1] * 40], [dm[0], 9, dm[1]]);
await shot(A, "01-approach");

// 2 — threshold, standing in the opening
await setCam([dm[0] + f[0] * 3.0, 2.4, dm[1] + f[1] * 3.0], [cc.x * U, 3.4, cc.y * U]);
await shot(A, "02-threshold");

// 3 — HERO: inside the threshold, offset right, turned across the flow
await view([-5.4, 2.7, 9.6], [3.8, 2.2, -4.2]);
await shot(A, "03-hero");

// 4 — Campaign Arena
await view([5.0, 2.2, 5.2], [3.6, 2.0, -5.0]);
await shot(A, "04-campaign-arena");

// 5 — Media Halo, looking up through the void
await view([4.0, 1.7, 7.4], [4.0, 6.4, -4.0]);
await shot(A, "05-media-halo");

// 6 — Editing Deck
await view([-3.4, 1.9, 6.4], [-9.0, 1.5, -1.0]);
await shot(A, "06-editing-deck");

// 7 — Content Studio
await view([-2.6, 2.0, -4.2], [-7.4, 1.8, -10.4]);
await shot(A, "07-content-studio");

// 8 — Media Wall
await view([1.0, 2.4, -5.0], [0.0, 3.2, -14.0]);
await shot(A, "08-media-wall");

// 10 — SIGNAL -> Campus: looking back out of the district
await view([2.0, 2.2, 2.0], [1.0, 3.0, 15.5]);
await shot(A, "10-signal-to-campus");

// 9 — two users
const ctxB = await browser.newContext({ viewport: { width: 900, height: 700 } });
await bridge(ctxB);
const B = await ctxB.newPage();
await login(B, process.env.TEST_MEMBER_EMAIL, process.env.TEST_MEMBER_PASSWORD);
await B.goto(`${BASE}/office-lab`);
await labReady(B);
// A in the Campaign Arena, B at the Editing Deck
await teleport(A, sig.cx + 52, sig.cy - 50);
await teleport(B, sig.cx - 105, sig.cy + 40);
await sleep(6000);
await view([5.2, 2.1, 8.0], [-3.0, 1.6, -4.0]);
await shot(A, "09-two-user");

// 11 — mobile
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
await teleport(Mo, sig.cx + 40, sig.cy - 20);
await sleep(4000);
await settle(Mo);
await Mo.screenshot({ path: `${OUT}/11-mobile.png` });
console.log("11-mobile");

console.log(`\nPEAK: ${peak.calls} draw calls / ${peak.triangles} triangles (${peak.where})`);
await browser.close();
