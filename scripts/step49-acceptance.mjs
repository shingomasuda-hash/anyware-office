// STEP 4.9 Immersive Office Lab — acceptance (dev server :3000).
// Credentials from env only; never printed. Same Node bridge as the
// STEP 3/4 harnesses (sandbox blocks direct browser HTTPS/WSS).
// NOTE on FPS: headless chromium renders WebGL through SwiftShader
// (software rasterizer) — FPS here is a floor, not the GPU number.
import { createRequire } from "module";

const req = createRequire(import.meta.url);
const { chromium } = req("playwright");
const WebSocket = req("ws");

const BASE = "http://localhost:3000";
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD;
const MEMBER_EMAIL = process.env.TEST_MEMBER_EMAIL;
const MEMBER_PASSWORD = process.env.TEST_MEMBER_PASSWORD;

const results = [];
const record = (n, p, note = "") => {
  results.push({ n, p });
  console.log(`${p ? "PASS" : "FAIL"}  ${n}${note ? ` — ${note}` : ""}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const waitFor = async (fn, ms = 20000, iv = 300) => {
  const s = Date.now();
  let last;
  while (Date.now() - s < ms) {
    last = await fn();
    if (last) return last;
    await sleep(iv);
  }
  return last;
};

async function bridge(ctx) {
  await ctx.route(/^https:\/\/[^/]*\.supabase\.co\/.*/, async (route) => {
    const r = route.request();
    const headers = { ...r.headers() };
    delete headers["host"]; delete headers["accept-encoding"]; delete headers["content-length"];
    try {
      const resp = await fetch(r.url(), { method: r.method(), headers,
        body: ["GET", "HEAD"].includes(r.method()) ? undefined : (r.postDataBuffer() ?? undefined) });
      const body = Buffer.from(await resp.arrayBuffer());
      const respHeaders = {};
      resp.headers.forEach((v, k) => { if (!["content-encoding","transfer-encoding","content-length","connection"].includes(k)) respHeaders[k] = v; });
      await route.fulfill({ status: resp.status, headers: respHeaders, body });
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

const login = async (page, email, password) => {
  await page.goto(`${BASE}/login`);
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click('[data-testid="login-submit"]');
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 60000 });
};
const snap = (p) => p.evaluate(() => window.__officeGame?.snapshot() ?? null);
const teleport = (p, x, y) => p.evaluate(([tx, ty]) => window.__officeGame?.teleport(tx, ty), [x, y]);
const roster = (p) => p.evaluate(() => window.__officeRealtime?.roster() ?? null);
const remoteOf = async (p) => (await roster(p))?.find((r) => !r.isSelf) ?? null;
const labReady = async (p) => {
  await p.locator('[data-testid="office-lab-canvas"] canvas').waitFor({ timeout: 120000 });
  await p.locator('[data-testid="lab-loading"]').waitFor({ state: "detached", timeout: 120000 });
};
const waitLive = (p) =>
  waitFor(async () =>
    (await p.locator('[data-testid="realtime-status"]').textContent().catch(() => ""))?.includes("LIVE"), 40000);
// Input settle: under software WebGL a shader/texture-compile stall can
// swallow a whole keydown..keyup window (both events process back to
// back once the stall ends). Require 3 consecutive rendered frames with
// a responsive main thread before dispatching synthetic keyboard input.
const settleInput = async (p, frameMs = 4000, frames = 2, budgetMs = 60000) => {
  const start = Date.now();
  let ok = 0;
  while (ok < frames && Date.now() - start < budgetMs) {
    const t0 = Date.now();
    await p.evaluate(() => new Promise((r) => requestAnimationFrame(() => r(1))));
    ok = Date.now() - t0 < frameMs ? ok + 1 : 0;
  }
};

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

try {
  // ── route auth ──────────────────────────────────────────────────────
  console.log("=== ROUTE AUTH ===");
  {
    const ctxG = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await bridge(ctxG);
    const G = await ctxG.newPage();
    await G.goto(`${BASE}/office-lab`, { waitUntil: "domcontentloaded" });
    await sleep(1500);
    const url = G.url();
    record("anonymous → redirected to /login?next=/office-lab",
      url.includes("/login") && url.includes("office-lab"), url);
    await ctxG.close();
  }

  // ── A (admin, PC) enters the lab ───────────────────────────────────
  const ctxA = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await bridge(ctxA);
  const A = await ctxA.newPage();
  const errsA = [];
  A.on("pageerror", (e) => errsA.push(e.message.slice(0, 160)));
  await login(A, ADMIN_EMAIL, ADMIN_PASSWORD);
  await A.goto(`${BASE}/office-lab`, { waitUntil: "domcontentloaded" });
  await labReady(A);
  record("A: WebGL lab canvas loads (member/admin route)", true);
  record("A: realtime LIVE in lab", Boolean(await waitLive(A)));

  // movement + collision (same sim contract as 2D). Before the first
  // keypress, wait until frames are actually flowing — a real user
  // can't press a key before the first frame is on screen, and under
  // software WebGL the first frames arrive seconds after "ready".
  console.log("\n=== MOVEMENT / COLLISION / AREAS ===");
  await settleInput(A);
  const s0 = await snap(A);
  await A.keyboard.down("w");
  await sleep(4000);
  await A.keyboard.up("w");
  const s1 = await snap(A);
  record("WASD moves the avatar", s0 && s1 && s1.y < s0.y - 60, `dy=${s0.y - s1.y}`);
  await teleport(A, 760, 1150); // inside ENTRANCE, south of reception… walk into reception rect (716,936,144,40)
  await teleport(A, 788, 1000);
  await A.keyboard.down("s");
  await sleep(300);
  await A.keyboard.up("s");
  const c0 = await snap(A);
  // Input is camera-relative now: after the southward tap the camera
  // parks behind the south-facing avatar, so "press back" (s) turns
  // around and walks NORTH into the reception counter.
  await A.keyboard.down("s");
  await sleep(1200);
  await A.keyboard.up("s");
  const c1 = await snap(A);
  record("collision blocks at the reception counter", c1.y >= 976 - 14, `stopped y=${c1.y}`);
  // walls: run west into ENTRANCE west wall
  await teleport(A, 720, 1100);
  await A.keyboard.down("a");
  await sleep(1200);
  await A.keyboard.up("a");
  const c2 = await snap(A);
  record("collision blocks at the west wall", c2.x >= 680 + 8, `stopped x=${c2.x}`);

  // 3 areas walk/detection
  const areas = [];
  for (const [ax, ay, name] of [[880, 1100, "ENTRANCE"], [189, 300, "STAFF"], [1227, 330, "MEETING"]]) {
    await teleport(A, ax, ay);
    const ok = await waitFor(async () => {
      const t = await A.locator('[data-testid="hud-area"]').textContent().catch(() => "");
      return t?.trim() === name;
    }, 8000);
    areas.push(ok);
    if (name === "MEETING") {
      const meeting = await waitFor(async () =>
        (await roster(A))?.find((r) => r.isSelf)?.status === "meeting", 8000);
      record("MEETING → effectiveStatus meeting", Boolean(meeting));
    }
  }
  record("3 prototype areas detected (ENTRANCE/STAFF/MEETING)", areas.every(Boolean), `${areas.filter(Boolean).length}/3`);
  await teleport(A, 880, 1100);
  const statusBack = await waitFor(async () =>
    (await roster(A))?.find((r) => r.isSelf)?.status === "available", 8000);
  record("leave MEETING → status restored", Boolean(statusBack));

  // ── B (member, mobile) joins ───────────────────────────────────────
  console.log("\n=== TWO USERS (A PC + B mobile) ===");
  const ctxB = await browser.newContext({
    viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true,
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  });
  await bridge(ctxB);
  const B = await ctxB.newPage();
  const errsB = [];
  B.on("pageerror", (e) => errsB.push(e.message.slice(0, 160)));
  await login(B, MEMBER_EMAIL, MEMBER_PASSWORD);
  await B.goto(`${BASE}/office-lab`, { waitUntil: "domcontentloaded" });
  await labReady(B);
  record("B: mobile lab loads", true);
  record("B: realtime LIVE", Boolean(await waitLive(B)));
  const bothSee = await waitFor(async () =>
    (await roster(A))?.length === 2 && (await roster(B))?.length === 2, 30000);
  record("presence 2 on both (A sees B, B sees A)", Boolean(bothSee));

  // remote movement A -> B. Two attempts: right after B joins, A's
  // renderer compiles B's avatar materials, and that stall can swallow
  // the first keypress entirely (same mechanism as the first-frame
  // WASD case) — the second attempt runs on a warm renderer.
  let abTravel = 0;
  for (let attempt = 0; attempt < 3 && abTravel <= 80; attempt++) {
    await settleInput(A);
    const rb0 = await remoteOfPos(B);
    // Hold long enough that a fixed-timestep tick lands between
    // keydown and keyup even when a render stall queues both events.
    await A.keyboard.down("d");
    await sleep(4000);
    await A.keyboard.up("d");
    await sleep(1200);
    const rb1 = await remoteOfPos(B);
    abTravel = rb0 && rb1 ? Math.hypot(rb1.x - rb0.x, rb1.y - rb0.y) : 0;
  }
  record("A movement reflected on B (remote interpolation)", abTravel > 80,
    `travel=${Math.round(abTravel)}`);

  // B joystick -> A
  const joy = B.locator('[data-testid="joystick"]');
  const jb = await joy.boundingBox();
  record("B: joystick visible on mobile lab", Boolean(jb));
  const ra0 = await remoteOfPos(A);
  await B.mouse.move(jb.x + jb.width / 2, jb.y + jb.height / 2);
  await B.mouse.down();
  await B.mouse.move(jb.x + jb.width / 2, jb.y + jb.height / 2 - 40, { steps: 4 });
  await sleep(1500);
  await B.mouse.up();
  await sleep(800);
  const ra1 = await remoteOfPos(A);
  record("B joystick movement reflected on A",
    ra0 && ra1 && Math.hypot(ra1.x - ra0.x, ra1.y - ra0.y) > 80,
    ra0 && ra1 ? `travel=${Math.round(Math.hypot(ra1.x - ra0.x, ra1.y - ra0.y))}` : "no sample");

  // status change B -> A
  await B.locator('[data-testid="status-switcher"]').tap();
  await B.locator('[data-testid="status-focus"]').tap();
  const focusSeen = await waitFor(async () => (await remoteOf(A))?.status === "focus", 15000);
  record("B status focus → A roster/3D status", Boolean(focusSeen));
  await B.locator('[data-testid="status-switcher"]').tap();
  await B.locator('[data-testid="status-available"]').tap();
  await waitFor(async () => (await remoteOf(A))?.status === "available", 15000);

  // profile card via 3D avatar click on A (project B's avatar to screen)
  console.log("\n=== PROFILE INTERACTION (3D click) ===");
  await teleport(A, 830, 1100);
  // Place B 100 units IN FRONT of A's current facing — the chase
  // camera parks behind A, so "in front" is the only spot guaranteed
  // to be on screen regardless of which way the previous tests left
  // A pointing.
  {
    const sA = await snap(A);
    const F = { up: [0, -100], down: [0, 100], left: [-100, 0], right: [100, 0] }[sA.direction];
    await teleport(B, 830 + F[0], 1100 + F[1]);
  }
  await sleep(900);
  const bPos = await A.evaluate(() => {
    const r = window.__officeRealtime?.remotes()?.[0];
    if (!r) return null;
    return window.__officeGame?.worldToScreen(r.x, r.y) ?? null;
  });
  record("A: projector resolves B avatar screen pos", Boolean(bPos));
  // Re-project before every click (remote avatar interpolates toward its
  // target, so a stale projection misses) and sweep torso-height offsets.
  // Per-attempt wait is generous: under software WebGL a click→React
  // render round-trip can take several seconds, and clicking again
  // while the card is opening would close it.
  let cardUp = false;
  for (const dy of [-40, -20, -55, 0, -70]) {
    const dbg = await A.evaluate(() => ({
      snap: window.__officeGame?.snapshot(),
      remote: window.__officeRealtime?.remotes()?.[0] ?? null,
      cam: window.__officeLab?.stats()?.camera ?? null,
    }));
    const p = await A.evaluate(() => {
      const r = window.__officeRealtime?.remotes()?.[0];
      if (!r) return null;
      return window.__officeGame?.worldToScreen(r.x, r.y) ?? null;
    });
    console.log(`DBG card try dy=${dy} p=${JSON.stringify(p)} snap=${JSON.stringify(dbg.snap)} remote=${dbg.remote ? Math.round(dbg.remote.x) + "," + Math.round(dbg.remote.y) : "none"} cam=${JSON.stringify(dbg.cam)}`);
    if (!p) continue;
    if (p.x < 0 || p.x > 1440 || p.y < 0 || p.y > 900) { console.log("DBG offscreen, skip"); continue; }
    await A.mouse.click(p.x, p.y + dy);
    cardUp = await A.locator('[data-testid="profile-card"]')
      .waitFor({ timeout: 7000 }).then(() => true).catch(() => false);
    if (cardUp) break;
  }
  if (!cardUp) await A.screenshot({ path: "card-fail.png", timeout: 90000 }).catch(() => {});
  record("A: click B 3D avatar → profile card", cardUp);
  if (cardUp) {
    await A.keyboard.press("Escape");
    await A.locator('[data-testid="profile-card"]').waitFor({ state: "detached", timeout: 5000 });
  }
  // self card
  const selfPos = await A.evaluate(() => {
    const s = window.__officeGame?.snapshot();
    return s ? window.__officeGame?.worldToScreen(s.x, s.y) : null;
  });
  await A.mouse.click(selfPos.x, selfPos.y - 40);
  const selfCard = await A.locator('[data-testid="profile-card"]').waitFor({ timeout: 8000 }).then(() => true).catch(() => false);
  record("A: click own 3D avatar → self card", selfCard &&
    (await A.locator('[data-testid="profile-card"]').textContent().catch(() => "")).includes("YOU"));
  await A.keyboard.press("Escape");

  // screenshots: entrance + remote user (D) and mobile (E) — long
  // timeouts, software rendering needs several seconds per frame here
  await sleep(600);
  await A.screenshot({ path: "lab-two-users.png", timeout: 90000 });
  await B.screenshot({ path: "lab-mobile.png", timeout: 90000 });

  // mobile: no horizontal scroll
  const scrollB = await B.evaluate(() => ({ doc: document.documentElement.scrollWidth, inner: window.innerWidth }));
  record("mobile: no horizontal scroll", scrollB.doc <= scrollB.inner, JSON.stringify(scrollB));

  // perf stats (software-rendered floor; calls/tris are env-independent)
  const stats = await A.evaluate(() => window.__officeLab?.stats() ?? null);
  console.log(`INFO lab stats: ${JSON.stringify(stats)}`);
  // Budget revised 900 → 1000 for the STEP 4.9.1 metaverse world layer
  // (city skyline, portal gate, holo set-pieces). Triangle budget and
  // the adaptive-DPR guard are unchanged.
  record("draw calls within budget (< 1000)", stats && stats.calls < 1000, `calls=${stats?.calls}`);
  record("triangles within budget (< 400k)", stats && stats.triangles < 400000, `tris=${stats?.triangles}`);
  record("DPR capped (<= 2)", stats && stats.dpr <= 2, `dpr=${stats?.dpr}`);

  // ── /office 2D regression (same session) ───────────────────────────
  console.log("\n=== /office 2D REGRESSION + CLEANUP ===");
  await A.goto(`${BASE}/office`, { waitUntil: "domcontentloaded" });
  await A.locator('[data-testid="office-canvas"]').waitFor({ timeout: 30000 });
  record("A: 2D /office still renders after lab", true);
  const live2d = await waitLive(A);
  record("A: 2D office realtime LIVE after lab", Boolean(live2d));
  const s2d0 = await snap(A);
  await A.keyboard.down("d");
  await sleep(700);
  await A.keyboard.up("d");
  const s2d1 = await snap(A);
  record("A: 2D movement works after lab", s2d0 && s2d1 && s2d1.x > s2d0.x + 40);
  // WebGL cleanup: lab canvas gone, exactly one 2D canvas, channels sane
  const canvases = await A.evaluate(() => ({
    lab: document.querySelectorAll('[data-testid="office-lab-canvas"]').length,
    all: document.querySelectorAll("canvas").length,
  }));
  record("lab canvas cleaned up on route leave", canvases.lab === 0, JSON.stringify(canvases));
  const ch = await A.evaluate(() => window.__officeRealtime?.channels() ?? null);
  record("channels deduped after lab→office", ch && new Set(ch).size === ch.length && ch.length <= 3, JSON.stringify(ch));

  record("no page errors (A)", errsA.length === 0, errsA[0] ?? "");
  record("no page errors (B)", errsB.length === 0, errsB[0] ?? "");

  await ctxA.close();
  await ctxB.close();
} catch (e) {
  console.error(`RUNNER ERROR: ${e?.stack ?? e}`);
  process.exitCode = 3;
} finally {
  await browser.close();
}

async function remoteOfPos(p) {
  return p.evaluate(() => {
    const r = window.__officeRealtime?.remotes()?.[0];
    return r ? { x: r.x, y: r.y } : null;
  });
}

const failed = results.filter((r) => !r.p);
console.log(`\n=== STEP 4.9 ACCEPTANCE: ${results.length - failed.length}/${results.length} PASS ===`);
if (failed.length) for (const f of failed) console.log(`FAILED: ${f.n}`);
process.exit(failed.length ? 1 : 0);
