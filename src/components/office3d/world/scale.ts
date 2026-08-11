import { WORLD } from "@/lib/game/map";

// STEP 4.9 world coordinate contract.
//
// The 2D simulation, realtime payloads and collision all stay in Canvas
// world units (map.ts is the source of truth). ONLY the 3D renderer
// converts, through this single scale constant:
//
//   2D x -> Three X
//   2D y -> Three Z
//   height -> Three Y
export const WORLD_UNIT_TO_METERS = 0.025;

/** Whole floor: 1760u x 1200u -> 44m x 30m. */
export const WORLD_M = {
  w: WORLD.w * WORLD_UNIT_TO_METERS,
  h: WORLD.h * WORLD_UNIT_TO_METERS,
} as const;

export const WALL_HEIGHT_M = 2.7;
export const AVATAR_HEIGHT_M = 1.7;

export function worldTo3D(x: number, y: number): [number, number, number] {
  return [x * WORLD_UNIT_TO_METERS, 0, y * WORLD_UNIT_TO_METERS];
}

export function u(v: number): number {
  return v * WORLD_UNIT_TO_METERS;
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
