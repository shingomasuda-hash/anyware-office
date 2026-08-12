import { WORLD } from "@/lib/game/map";
import type { Direction } from "@/types/office";
import { campusJacobian, canonicalToCampus } from "./campus";

// STEP 4.9 world coordinate contract.
//
// The 2D simulation, realtime payloads and collision all stay in Canvas
// world units (map.ts is the source of truth). ONLY the 3D renderer
// converts, through this single scale constant:
//
//   2D x -> Three X
//   2D y -> Three Z
//   height -> Three Y
//
// STEP 4.9.3 tripled this constant so the rooms read as generous
// metaverse halls instead of cramped offices. Avatars stay 1.7 m, so
// the world grew around the people rather than everything scaling
// together. map.ts is untouched — the 2D office is unaffected.
export const WORLD_UNIT_TO_METERS = 0.075;

/**
 * The original 1:1 office scale. Furniture is authored against real
 * human dimensions, so a desk stays desk-sized in the bigger hall: its
 * PLACEMENT uses the world scale, its SIZE uses this one.
 */
export const FURNITURE_UNIT_TO_METERS = 0.025;

/** How much bigger the hall is than the original office footprint. */
export const WORLD_SCALE_RATIO = WORLD_UNIT_TO_METERS / FURNITURE_UNIT_TO_METERS;

/** Whole floor: 1760u x 1200u -> 132m x 90m. */
export const WORLD_M = {
  w: WORLD.w * WORLD_UNIT_TO_METERS,
  h: WORLD.h * WORLD_UNIT_TO_METERS,
} as const;

export const WALL_HEIGHT_M = 5.4;
export const AVATAR_HEIGHT_M = 1.7;

/**
 * Canonical world units -> three.js metres, THROUGH the campus
 * transform. Everything drawn in the lab goes through this one door:
 * the local avatar, remote avatars, the camera target and the
 * world→screen projector. One transform for all of them is what makes
 * a doorway crossing continuous for everybody at once.
 */
export function worldTo3D(x: number, y: number): [number, number, number] {
  const c = canonicalToCampus(x, y);
  return [c.x * WORLD_UNIT_TO_METERS, 0, c.y * WORLD_UNIT_TO_METERS];
}

const DIR_VEC: Record<Direction, [number, number]> = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
};

/**
 * Yaw (three.js Y rotation) for a canonical facing at a canonical
 * position. Buildings are turned to face the plaza, so "north" inside
 * STAFF is not "north" inside MEETING — the facing has to be carried
 * through the transform too, or avatars would face the wrong way in
 * every rotated building.
 */
export function campusYaw(x: number, y: number, direction: Direction): number {
  const [dx, dy] = DIR_VEC[direction];
  const j = campusJacobian(x, y);
  const cx = j.xx * dx + j.xy * dy;
  const cy = j.yx * dx + j.yy * dy;
  if (Math.abs(cx) < 1e-6 && Math.abs(cy) < 1e-6) return Math.atan2(dx, dy);
  return Math.atan2(cx, cy);
}

export function u(v: number): number {
  return v * WORLD_UNIT_TO_METERS;
}

/** Map units -> meters at furniture (human) scale. */
export function fu(v: number): number {
  return v * FURNITURE_UNIT_TO_METERS;
}

/** Center + size of a map rect, in meters (XZ plane). */
export function rectTo3D(rect: { x: number; y: number; w: number; h: number }) {
  return {
    cx: u(rect.x + rect.w / 2),
    cz: u(rect.y + rect.h / 2),
    w: u(rect.w),
    d: u(rect.h),
  };
}

/**
 * Center at world scale, size at human scale — the placement contract
 * for furniture inside the enlarged hall.
 */
export function rectToFurniture(rect: { x: number; y: number; w: number; h: number }) {
  return {
    cx: u(rect.x + rect.w / 2),
    cz: u(rect.y + rect.h / 2),
    w: fu(rect.w),
    d: fu(rect.h),
  };
}
