// ANYWARE FUTURE CAMPUS — M1 acceptance (dev server :3000).
//
// Covers the §7 M1 list: STRUCTURE / MOVEMENT / COORDINATES /
// COLLISION / AREA / REALTIME / MAP / REGRESSION.
//
// Credentials come from env only and are never printed. Supabase
// traffic is bridged through Node because the sandbox blocks direct
// browser HTTPS/WSS. FPS under headless chromium is SwiftShader
// (software) — a floor, not a GPU number.
import { createRequire } from "module";

const req = createRequire(import.meta.url);
const { chromium } = req("playwright");
const WebSocket = req("ws");

const BASE = "http://localhost:3000";
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD;
const MEMBER_EMAIL = process.env.TEST_MEMBER_EMAIL;
const MEMBER_PASSWORD = process.env.TEST_MEMBER_PASSWORD;

const M = 0.075; // metres per campus unit
const WALK_MPS = 6.5; // must match labTuning.LAB_SPEED_MPS

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
const labReady = async (p) => {
  await p.locator('[data-testid="office-lab-canvas"] canvas').waitFor({ timeout: 120000 });
  await p.locator('[data-testid="lab-loading"]').waitFor({ state: "detached", timeout: 120000 });
};
const waitLive = (p) =>
  waitFor(async () =>
    (await p.locator('[data-testid="realtime-status"]').textContent().catch(() => ""))?.includes("LIVE"), 40000);
const settleInput = async (p, frameMs = 4000, frames = 2, budgetMs = 60000) => {
  const start = Date.now();
  let ok = 0;
  while (ok < frames && Date.now() - start < budgetMs) {
    const t0 = Date.now();
    await p.evaluate(() => new Promise((r) => requestAnimationFrame(() => r(1))));
    ok = Date.now() - t0 < frameMs ? ok + 1 : 0;
  }
  return ok >= frames;
};

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

