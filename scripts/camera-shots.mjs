// Interior camera check: NO camera override. The avatar is walked into
// each district and the shot is taken through the real chase camera, so
// what you see is what a player sees.
import { createRequire } from "module";
import { mkdirSync } from "fs";
const req = createRequire(import.meta.url);
const { chromium } = req("playwright");
const WebSocket = req("ws");
const BASE = "http://localhost:3000";
const OUT = process.env.SHOT_DIR ?? "/tmp/cam";
mkdirSync(OUT, { recursive: true });
async function bridge(ctx) {
  await ctx.route(/^https:\/\/[^/]*\.supabase\.co\/.*/, async (route) => {
    const r = route.request();
    const headers = { ...r.headers() };
    delete headers["host"]; delete headers["accept-encoding"]; delete headers["content-length"];
    try {
      const resp = await fetch(r.url(), { method: r.method(), headers,
        body: ["GET","HEAD"].includes(r.method()) ? undefined : (r.postDataBuffer() ?? undefined) });
      const body = Buffer.from(await resp.arrayBuffer());
      const h = {};
      resp.headers.forEach((v,k)=>{ if(!["content-encoding","transfer-encoding","content-length","connection"].includes(k)) h[k]=v; });
      await route.fulfill({ status: resp.status, headers: h, body });
    } catch { await route.abort(); }
  });
  await ctx.routeWebSocket(/supabase\.co/, (ws) => {
    const server = new WebSocket(ws.url()); const pending = [];
    server.on("open", () => { for (const m of pending) server.send(m); pending.length = 0; });
    ws.onMessage((m) => { if (server.readyState === 1) server.send(m); else pending.push(m); });
    server.on("message", (d, bin) => { try { ws.send(bin ? d : d.toString()); } catch {} });
    ws.onClose(() => { try { server.close(); } catch {} });
    server.on("close", () => { try { ws.close(); } catch {} });
    server.on("error", () => { try { ws.close(); } catch {} });
  });
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({ args: ["--use-gl=swiftshader","--enable-unsafe-swiftshader","--disable-dev-shm-usage"] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 810 } });
await bridge(ctx);
const A = await ctx.newPage();
await A.goto(`${BASE}/login`);
await A.fill("#email", process.env.TEST_ADMIN_EMAIL);
await A.fill("#password", process.env.TEST_ADMIN_PASSWORD);
await A.click('[data-testid="login-submit"]');
await A.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 60000 });
await A.goto(`${BASE}/office-lab`);
await A.locator('[data-testid="office-lab-canvas"] canvas').waitFor({ timeout: 180000 });
await A.locator('[data-testid="lab-loading"]').waitFor({ state: "detached", timeout: 180000 });
const plan = await A.evaluate(() => window.__officeLab.buildings());
const settle = async (n = 8) => {
  for (let i = 0; i < n; i++) await A.evaluate(() => new Promise((r) => requestAnimationFrame(() => r(1))));
  await sleep(900);
};
async function shot(name) {
  await settle();
  await A.screenshot({ path: `${OUT}/${name}.png` });
  const s = await A.evaluate(() => window.__officeLab.stats());
  const area = await A.evaluate(() => window.__officeGame.snapshot().area);
  console.log(`${name} — area=${area} — cam y=${s.camera[1].toFixed(1)}m — ${s.calls} calls`);
}
// outdoor first
await A.evaluate(() => window.__officeGame.teleport(880, 640));
await sleep(2500); await shot("00-plaza");
for (const id of ["ENTRANCE", "STAFF", "MEETING", "SIGNAL"]) {
  const b = plan.find((x) => x.id === id);
  // doorX/doorY are CANONICAL; cx/cy are campus units and must never be
  // fed to teleport(). Step inward from the door to stand in the room.
  const inward = b.doorY < 600 ? -1 : 1;
  await A.evaluate(([x, y]) => window.__officeGame.teleport(x, y), [b.doorX, b.doorY + inward * 150]);
  await sleep(2500);
  await shot(`${id.toLowerCase()}-interior`);
}
await browser.close();
