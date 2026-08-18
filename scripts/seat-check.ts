// SEAT AUDIT. A seat is only a seat if you can walk to it and if it is
// inside the room it claims to be in — this catches anchors that drift
// away from the furniture they were authored against.
import { SEATS } from "@/components/office3d/world/seats";
import { BUILDING_BY_ID } from "@/components/office3d/world/campus";
import { findAreaAt, WALLS } from "@/lib/game/map";

const M = 0.075; // canonical units -> metres
let failed = 0;
const fail = (msg: string) => {
  console.log(`FAIL  ${msg}`);
  failed++;
};

const blocked = (x: number, y: number, pad: number) =>
  WALLS.some(
    (r) => x > r.x - pad && x < r.x + r.w + pad && y > r.y - pad && y < r.y + r.h + pad,
  );

// half a body, in canonical units
const BODY = 0.55 / M;

for (const s of SEATS) {
  const b = BUILDING_BY_ID[s.areaId];
  const inRoom = findAreaAt(s.canonical);
  if (inRoom !== s.areaId) {
    fail(`${s.id} sits in ${inRoom ?? "the open air"}, not ${s.areaId}`);
    continue;
  }
  if (findAreaAt(s.approach) !== s.areaId) {
    fail(`${s.id} is approached from outside ${s.areaId}`);
  }
  if (blocked(s.canonical.x, s.canonical.y, BODY)) {
    fail(`${s.id} is inside a wall`);
  }
  if (blocked(s.approach.x, s.approach.y, BODY)) {
    fail(`${s.id} cannot be stood at — its approach is in a wall`);
  }
  const reach = Math.hypot(
    s.canonical.x - s.approach.x,
    s.canonical.y - s.approach.y,
  );
  if (Math.abs(reach * M - 1.1) > 0.02) {
    fail(`${s.id} approach is ${(reach * M).toFixed(2)} m away, expected 1.10 m`);
  }
  // local metres, for the report
  const lx = ((s.canonical.x - b.canon.x) * M) / 1 * b.frontSign;
  const lz = ((s.canonical.y - b.canon.y) * M) / 1 * b.frontSign;
  const hw = (b.size.w * M) / 2;
  const hd = (b.size.h * M) / 2;
  if (Math.abs(lx) > hw - 1.0 || Math.abs(lz) > hd - 1.0) {
    fail(`${s.id} at local (${lx.toFixed(1)}, ${lz.toFixed(1)}) is against the shell (${hw.toFixed(1)} x ${hd.toFixed(1)})`);
  }
}

const byArea = SEATS.reduce<Record<string, number>>((acc, s) => {
  acc[s.areaId] = (acc[s.areaId] ?? 0) + 1;
  return acc;
}, {});
console.log("seats:", Object.entries(byArea).map(([a, n]) => `${a}=${n}`).join(" "));
const ids = new Set(SEATS.map((s) => s.id));
if (ids.size !== SEATS.length) fail("duplicate seat ids");

console.log(failed === 0 ? `ALL PASS (${SEATS.length} seats)` : `${failed} FAILED`);
process.exit(failed === 0 ? 0 : 1);
