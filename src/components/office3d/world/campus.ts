import { AREA_BY_ID, AREAS, DOORWAYS, findAreaAt, WORLD } from "@/lib/game/map";
import type { AreaId, Rect } from "@/types/office";

/**
 * ANYWARE FUTURE CAMPUS — coordinate layer (M1).
 *
 * ── The one rule ──────────────────────────────────────────────────────
 * There is exactly ONE coordinate authority: map.ts canonical units.
 * The simulation, collision, area detection and every realtime payload
 * stay canonical and are UNCHANGED. This module adds a single pure
 * function
 *
 *     canonicalToCampus(x, y) -> campus units
 *
 * that the 3D renderer applies to *everything it draws* — the local
 * avatar, remote avatars, the buildings, the ground. Because there is
 * only one authority and one transform, a position can never disagree
 * with itself: no teleport, no camera snap, no remote-avatar snap. C0
 * continuity is a property of the function, not of an interpolation
 * that hides a jump (§4 NO POSITION SNAP).
 *
 * ── How it turns one box into a campus ────────────────────────────────
 * Canonically the office is a 1760x1200 box: ten rooms in two rows with
 * a corridor between them. The transform
 *
 *   · moves each ROOM out to its own place on an asymmetric ring around
 *     the plaza and turns it to face the centre. Inside a room the
 *     transform is a pure RIGID motion (rotate + translate), so the
 *     interior keeps its exact proportions and the exterior shell keeps
 *     matching its collision rects.
 *   · expands the CORRIDOR into the outdoor campus. A corridor point is
 *     a distance-weighted blend of the ten room transforms: at a room's
 *     wall the weight of that room is ~1, so the outdoor ground meets
 *     the building face continuously; far from every room the blend
 *     lands in the middle — the Central Plaza.
 *
 * Continuity check (worst case, measured by scripts/campus-check.mjs):
 * the largest step anywhere along a walkable path is < 0.2 m, i.e.
 * below one avatar footstep and far below anything readable as a snap.
 */

/** Ring size knob — §2 says M1 measures, then fixes this. */
export const RING_SCALE = 0.84;

/** Plaza-centre to building-centre distance at RING_SCALE = 1. */
const BASE_RADIUS = 1160;

/**
 * Blend softness for the outdoor field. Small = the room that owns a
 * wall dominates hard right at that wall, which is what keeps the
 * ground continuous with the facade — and, at a doorway, what keeps
 * the step across the threshold down in the centimetres.
 */
const BLEND_EPS = 0.25;

export type MassingKind =
  | "gateway"
  | "lowCurve"
  | "angled"
  | "overhang"
  | "terrace"
  | "dome"
  | "layered"
  | "transparent"
  | "cantilever"
  | "monolith";

interface Spec {
  /** compass bearing on the ring, degrees (0 = campus north) */
  bearing: number;
  /** radius factor — setback variation (§1 asymmetry) */
  rf: number;
  /** extra turn away from dead-on facing, degrees (§1 rotation) */
  spin: number;
  /** massing height in metres (§3) */
  height: number;
  kind: MassingKind;
  /** depth of the front plaza / landscape apron, campus units (§6) */
  apron: number;
}

/**
 * §1 ASYMMETRIC RADIAL CAMPUS.
 *
 * Two rules bind this table; everything else is art direction.
 *
 * 1. CYCLIC ORDER IS FIXED. Going clockwise the ring must read
 *    PARTNER → MEETING → ADMIN → AI → LOCAL → ENTRANCE → TABLE →
 *    GREEN → STAFF → SIGNAL, because that is the order the rooms sit
 *    in canonically (top row west→east, then bottom row east→west).
 *    Reordering would make the transform fold over itself.
 * 2. NEIGHBOURS CHANGE GENTLY. Radius and turn vary smoothly around
 *    the ring rather than alternating, because the step a walker feels
 *    at a doorway is proportional to how far apart two NEIGHBOURING
 *    facades are. Big variation is spent on height and silhouette,
 *    which cost nothing.
 *
 * The arrival frontage (TABLE – ENTRANCE – LOCAL) is deliberately
 * tighter than the rest: the Gateway Pavilion opens across its whole
 * width, so its neighbours have to close in to keep that threshold
 * continuous. It also gives the campus one dense civic face and nine
 * looser ones — the asymmetry is structural, not decorative.
 */
