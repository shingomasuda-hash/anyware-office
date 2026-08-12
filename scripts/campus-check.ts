// ANYWARE FUTURE CAMPUS — M1 geometry audit.
//
// Validates the canonical→campus transform against the M1 acceptance
// items that are pure geometry, before anything is rendered:
//
//   1. FOLD       the transform must stay orientation-preserving
//                 (det J > 0) everywhere the avatar can stand
//   2. THRESHOLD  the step in position when crossing a doorway — the
//                 only place a discontinuity could ever be walked
//                 through, and therefore the real "no snap" test
//   3. TRAVEL     door-to-door walking times, adjacent / medium / far
//   4. PLAZA      paved plaza extent and facade gaps, in metres
//
// Run: node --experimental-loader ./scripts/alias-hooks.mjs scripts/campus-check.ts

import { AREA_BY_ID, AVATAR_SIZE, DOORWAYS, SOLIDS, WORLD } from "../src/lib/game/map.ts";
import {
  BUILDINGS,
  campusBlend,
  campusJacobian,
  canonicalToCampus,
  PLAZA_CENTER,
  rigid,
  RING_SCALE,
} from "../src/components/office3d/world/campus.ts";
import { LAB_SPEED_MPS } from "../src/components/office3d/labTuning.ts";
import type { AreaId } from "../src/types/office.ts";

const M = 0.075; // metres per campus unit
const HALF = Math.round(AVATAR_SIZE * 0.55) / 2;

function blocked(x: number, y: number): boolean {
  for (const r of SOLIDS) {
    if (x + HALF > r.x && x - HALF < r.x + r.w && y + HALF > r.y && y - HALF < r.y + r.h) {
      return true;
    }
  }
  return false;
}

