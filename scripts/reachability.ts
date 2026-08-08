// Walk-reachability acceptance check for the AnyWare OFFICE map.
//
// BFS over a fine grid of avatar-center positions, using the exact same
// collision data (SOLIDS) and avatar size the game uses. An area counts
// as reachable when the avatar can stand at a point inside its bounds.
//
// Run: node scripts/reachability.ts   (Node 22+, native type stripping)

import {
  AREAS,
  AVATAR_SIZE,
  SOLIDS,
  SPAWN,
  WORLD,
} from "../src/lib/game/map.ts";
import type { AreaId, Rect } from "../src/types/office.ts";

const STEP = 8;
const HALF = AVATAR_SIZE / 2;

function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function canStand(x: number, y: number): boolean {
  if (x - HALF < 0 || y - HALF < 0 || x + HALF > WORLD.w || y + HALF > WORLD.h) {
    return false;
  }
  const box: Rect = { x: x - HALF, y: y - HALF, w: AVATAR_SIZE, h: AVATAR_SIZE };
  for (const s of SOLIDS) {
    if (overlaps(box, s)) return false;
  }
  return true;
}

function areaAt(x: number, y: number): AreaId | null {
  for (const a of AREAS) {
    const b = a.bounds;
    if (x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h) return a.id;
  }
  return null;
}

const cols = Math.floor(WORLD.w / STEP);
const rows = Math.floor(WORLD.h / STEP);
const startX = Math.round(SPAWN.x / STEP);
const startY = Math.round(SPAWN.y / STEP);

if (!canStand(startX * STEP, startY * STEP)) {
  console.error(`FAIL: spawn point (${SPAWN.x}, ${SPAWN.y}) is not standable`);
  process.exit(1);
}

const visited = new Uint8Array(cols * rows);
const reached = new Set<AreaId>();
const queue: number[] = [startY * cols + startX];
visited[startY * cols + startX] = 1;

while (queue.length > 0) {
  const idx = queue.shift() as number;
  const gx = idx % cols;
  const gy = Math.floor(idx / cols);
  const area = areaAt(gx * STEP, gy * STEP);
  if (area) reached.add(area);

  for (const [dx, dy] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ] as const) {
    const nx = gx + dx;
    const ny = gy + dy;
    if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
    const nIdx = ny * cols + nx;
    if (visited[nIdx]) continue;
    visited[nIdx] = 1;
    if (canStand(nx * STEP, ny * STEP)) queue.push(nIdx);
  }
}

console.log("AnyWare OFFICE — walk reachability (BFS)\n");
let ok = 0;
for (const a of AREAS) {
  const hit = reached.has(a.id);
  if (hit) ok += 1;
  console.log(`${hit ? "PASS" : "FAIL"}  ${a.id}`);
}

console.log("");
if (ok === AREAS.length) {
  console.log("ALL AREAS REACHABLE");
  console.log(`${ok} / ${AREAS.length}`);
  process.exit(0);
} else {
  console.log("REACHABILITY FAILED");
  console.log(`${ok} / ${AREAS.length}`);
  process.exit(1);
}