const SPECS: Record<AreaId, Spec> = {
  PARTNER: { bearing: 0, rf: 1.02, spin: 4, height: 11, kind: "overhang", apron: 160 },
  MEETING: { bearing: 38, rf: 1.06, spin: 7, height: 10, kind: "transparent", apron: 190 },
  ADMIN: { bearing: 74, rf: 1.03, spin: 5, height: 10, kind: "monolith", apron: 110 },
  AI: { bearing: 110, rf: 0.97, spin: 0, height: 13, kind: "cantilever", apron: 150 },
  LOCAL: { bearing: 146, rf: 0.94, spin: -4, height: 7, kind: "layered", apron: 120 },
  ENTRANCE: { bearing: 180, rf: 0.95, spin: -6, height: 12, kind: "gateway", apron: 250 },
  TABLE: { bearing: 214, rf: 0.96, spin: -7, height: 6, kind: "terrace", apron: 140 },
  GREEN: { bearing: 250, rf: 1.0, spin: -3, height: 8, kind: "dome", apron: 120 },
  STAFF: { bearing: 286, rf: 1.04, spin: 2, height: 9, kind: "lowCurve", apron: 180 },
  SIGNAL: { bearing: 322, rf: 1.06, spin: 5, height: 26, kind: "angled", apron: 130 },
};

/** Canonical centre of the world = centre of the campus plaza. */
export const PLAZA_CENTER = { x: WORLD.w / 2, y: WORLD.h / 2 } as const;

/** The canonical corridor — the region that becomes the outdoor campus. */
export const CORRIDOR: Rect = { x: 16, y: 416, w: WORLD.w - 32, h: 384 };

/** Lab spawn: outdoors, on the plaza in front of the Gateway Pavilion. */
export const LAB_SPAWN = { x: 880, y: 706 } as const;

export interface Building {
  id: AreaId;
  label: string;
  subtitle: string;
  accent: string;
  kind: MassingKind;
  /** canonical room rect (unchanged — still the collision footprint) */
  bounds: Rect;
  /** canonical room centre */
  canon: { x: number; y: number };
  /** campus centre, campus units */
  center: { x: number; y: number };
  /** canonical-plane rotation applied to this room, radians */
  phi: number;
  cos: number;
  sin: number;
  /** +1 when the canonical door is on the room's +y edge, else -1 */
  frontSign: 1 | -1;
  /** footprint size in canonical units (== campus units; rigid) */
  size: { w: number; h: number };
  height: number;
  apron: number;
  /** polar position on the ring, for path/plan drawing */
  radius: number;
  /** campus-space bearing of the building's front (radians, atan2(x, y)) */
  facing: number;
}

function buildOne(id: AreaId): Building {
  const area = AREA_BY_ID[id];
  const b = area.bounds;
  const spec = SPECS[id];
  const canon = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
  const frontSign: 1 | -1 = canon.y < PLAZA_CENTER.y ? 1 : -1;

  // outward direction = away from the plaza; the building faces back in.
  // Bearing 0 points campus-north (canonical -y), running clockwise.
  const rad = (spec.bearing * Math.PI) / 180;
  const outX = Math.sin(rad);
  const outY = -Math.cos(rad);
  // want = the direction the door should point in campus space
  const wantX = -outX;
  const wantY = -outY;
  // R(phi) * (0, frontSign) == want
  const phi =
    Math.atan2(-wantX * frontSign, wantY * frontSign) +
    (spec.spin * Math.PI) / 180;

  const radius = BASE_RADIUS * RING_SCALE * spec.rf;
  const center = {
    x: PLAZA_CENTER.x + outX * radius,
    y: PLAZA_CENTER.y + outY * radius,
  };

  return {
    id,
    label: area.label,
    subtitle: area.subtitle,
    accent: area.accent,
    kind: spec.kind,
    bounds: b,
    canon,
    center,
    phi,
    cos: Math.cos(phi),
    sin: Math.sin(phi),
    frontSign,
    size: { w: b.w, h: b.h },
    height: spec.height,
    apron: spec.apron,
    radius,
    facing: Math.atan2(wantX, wantY),
  };
}

export const BUILDINGS: Building[] = AREAS.map((a) => buildOne(a.id));

export const BUILDING_BY_ID = BUILDINGS.reduce(
  (acc, b) => {
    acc[b.id] = b;
    return acc;
  },
  {} as Record<AreaId, Building>,
);

/** Rigid canonical→campus motion for one building. */
export function rigid(b: Building, x: number, y: number) {
  const qx = x - b.canon.x;
  const qy = y - b.canon.y;
  return {
    x: b.center.x + qx * b.cos - qy * b.sin,
    y: b.center.y + qx * b.sin + qy * b.cos,
  };
}

function distToRect(px: number, py: number, r: Rect): number {
  const dx = Math.max(r.x - px, 0, px - (r.x + r.w));
  const dy = Math.max(r.y - py, 0, py - (r.y + r.h));
  return Math.hypot(dx, dy);
}