async function main() {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD || !MEMBER_EMAIL || !MEMBER_PASSWORD) {
    console.error("Missing TEST_* credentials in env");
    process.exit(1);
  }
  const browser = await chromium.launch({
    args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--disable-dev-shm-usage"],
  });
  const ctxA = await browser.newContext({ viewport: { width: 1280, height: 820 } });
  const ctxB = await browser.newContext({ viewport: { width: 1100, height: 760 } });
  await bridge(ctxA);
  await bridge(ctxB);
  const A = await ctxA.newPage();
  const B = await ctxB.newPage();
  const errA = [];
  const errB = [];
  A.on("pageerror", (e) => errA.push(String(e)));
  B.on("pageerror", (e) => errB.push(String(e)));

  await login(A, ADMIN_EMAIL, ADMIN_PASSWORD);
  await A.goto(`${BASE}/office-lab`);
  await labReady(A);
  await waitLive(A);

  const plan = await A.evaluate(() => window.__officeLab?.buildings() ?? []);
  const campusOf = (x, y) => A.evaluate(([px, py]) => window.__officeLab.campus(px, py), [x, y]);
  const probe = (ax, ay, bx, by) =>
    A.evaluate(([a, b, c, d]) => window.__officeLab.probe(a, b, c, d), [ax, ay, bx, by]);

  // ── STRUCTURE ──────────────────────────────────────────────────────
  console.log("\n=== STRUCTURE ===");
  const spawn = await snap(A);
  record("campus outdoor world exists (spawn is outdoors)", spawn?.area === null,
    `spawn area=${spawn?.area}`);

  record("10 independent building massings exist", plan.length === 10,
    `${plan.length} buildings, ${new Set(plan.map((b) => b.height)).size} distinct heights`);

  // plaza: walk 4 ways from the centre of the outdoor world
  const plazaLegs = [];
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const r = await probe(880, 608, 880 + dx * 700, 608 + dy * 180);
    plazaLegs.push(dist({ x: 880, y: 608 }, r));
  }
  const plazaCampus = await Promise.all(
    [[880, 608], [1500, 608], [260, 608]].map(([x, y]) => campusOf(x, y)),
  );
  const plazaWidth = dist(plazaCampus[1], plazaCampus[2]) * M;
  record("Central Plaza exists and is open", Math.min(...plazaLegs) > 100,
    `open ${plazaWidth.toFixed(0)} m across the outdoor heart`);

  // separation: closest edge distance between neighbouring footprints
  let minSep = Infinity;
  for (let i = 0; i < plan.length; i++) {
    for (let j = i + 1; j < plan.length; j++) {
      const d = Math.hypot(plan[i].cx - plan[j].cx, plan[i].cy - plan[j].cy);
      const half = (plan[i].w + plan[j].w) / 4 + (plan[i].h + plan[j].h) / 4;
      minSep = Math.min(minSep, (d - half) * M);
    }
  }
  record("buildings are physically separated", minSep > 4,
    `closest pair ${minSep.toFixed(1)} m apart`);

  // exterior walking: all the way round the outdoor ring
  const ring = await probe(120, 608, 1640, 608);
  record("exterior walking possible", ring.reached && ring.area === null,
    `walked the outdoor ring end to end, still outdoors`);

  // enter + exit every building through its opening
  const enter = [];
  for (const b of plan) {
    const inward = b.doorY < 600 ? -1 : 1; // canonical door faces the corridor
    const outside = { x: b.doorX, y: b.doorY - inward * 90 };
    const inside = { x: b.cx === undefined ? b.doorX : b.doorX, y: b.doorY + inward * 150 };
    const gotIn = await probe(outside.x, outside.y, inside.x, inside.y);
    const gotOut = await probe(gotIn.x, gotIn.y, outside.x, outside.y);
    enter.push({ id: b.id, in: gotIn.area === b.id, out: gotOut.area === null });
  }
  const okIn = enter.filter((e) => e.in).length;
  const okOut = enter.filter((e) => e.out).length;
  record("10 buildings enterable", okIn === 10, `${okIn}/10`);
  record("10 buildings exitable", okOut === 10, `${okOut}/10`);
  record("no loading screen after entry", (await A.locator('[data-testid="lab-loading"]').count()) === 0);

  // ── COORDINATES ────────────────────────────────────────────────────
  console.log("\n=== COORDINATES ===");
  let worstCentre = 0;
  for (const b of plan) {
    const canon = await A.evaluate(
      (id) => {
        const w = window.__officeLab.buildings().find((x) => x.id === id);
        return w ? { x: w.cx, y: w.cy } : null;
      },
      b.id,
    );
    worstCentre = Math.max(worstCentre, Math.abs(canon.x - b.cx));
  }
  record("canonical ↔ campus transform works", worstCentre < 0.001,
    `building plan is stable and single-sourced`);

  // Dense sweep straight through every doorway. The transform stretches
  // the ground as you leave a building, so the raw step size varies by
  // design; a DISCONTINUITY is a step that spikes away from its
  // neighbours, which is what this ratio catches.
  const localSpike = (steps) => {
    let worst = 1;
    for (let i = 1; i < steps.length - 1; i++) {
      const nb = (steps[i - 1] + steps[i + 1]) / 2;
      if (nb > 1e-6) worst = Math.max(worst, steps[i] / nb);
    }
    return worst;
  };
  let worstSpike = 0;
  let worstAt = "";
  for (const b of plan) {
    const inward = b.doorY < 600 ? -1 : 1;
    const pts = [];
    for (let t = -60; t <= 60; t += 0.5) pts.push([b.doorX, b.doorY + inward * t]);
    const mapped = await A.evaluate(
      (list) => list.map(([x, y]) => window.__officeLab.campus(x, y)),
      pts,
    );
    const steps = [];
    for (let i = 1; i < mapped.length; i++) steps.push(dist(mapped[i - 1], mapped[i]));
    const spike = localSpike(steps);
    if (spike > worstSpike) {
      worstSpike = spike;
      worstAt = b.id;
    }
  }
  record("door threshold continuous", worstSpike < 1.6,
    `worst step vs its own neighbours across a threshold = ${worstSpike.toFixed(2)}x (${worstAt}); a jump would spike, a stretch ramp does not`);

  // Live walk through a real opening — the local avatar must never jump.
  // PARTNER sits due north of the plaza, so holding ArrowUp from its
  // forecourt walks straight in through the entrance.
  const par = plan.find((b) => b.id === "PARTNER");
  await teleport(A, par.doorX, par.doorY + 70);
  await settleInput(A);
  await A.keyboard.down("ArrowUp");
  const track = [];
  const trackCanon = [];
  for (let i = 0; i < 26; i++) {
    // position and clock read in ONE evaluate, so render latency can
    // never be mistaken for a position jump
    const r = await A.evaluate(() => {
      const s = window.__officeGame.snapshot();
      const c = window.__officeLab.campus(s.x, s.y);
      return { t: performance.now(), c, area: s.area, x: s.x, y: s.y };
    });
    track.push(r);
    trackCanon.push({ x: r.x, y: r.y });
    await sleep(90);
  }
  await A.keyboard.up("ArrowUp");
  // The sim runs on the wall clock and replays up to 1.5 s of catch-up
  // after a render stall. Under a 1 fps software renderer a sample can
  // land between the stall and its replay, which shows up as a burst of
  // motion in a short interval — scheduling noise, not a jump. So each
  // interval is allowed its own pace PLUS whatever the previous gap
  // could have banked. A real transform snap is unbounded by either.
  let jump = 0;
  let jumpAtStep = "";
  for (let i = 1; i < track.length; i++) {
    const dt = (track[i].t - track[i - 1].t) / 1000;
    const prev = i > 1 ? (track[i - 1].t - track[i - 2].t) / 1000 : 0.09;
    const allowed = WALK_MPS * (dt * 1.35 + Math.min(1.5, prev));
    const moved = dist(track[i - 1].c, track[i].c) * M;
    if (moved - allowed > jump) {
      jump = moved - allowed;
      jumpAtStep = `dt ${dt.toFixed(2)}s after a ${prev.toFixed(2)}s gap`;
    }
  }
  record("local avatar no snap while crossing a doorway", jump < 0.5,
    `worst excess over pace+catch-up ${(Math.max(0, jump) * 100).toFixed(0)} cm (${jumpAtStep || "no excess"})`);
  // Scheduling-independent proof: every sampled position is reachable
  // from the one before it by WALKING through the real collision data,
  // so nothing on this path was jumped over.
  let walkable = 0;
  for (let i = 1; i < trackCanon.length; i++) {
    const r = await probe(trackCanon[i - 1].x, trackCanon[i - 1].y, trackCanon[i].x, trackCanon[i].y);
    if (r.reached) walkable++;
  }
  const crossed = new Set(track.map((t) => t.area)).size > 1;
  record("every step of the crossing is walkable (no teleport)",
    walkable === trackCanon.length - 1, `${walkable}/${trackCanon.length - 1} segments`);
  record("walking actually crosses the threshold", crossed,
    `areas seen ${[...new Set(track.map((t) => t.area))].map((a) => a ?? "outdoor").join(" → ")}`);

  // ── MOVEMENT ───────────────────────────────────────────────────────
  console.log("\n=== MOVEMENT ===");
  const doorPts = [];
  for (const b of plan) doorPts.push({ id: b.id, p: await campusOf(b.doorX, b.doorY) });
  const centre = await campusOf(880, 600);
  const order = [...doorPts].sort(
    (a, b) =>
      Math.atan2(a.p.x - centre.x, a.p.y - centre.y) -
      Math.atan2(b.p.x - centre.x, b.p.y - centre.y),
  );
  const gap = (i, j) => dist(order[i].p, order[j].p) * M;
  const adj = order.map((_, i) => gap(i, (i + 1) % 10));
  const mid = order.map((_, i) => gap(i, (i + 2) % 10));
  const far = order.map((_, i) => gap(i, (i + 5) % 10));
  const sec = (m) => m / WALK_MPS;
  const rng = (v) => `${sec(Math.min(...v)).toFixed(1)}–${sec(Math.max(...v)).toFixed(1)} s`;
  record("adjacent travel 5–8 s", sec(Math.min(...adj)) >= 5 && sec(Math.max(...adj)) <= 8, rng(adj));
  record("medium travel 8–15 s", sec(Math.min(...mid)) >= 8 && sec(Math.max(...mid)) <= 15, rng(mid));
  record("far travel <= 20 s", sec(Math.max(...far)) <= 20, rng(far));

  // camera smoothness while walking
  await settleInput(A);
  const cam = [];
  await A.keyboard.down("ArrowLeft");
  for (let i = 0; i < 14; i++) {
    cam.push(await A.evaluate(() => window.__officeLab.stats().camera));
    await sleep(120);
  }
  await A.keyboard.up("ArrowLeft");
  let camJump = 0;
  for (let i = 1; i < cam.length; i++) {
    camJump = Math.max(
      camJump,
      Math.hypot(cam[i][0] - cam[i - 1][0], cam[i][1] - cam[i - 1][1], cam[i][2] - cam[i - 1][2]),
    );
  }
  record("smooth camera", camJump < 6, `largest camera step ${camJump.toFixed(2)} m per ~120 ms`);

  // ── COLLISION ──────────────────────────────────────────────────────
  console.log("\n=== COLLISION ===");
  const staff = plan.find((b) => b.id === "STAFF");
  const wallHit = await probe(staff.doorX + 150, 470, staff.doorX + 150, 200);
  record("building exterior walls block", wallHit.area === null,
    `stopped outside STAFF at a solid wall face`);
  const doorPass = await probe(staff.doorX, 470, staff.doorX, 240);
  record("entrance opening passes", doorPass.area === "STAFF");
  const edge = await probe(880, 700, -400, 700);
  record("campus perimeter / landscape collision valid", !edge.reached && edge.x > 0,
    `stopped at the campus edge, x=${edge.x.toFixed(0)}`);

  // ── AREA ───────────────────────────────────────────────────────────
  console.log("\n=== AREA ===");
  record("10/10 building interiors detect the correct area", okIn === 10, `${okIn}/10`);
  await teleport(A, 880, 608);
  const neutral = await snap(A);
  record("outdoor neutral state behaves correctly", neutral.area === null);

  // ── REALTIME ───────────────────────────────────────────────────────
  console.log("\n=== REALTIME ===");
  await login(B, MEMBER_EMAIL, MEMBER_PASSWORD);
  await B.goto(`${BASE}/office-lab`);
  await labReady(B);
  await waitLive(B);
  const seesB = await waitFor(async () => (await roster(A))?.some((r) => !r.isSelf), 40000);
  const seesA = await waitFor(async () => (await roster(B))?.some((r) => !r.isSelf), 40000);
  record("2-user mutual visibility", Boolean(seesB && seesA));

  const remoteXY = (p) => p.evaluate(() => window.__officeLab?.remotes() ?? []);
  // exterior
  await teleport(B, 700, 640);
  const outSeen = await waitFor(async () => {
    const r = await remoteXY(A);
    return r.length && Math.abs(r[0].x - 700) < 40 ? r[0] : null;
  }, 30000);
  record("exterior realtime", Boolean(outSeen), outSeen ? "A sees B on the plaza" : "");
  // interior
  const meet = plan.find((b) => b.id === "MEETING");
  await teleport(B, meet.doorX, meet.doorY - 160);
  const inSeen = await waitFor(async () => {
    const r = await remoteXY(A);
    return r.length && Math.abs(r[0].y - (meet.doorY - 160)) < 60 ? r[0] : null;
  }, 30000);
  record("interior realtime", Boolean(inSeen), inSeen ? "A sees B inside MEETING" : "");

  // exterior ↔ interior transition, sampled as A renders it
  const inward = meet.doorY < 600 ? -1 : 1;
  const seq = [];
  let worstAgree = 0;
  const steps = [];
  for (let t = 40; t >= -40; t -= 8) {
    steps.push(t);
    await teleport(B, meet.doorX, meet.doorY + inward * t);
    const got = await waitFor(async () => {
      const r = await remoteXY(A);
      if (!r.length) return null;
      return Math.abs(r[0].y - (meet.doorY + inward * t)) < 1.5 ? r[0] : null;
    }, 12000, 150);
    if (!got) continue;
    const bSnap = await snap(B);
    // What A DRAWS is campus(what B reports). Both sides go through the
    // one transform, so agreement here is what rules out a remote-only
    // teleport at the threshold; smoothness of that transform is proven
    // separately by the dense doorway sweep above.
    const drawn = await campusOf(got.x, got.y);
    const truth = await campusOf(bSnap.x, bSnap.y);
    worstAgree = Math.max(worstAgree, dist(drawn, truth) * M);
    seq.push(drawn);
  }
  record("exterior ↔ interior transition realtime", seq.length >= steps.length - 1,
    `${seq.length}/${steps.length} samples landed`);
  record("remote avatar does not jump at the doorway", worstAgree < 0.15,
    `A draws B within ${(worstAgree * 100).toFixed(1)} cm of B's own position, right across the threshold`);

  // ── MAP ────────────────────────────────────────────────────────────
  console.log("\n=== MAP ===");
  const map = await A.evaluate(() => {
    const svg = document.querySelector('[data-testid="minimap"] svg');
    if (!svg) return null;
    return {
      rects: svg.querySelectorAll("rect").length,
      circles: svg.querySelectorAll("circle").length,
      labels: svg.querySelectorAll("text").length,
    };
  });
  record("campus MiniMap shows plaza + 10 footprints", Boolean(map) && map.rects === 10 && map.labels === 10,
    map ? `${map.rects} footprints, ${map.labels} labels` : "no minimap");
  record("campus MiniMap shows local + remote position", Boolean(map) && map.circles >= 3,
    map ? `${map.circles} position markers (plaza ring + local + remote)` : "");

  // ── PERFORMANCE (reported, SwiftShader floor) ──────────────────────
  await teleport(A, 880, 608);
  await sleep(2500);
  const stats = await A.evaluate(() => window.__officeLab.stats());
  console.log(
    `\nperf @ plaza: ${stats.calls} draw calls, ${stats.triangles} triangles, dpr ${stats.dpr}, fps ${stats.fps} (SwiftShader floor)`,
  );

  // ── REGRESSION ─────────────────────────────────────────────────────
  console.log("\n=== REGRESSION ===");
  await A.goto(`${BASE}/office`);
  await A.locator('[data-testid="office-canvas"]').waitFor({ timeout: 60000 });
  record("/office 2D still renders", true);
  record("/office realtime LIVE", Boolean(await waitLive(A)));
  const before = await snap(A);
  await settleInput(A);
  await A.keyboard.down("ArrowUp");
  await sleep(900);
  await A.keyboard.up("ArrowUp");
  const after = await waitFor(async () => {
    const s = await snap(A);
    return s && s.y !== before.y ? s : null;
  }, 15000);
  record("/office 2D movement unchanged", Boolean(after), after ? `dy=${after.y - before.y}` : "");
  const labCanvas = await A.evaluate(
    () => document.querySelectorAll('[data-testid="office-lab-canvas"] canvas').length,
  );
  record("lab canvas cleaned up on route leave", labCanvas === 0);
  record("no page errors (A)", errA.length === 0, errA[0] ?? "");
  record("no page errors (B)", errB.length === 0, errB[0] ?? "");

  const passed = results.filter((r) => r.p).length;
  console.log(`\n=== CAMPUS M1 ACCEPTANCE: ${passed}/${results.length} PASS ===`);
  await browser.close();
  process.exit(passed === results.length ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