let failures = 0;
function report(name: string, ok: boolean, detail: string) {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name} — ${detail}`);
}

// ── 1. fold check ────────────────────────────────────────────────────
let minDet = Infinity;
let minAt = "";
let folded = 0;
let samples = 0;
const CELL = 8;
for (let x = 20; x < WORLD.w - 20; x += CELL) {
  for (let y = 20; y < WORLD.h - 20; y += CELL) {
    if (blocked(x, y)) continue;
    samples++;
    const j = campusJacobian(x, y);
    const det = j.xx * j.yy - j.xy * j.yx;
    if (det <= 0) folded++;
    if (det < minDet) {
      minDet = det;
      minAt = `${x},${y}`;
    }
  }
}
const foldedM2 = folded * CELL * CELL * M * M;
report(
  "no fold in the transform",
  folded === 0,
  `min det J = ${minDet.toFixed(2)} at (${minAt}); ${folded}/${samples} walkable cells folded (${foldedM2.toFixed(1)} m²)`,
);

// ── 2. doorway threshold continuity ──────────────────────────────────
// Inside a room the transform is rigid; outside it is the blended
// field. The only crossable seam between the two is a doorway, so the
// jump measured exactly there IS the "visible position snap" test.
let maxJump = 0;
let jumpAt = "";
for (const dw of DOORWAYS) {
  // which room owns this doorway
  const owner = BUILDINGS.find((b) => {
    const r = dw.rect;
    return (
      r.x >= b.bounds.x - 1 &&
      r.x + r.w <= b.bounds.x + b.bounds.w + 1 &&
      r.y >= b.bounds.y - 1 &&
      r.y + r.h <= b.bounds.y + b.bounds.h + 1
    );
  });
  if (!owner) continue;
  const seamY = owner.frontSign > 0 ? owner.bounds.y + owner.bounds.h : owner.bounds.y;
  for (let x = dw.rect.x + HALF; x <= dw.rect.x + dw.rect.w - HALF; x += 2) {
    const a = rigid(owner, x, seamY);
    const b = campusBlend(x, seamY);
    const d = Math.hypot(a.x - b.x, a.y - b.y) * M;
    if (d > maxJump) {
      maxJump = d;
      jumpAt = `${owner.id} doorway x=${x.toFixed(0)}`;
    }
  }
}
report(
  "no visible position snap at any doorway",
  maxJump < 0.2,
  `largest threshold step ${(maxJump * 100).toFixed(1)} cm (${jumpAt}); budget 20 cm`,
);

// ── 3. door-to-door travel ───────────────────────────────────────────
function doorPoint(id: AreaId) {
  const b = BUILDINGS.find((x) => x.id === id)!;
  const dw = DOORWAYS.find((d) => {
    const r = d.rect;
    return (
      r.x >= b.bounds.x - 1 &&
      r.x + r.w <= b.bounds.x + b.bounds.w + 1 &&
      r.y >= b.bounds.y - 1 &&
      r.y + r.h <= b.bounds.y + b.bounds.h + 1
    );
  })!;
  const cx = dw.rect.x + dw.rect.w / 2;
  const cy = dw.rect.y + dw.rect.h / 2;
  return canonicalToCampus(cx, cy);
}

const ordered = [...BUILDINGS].sort((a, b) => {
  const aa = Math.atan2(a.center.x - PLAZA_CENTER.x, a.center.y - PLAZA_CENTER.y);
  const bb = Math.atan2(b.center.x - PLAZA_CENTER.x, b.center.y - PLAZA_CENTER.y);
  return aa - bb;
});
const doors = ordered.map((b) => doorPoint(b.id));

function doorGap(i: number, j: number) {
  const a = doors[i];
  const b = doors[j];
  return Math.hypot(a.x - b.x, a.y - b.y) * M;
}
const adj: number[] = [];
const mid: number[] = [];
const far: number[] = [];
for (let i = 0; i < ordered.length; i++) {
  adj.push(doorGap(i, (i + 1) % ordered.length));
  mid.push(doorGap(i, (i + 2) % ordered.length));
  far.push(doorGap(i, (i + 5) % ordered.length));
}
const stat = (v: number[]) => ({ min: Math.min(...v), max: Math.max(...v) });
const sec = (m: number) => m / LAB_SPEED_MPS;
const a1 = stat(adj);
const a2 = stat(mid);
const a5 = stat(far);
console.log(
  `\nRING_SCALE ${RING_SCALE}   walk ${LAB_SPEED_MPS} m/s\n` +
    `  adjacent  ${a1.min.toFixed(0)}–${a1.max.toFixed(0)} m   ${sec(a1.min).toFixed(1)}–${sec(a1.max).toFixed(1)} s   (target 5–8)\n` +
    `  medium    ${a2.min.toFixed(0)}–${a2.max.toFixed(0)} m   ${sec(a2.min).toFixed(1)}–${sec(a2.max).toFixed(1)} s   (target 8–15)\n` +
    `  opposite  ${a5.min.toFixed(0)}–${a5.max.toFixed(0)} m   ${sec(a5.min).toFixed(1)}–${sec(a5.max).toFixed(1)} s   (target 15–20)\n`,
);
report("adjacent 5–8 s", sec(a1.min) >= 5 && sec(a1.max) <= 8, `${sec(a1.min).toFixed(1)}–${sec(a1.max).toFixed(1)} s`);
report("medium 8–15 s", sec(a2.min) >= 8 && sec(a2.max) <= 15, `${sec(a2.min).toFixed(1)}–${sec(a2.max).toFixed(1)} s`);
report("far <= 20 s", sec(a5.max) <= 20, `worst ${sec(a5.max).toFixed(1)} s`);

// ── 4. plaza + facade gaps ───────────────────────────────────────────
const centre = { x: PLAZA_CENTER.x, y: PLAZA_CENTER.y };
let minFront = Infinity;
for (const b of BUILDINGS) {
  const d = Math.hypot(b.center.x - centre.x, b.center.y - centre.y) - b.size.h / 2;
  minFront = Math.min(minFront, d);
}
const gaps: number[] = [];
for (let i = 0; i < ordered.length; i++) {
  const a = ordered[i];
  const b = ordered[(i + 1) % ordered.length];
  const centreDist = Math.hypot(a.center.x - b.center.x, a.center.y - b.center.y);
  gaps.push(Math.max(0, centreDist - (a.size.w + b.size.w) / 2) * M);
}
console.log(
  `plaza: ${(minFront * 2 * M).toFixed(0)} m across between the two closest facades\n` +
    `facade gaps between neighbours: ${Math.min(...gaps).toFixed(1)}–${Math.max(...gaps).toFixed(1)} m\n` +
    `campus footprint: ${(2 * Math.max(...BUILDINGS.map((b) => b.radius + Math.hypot(b.size.w, b.size.h) / 2)) * M).toFixed(0)} m across`,
);

const ring = ordered
  .map((b) => `${b.id}(${(b.radius * M).toFixed(0)}m)`)
  .join(" → ");
console.log(`ring order: ${ring}`);
console.log(
  `areas resolved: ${BUILDINGS.length}/10, labels ${BUILDINGS.every((b) => AREA_BY_ID[b.id]) ? "ok" : "MISMATCH"}`,
);
console.log(failures === 0 ? "\nCAMPUS CHECK: all PASS" : `\nCAMPUS CHECK: ${failures} FAIL`);