/**
 * THE transform. Canonical world units in, campus world units out.
 * Pure, allocation-light and safe to call every frame for every avatar.
 */
export function canonicalToCampus(x: number, y: number): { x: number; y: number } {
  const inside = findAreaAt({ x, y });
  if (inside) return rigid(BUILDING_BY_ID[inside], x, y);
  return campusBlend(x, y);
}

/** The outdoor field on its own (exported for the geometry audit). */
export function campusBlend(x: number, y: number): { x: number; y: number } {
  let sx = 0;
  let sy = 0;
  let sw = 0;
  for (const b of BUILDINGS) {
    const d = distToRect(x, y, b.bounds);
    const w = 1 / (d * d + BLEND_EPS);
    const p = rigid(b, x, y);
    sx += w * p.x;
    sy += w * p.y;
    sw += w;
  }
  return { x: sx / sw, y: sy / sw };
}

/** Convenience: campus units as a THREE-ready [x, z] pair. */
export function campusXZ(x: number, y: number): [number, number] {
  const c = canonicalToCampus(x, y);
  return [c.x, c.y];
}

export interface Jacobian {
  /** ∂X/∂x */ xx: number;
  /** ∂Y/∂x */ yx: number;
  /** ∂X/∂y */ xy: number;
  /** ∂Y/∂y */ yy: number;
}

/** Local linearisation — campus units per canonical unit. */
export function campusJacobian(x: number, y: number, h = 1.5): Jacobian {
  const a = canonicalToCampus(x + h, y);
  const b = canonicalToCampus(x - h, y);
  const c = canonicalToCampus(x, y + h);
  const d = canonicalToCampus(x, y - h);
  return {
    xx: (a.x - b.x) / (2 * h),
    yx: (a.y - b.y) / (2 * h),
    xy: (c.x - d.x) / (2 * h),
    yy: (c.y - d.y) / (2 * h),
  };
}

/**
 * How many campus units one canonical unit of travel along (dx, dy)
 * covers. The sim divides by this so walking pace stays constant in the
 * world the player actually sees, indoors and out.
 */
export function campusStretch(x: number, y: number, dx: number, dy: number): number {
  const j = campusJacobian(x, y);
  const sx = j.xx * dx + j.xy * dy;
  const sy = j.yx * dx + j.yy * dy;
  const len = Math.hypot(dx, dy) || 1;
  return Math.hypot(sx, sy) / len;
}

/**
 * Canonical direction that produces the campus direction (cx, cy).
 * Used by the camera boom so it can ray-march the canonical walls while
 * thinking in campus space.
 */
export function campusDirToCanonical(
  x: number,
  y: number,
  cx: number,
  cy: number,
): { x: number; y: number } {
  const j = campusJacobian(x, y);
  const det = j.xx * j.yy - j.xy * j.yx;
  if (Math.abs(det) < 1e-9) return { x: cx, y: cy };
  return {
    x: (j.yy * cx - j.xy * cy) / det,
    y: (-j.yx * cx + j.xx * cy) / det,
  };
}

/**
 * Closed outline of the walkable outdoor ground, in campus units. This
 * is the image of the canonical corridor's boundary, so the perimeter
 * we draw along it is EXACTLY where collision stops you — no invisible
 * walls, no visible walls you can walk through.
 */
export function campusPerimeter(
  step = 24,
): Array<{ x: number; y: number; open: boolean }> {
  const r = CORRIDOR;
  const x0 = r.x + 0.1;
  const x1 = r.x + r.w - 0.1;
  const y0 = r.y + 0.1;
  const y1 = r.y + r.h - 0.1;
  const pts: Array<{ x: number; y: number; open: boolean }> = [];
  const push = (x: number, y: number) => {
    const c = canonicalToCampus(x, y);
    // A doorway is a hole in the boundary, not part of it — the wall we
    // draw must stop where you can actually walk through.
    const open = DOORWAYS.some(
      (d) =>
        x > d.rect.x - 12 &&
        x < d.rect.x + d.rect.w + 12 &&
        y > d.rect.y - 30 &&
        y < d.rect.y + d.rect.h + 30,
    );
    pts.push({ x: c.x, y: c.y, open });
  };
  for (let x = x0; x < x1; x += step) push(x, y0);
  for (let y = y0; y < y1; y += step) push(x1, y);
  for (let x = x1; x > x0; x -= step) push(x, y1);
  for (let y = y1; y > y0; y -= step) push(x0, y);
  return pts;
}

/** Furthest campus extent from the plaza centre, campus units. */
export const CAMPUS_RADIUS = BUILDINGS.reduce((m, b) => {
  const half = Math.hypot(b.size.w, b.size.h) / 2;
  return Math.max(m, b.radius + half);
}, 0);
