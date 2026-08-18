/**
 * SIGNAL — where things stand.
 *
 * Plain numbers, no three.js and no React, so that the district's
 * geometry and its seat anchors can be built from the SAME source. They
 * were authored twice before, and the two copies did not agree: sitting
 * down put the avatar a couple of metres from the stool it was supposed
 * to be on, and in one case on the far side of the room.
 *
 * All values are in the building's local metres — x right, z toward the
 * entrance, origin at the room centre.
 */

/** The district's governing angle. Everything is set to the flow. */
export const FLOW = -0.36; // ~20.6°

/** Campaign Arena, the district's centre of gravity. */
export const ARENA: readonly [number, number] = [4.0, -4.0];

/** Low stools around the arena, in ARENA-local metres. */
export const ARENA_STOOLS: ReadonlyArray<{ x: number; z: number }> = [
  -2.3, -1.15, 0, 1.15, 2.3,
].map((x, i) => ({ x, z: i % 2 ? 2.35 : -2.35 }));

/** Editing pods: each is placed and turned individually along the flow. */
export const EDIT_PODS: ReadonlyArray<{ i: number; x: number; z: number; rot: number }> = [
  0, 1, 2, 3,
].map((i) => ({
  i,
  x: -8.6 + i * 0.55,
  z: -2.4 + i * 3.3,
  rot: Math.PI / 2 + FLOW + i * 0.05,
}));

/** Where the stool sits inside an editing pod, pod-local. */
export const POD_STOOL = { x: 0, z: 0.85 } as const;

/** The Content Studio, and the working position at its bench. */
export const STUDIO = { x: -7.0, z: -9.2, rot: FLOW + 0.22 } as const;
export const STUDIO_SEAT = { x: 0, z: 2.78 } as const;

/** Rotate a local offset about Y, matching three's group rotation-y. */
export function spin(x: number, z: number, rot: number): { x: number; z: number } {
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  return { x: x * c + z * s, z: -x * s + z * c };
}
