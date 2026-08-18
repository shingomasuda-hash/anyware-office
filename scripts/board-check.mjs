// LIVE BOARD CHECK — does the office's own data reach the wall, and does
// sitting down in the meeting pavilion offer the meeting you are in?
import { createRequire } from "module";
import { mkdirSync } from "fs";
const req = createRequire(import.meta.url);
const { chromium } = req("playwright");
const WebSocket = req("ws");
const BASE = "http://localhost:3000";
const OUT = process.env.SHOT_DIR ?? "/tmp/board";
mkdirSync(OUT, { recursive: true });

async function bridge(ctx) {
  await ctx.route(/^https:\/\/[^/]*\.supabase\.co\/.*/, async (route) => {
    const r = route.request();
    const headers = { ...r.headers() };
    delete headers["host"]; delete headers["accept-encoding"]; delete headers["content-length"];
    try {
      const resp = await fetch(r.url(), { method: r.method(), headers,
        body: ["GET","HEAD"].includes(r.method()) ? undefined : (r.postDataBuffer() ?? undefined) });
      let body = Buffer.from(await resp.arrayBuffer());
      // Opt-in rehearsal: the office database has no meetings, so with
      // FAKE_MEETING=1 the meetings SELECT is answered with one that is
      // running right now. Nothing is written anywhere — this only
      // proves the wall and the JOIN button react to real rows.
      if (process.env.FAKE_MEETING && /\/rest\/v1\/meetings\?/.test(r.url()) && r.method() === "GET") {
        const now = Date.now();
        const iso = (ms) => new Date(ms).toISOString();
        body = Buffer.from(JSON.stringify([
          { id: "fake-1", title: "Q3 キャンペーン定例", meeting_room_id: null,
            start_at: iso(now - 12 * 60000), end_at: iso(now + 48 * 60000),
            meeting_url: "https://zoom.us/j/0000000000", client_name: "ANYWARE",
            host_id: null, status: "in_progress", visible_roles: ["member", "admin"],
            created_at: iso(now), updated_at: iso(now) },
          { id: "fake-2", title: "採用ブランディング 打合せ", meeting_room_id: null,
            start_at: iso(now + 90 * 60000), end_at: iso(now + 150 * 60000),
            meeting_url: null, client_name: "ANYWARE", host_id: null,
            status: "scheduled", visible_roles: ["member", "admin"],
            created_at: iso(now), updated_at: iso(now) },
        ]));
      }
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

// what the database actually holds today, read through the admin table
await A.goto(`${BASE}/admin/meetings`);
await sleep(3500);
const rows = await A.evaluate(() =>
  Array.from(document.querySelectorAll("table tbody tr")).map((tr) =>
    Array.from(tr.querySelectorAll("td")).map((td) => td.textContent.trim()).join(" | "),
  ),
);
console.log("MEETINGS IN DB:", rows.length, "table rows");
const mtext = await A.evaluate(() => document.body.innerText.replace(/\n+/g, " | ").slice(0, 900));
console.log("  page:", mtext);

await A.goto(`${BASE}/admin/projects`);
await sleep(3500);
const prows = await A.evaluate(() =>
  Array.from(document.querySelectorAll("table tbody tr")).map((tr) =>
    Array.from(tr.querySelectorAll("td")).map((td) => td.textContent.trim()).join(" | "),
  ),
);
console.log("PROJECTS IN DB:", prows.length, "table rows");
const ptext = await A.evaluate(() => document.body.innerText.replace(/\n+/g, " | ").slice(0, 700));
console.log("  page:", ptext);

await A.goto(`${BASE}/office-lab`);
await A.locator('[data-testid="office-lab-canvas"] canvas').waitFor({ timeout: 180000 });
await A.locator('[data-testid="lab-loading"]').waitFor({ state: "detached", timeout: 180000 });
const settle = async (n = 8) => {
  for (let i = 0; i < n; i++) await A.evaluate(() => new Promise((r) => requestAnimationFrame(() => r(1))));
  await sleep(900);
};

const seats = await A.evaluate(() => window.__officeLab.seats());
const main = seats.find((s) => s.id.startsWith("MEETING-MAIN"));
await A.evaluate(([x, y]) => window.__officeGame.teleport(x, y), [main.ax, main.ay]);
await sleep(2200);
await settle();
await A.screenshot({ path: `${OUT}/01-meeting-standing.png` });

const seatBtn = A.locator('[data-testid="seat-action"]');
console.log("seat button:", (await seatBtn.count()) ? await seatBtn.textContent() : "ABSENT");
if (await seatBtn.count()) await seatBtn.click();
await sleep(2600);
await settle();
await A.screenshot({ path: `${OUT}/02-meeting-seated.png` });

const chip = A.locator('[data-testid="checked-in"]');
console.log("checked in:", (await chip.count()) ? await chip.textContent() : "ABSENT");
const join = A.locator('[data-testid="join-meeting"]');
if (await join.count()) {
  console.log("JOIN button:", await join.textContent());
  console.log("JOIN href  :", (await join.getAttribute("href")).replace(/^(https?:\/\/[^/]+).*/, "$1/…"));
  console.log("JOIN label :", await join.getAttribute("aria-label"));
} else {
  console.log("JOIN button: ABSENT (no joinable meeting today)");
}

// STAFF wall: the project board
const staffSeat = seats.find((s) => s.id === "STAFF-DESK-02");
await A.evaluate(([x, y]) => window.__officeGame.teleport(x, y), [staffSeat.ax, staffSeat.ay]);
await sleep(2400);
await settle();
await A.screenshot({ path: `${OUT}/03-staff-standing.png` });
const staffBtn = A.locator('[data-testid="seat-action"]');
if (await staffBtn.count()) await staffBtn.click();
await sleep(2600); await settle();
await A.screenshot({ path: `${OUT}/04-staff-seated.png` });
console.log("staff checked in:", (await A.locator('[data-testid="checked-in"]').count()) ? await A.locator('[data-testid="checked-in"]').textContent() : "ABSENT");
if (await staffBtn.count()) await staffBtn.click();
await sleep(1800);
const s = await A.evaluate(() => window.__officeLab.stats());
console.log(`STAFF seat: ${s.calls} calls, ${Math.round(s.triangles/1000)}k tris`);

// SIGNAL seats were re-derived from the district's own layout — check
// that sitting lands on the stool it was authored against.
for (const id of ["SIGNAL-EDIT-01", "SIGNAL-ARENA-01", "SIGNAL-STUDIO-01"]) {
  const sg = seats.find((x) => x.id === id);
  await A.evaluate(([x, y]) => window.__officeGame.teleport(x, y), [sg.ax, sg.ay]);
  await sleep(2200);
  const btn = A.locator('[data-testid="seat-action"]');
  if (await btn.count()) await btn.click();
  await sleep(2400); await settle();
  await A.screenshot({ path: `${OUT}/05-${id.toLowerCase()}.png` });
  const c = A.locator('[data-testid="checked-in"]');
  console.log(`${id}:`, (await c.count()) ? await c.textContent() : "NOT SEATED");
}

// draw-call sweep: plaza + each finished interior
const plan = await A.evaluate(() => window.__officeLab.buildings());
await A.evaluate(() => window.__officeGame.teleport(880, 640));
await sleep(2200); await settle();
{ const q = await A.evaluate(() => window.__officeLab.stats());
  console.log(`plaza: ${q.calls} calls, ${Math.round(q.triangles/1000)}k tris`); }
for (const id of ["ENTRANCE", "STAFF", "MEETING", "SIGNAL"]) {
  const b = plan.find((x) => x.id === id);
  const inward = b.doorY < 600 ? -1 : 1;
  await A.evaluate(([x, y]) => window.__officeGame.teleport(x, y), [b.doorX, b.doorY + inward * 150]);
  await sleep(2200); await settle();
  const q = await A.evaluate(() => window.__officeLab.stats());
  console.log(`${id}: ${q.calls} calls, ${Math.round(q.triangles/1000)}k tris`);
}
await browser.close();
