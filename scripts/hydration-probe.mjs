// Focused probe: does navigating /office-lab -> /office produce a
// hydration warning? Dev-server only; used to tell a real regression
// from Next.js dev streaming flake.
import { createRequire } from "module";
const req = createRequire(import.meta.url);
const { chromium } = req("playwright");
const WebSocket = req("ws");
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";

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

const rounds = Number(process.argv[2] ?? 3);
const browser = await chromium.launch({ args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader"] });
const ctx = await browser.newContext({ viewport: { width: 1100, height: 760 } });
await bridge(ctx);
const p = await ctx.newPage();
const errs = [];
p.on("pageerror", (e) => errs.push(String(e).split("\n")[0]));
await p.goto(`${BASE}/login`);
await p.fill("#email", process.env.TEST_ADMIN_EMAIL);
await p.fill("#password", process.env.TEST_ADMIN_PASSWORD);
await p.click('[data-testid="login-submit"]');
await p.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 60000 });

let hyd = 0;
for (let i = 0; i < rounds; i++) {
  errs.length = 0;
  await p.goto(`${BASE}/office`);
  await p.locator('[data-testid="office-canvas"]').waitFor({ timeout: 60000 });
  await new Promise((r) => setTimeout(r, 1500));
  const h = errs.filter((e) => e.includes("Hydration")).length;
  hyd += h;
  console.log(`round ${i + 1}: /office direct — ${h} hydration error(s)`);
}
console.log(`TOTAL hydration errors on /office: ${hyd}`);
await browser.close();
