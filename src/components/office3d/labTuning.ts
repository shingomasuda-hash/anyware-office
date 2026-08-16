// Lab-only movement tuning. Kept in its own module (no React, no
// three) so both LabSim and the Node-side campus audit can read the
// same numbers — the travel times we report are the ones we ship.

/**
 * Walking pace across the campus, METRES per second.
 *
 * §2 asks for adjacent 5–8 s / medium 8–15 s / opposite 15–20 s. Ten
 * buildings on a ring fix the ratio between "next door" and "across
 * the campus", so the three windows only all fit inside a narrow band
 * of pace and ring size. This value is the measured fit:
 *
 *   adjacent 5.0–6.2 s · medium 9.7–11.9 s · opposite 17.8–18.5 s
 *
 * Re-run scripts/campus-check.ts after touching this or RING_SCALE —
 * it prints the real numbers and fails if any window is missed.
 */
export const LAB_SPEED_MPS = 6.5;

/** Sprint multiplier (Shift), for crossing the whole campus. */
export const LAB_SPRINT = 1.55;

/** Campus metres per canonical world unit (see world/scale.ts). */
export const METRES_PER_UNIT = 0.075;

/** Walking pace expressed in campus units / second. */
export const LAB_SPEED_UNITS = LAB_SPEED_MPS / METRES_PER_UNIT;
