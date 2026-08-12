// ANYWARE FUTURE CAMPUS — M1 structural screenshots (§8).
// Not a visual-polish pass: these exist to show that ten separate
// buildings stand in an outdoor campus, and how you approach and enter
// them. Dev server on :3000.
import { createRequire } from "module";
import { mkdirSync } from "fs";

const req = createRequire(import.meta.url);
const { chromium } = req("playwright");
const WebSocket = req("ws");

const BASE = "http://localhost:3000";
const OUT = process.env.SHOT_DIR ?? "/tmp/campus-m1";
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
  await p.locator('[data-testid="office-lab-canvas"] canvas').waitFor({ timeout: 150000 });
  await p.locator('[data-testid="lab-loading"]').waitFor({ state: "detached", timeout: 150000 });
};
// SwiftShader renders ~1 fps, so a shot needs several real frames to
// settle (shadow map, first-draw of newly visible massing).
const settle = async (p, frames = 6) => {
  for (let i = 0; i < frames; i++) {
    await p.evaluate(() => new Promise((r) => requestAnimationFrame(() => r(1))));
  }
  await sleep(700);
};
const shot = async (p, name) => {
  await settle(p);
  await p.screenshot({ path: `${OUT}/${name}.png` });
  console.log(`shot ${name}`);
};

const browser = await chromium.launch({
  args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--disable-dev-shm-usage"],
});
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await bridge(ctx);
const A = await ctx.newPage();
await login(A, process.env.TEST_ADMIN_EMAIL, process.env.TEST_ADMIN_PASSWORD);
await A.goto(`${BASE}/office-lab`);
await labReady(A);

const U = 0.075;
const plan = await A.evaluate(() => window.__officeLab.buildings());
const campus = (x, y) => A.evaluate(([a, b]) => window.__officeLab.campus(a, b), [x, y]);
const teleport = (p, x, y) => p.evaluate(([a, b]) => window.__officeGame.teleport(a, b), [x, y]);
const setCam = (p, pos, look) =>
  p.evaluate(([a, b]) => window.__officeLab.setCamera(a, b), [pos, look]);

const centre = await campus(880, 600);
const cx = centre.x * U;
const cz = centre.y * U;

// 1 — bird's-eye campus
await setCam(A, [cx + 40, 190, cz + 205], [cx, 0, cz]);
await shot(A, "01-birdseye-campus");

// 2 — central plaza, eye level
await setCam(A, [cx + 26, 13, cz + 58], [cx, 3, cz - 6]);
await shot(A, "02-central-plaza");

// approach shots: stand back from the entrance, look at the building
async function approach(id, name, back = 46, height = 12) {
  const b = plan.find((x) => x.id === id);
  const door = await campus(b.doorX, b.doorY);
  const dx = door.x - centre.x;
  const dy = door.y - centre.y;
  const len = Math.hypot(dx, dy) || 1;
  const px = (door.x - (dx / len) * back / U) * U;
  const pz = (door.y - (dy / len) * back / U) * U;
  await setCam(A, [px, height, pz], [door.x * U, 5, door.y * U]);
  await shot(A, name);
}
await approach("ENTRANCE", "03-entrance-approach", 58, 16);
await approach("STAFF", "04-staff-approach", 46, 13);
await approach("MEETING", "05-meeting-approach", 46, 13);

// 6 — exterior, two users on the plaza
const ctxB = await browser.newContext({ viewport: { width: 900, height: 700 } });
await bridge(ctxB);
const B = await ctxB.newPage();
await login(B, process.env.TEST_MEMBER_EMAIL, process.env.TEST_MEMBER_PASSWORD);
await B.goto(`${BASE}/office-lab`);
await labReady(B);
await teleport(A, 880, 640);
await teleport(B, 940, 660);
await sleep(4000);
const meA = await campus(880, 640);
await setCam(A, [meA.x * U + 12, 9, meA.y * U + 26], [meA.x * U + 3, 1.6, meA.y * U]);
await shot(A, "06-exterior-two-user");

// 7 — the entry moment: chase camera, standing in the opening
await setCam(A, null, null);
const par = plan.find((x) => x.id === "PARTNER");
await teleport(A, par.doorX, par.doorY + 26);
await sleep(2500);
await shot(A, "07-building-entry-moment");

// 8 — mobile
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
await Mo.evaluate(([a, b]) => window.__officeGame.teleport(a, b), [880, 700]);
await sleep(3000);
await shot(Mo, "08-mobile");

console.log(`\nwrote 8 shots to ${OUT}`);
await browser.close();
