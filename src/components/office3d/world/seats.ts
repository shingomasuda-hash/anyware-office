import type { AreaId } from "@/types/office";
import { BUILDING_BY_ID } from "./campus";
import {
  ARENA,
  ARENA_STOOLS,
  EDIT_PODS,
  FLOW,
  POD_STOOL,
  spin,
  STUDIO,
  STUDIO_SEAT,
} from "./signalLayout";

/**
 * SEAT CHECK-IN — seat catalogue.
 *
 * Seats are authored in the SAME local metre space as the interiors
 * (origin at the room centre, +Z out of the entrance), so a seat anchor
 * lands exactly on the chair that was modelled there. They are then
 * converted to CANONICAL units, because canonical stays the one
 * coordinate authority: sitting is just the avatar standing still at a
 * canonical position, so 2D clients and realtime payloads need no
 * change at all.
 */

const M = 0.075;

export interface Seat {
  id: string;
  areaId: AreaId;
  zoneId: string;
  label: string;
  /** where the avatar sits, canonical units */
  canonical: { x: number; y: number };
  /** where it stands to sit down / returns to on standing */
  approach: { x: number; y: number };
  /** seat pan height, metres — the seated pose rides on this */
  seatHeight: number;
}

interface SeatSpec {
  id: string;
  zoneId: string;
  label: string;
  /** local metres: x right, z toward the entrance */
  lx: number;
  lz: number;
  /** which way the body faces when seated, local metres */
  faceX: number;
  faceZ: number;
  seatHeight?: number;
}

/** local metres -> canonical units for a given building. */
function toCanonical(areaId: AreaId, lx: number, lz: number) {
  const b = BUILDING_BY_ID[areaId];
  return {
    x: b.canon.x + (lx / M) * b.frontSign,
    y: b.canon.y + (lz / M) * b.frontSign,
  };
}

function build(areaId: AreaId, specs: SeatSpec[]): Seat[] {
  return specs.map((s) => {
    const len = Math.hypot(s.faceX, s.faceZ) || 1;
    // stand 1.1 m behind the seat, on the side you approach from
    const ax = s.lx - (s.faceX / len) * 1.1;
    const az = s.lz - (s.faceZ / len) * 1.1;
    return {
      id: s.id,
      areaId,
      zoneId: s.zoneId,
      label: s.label,
      canonical: toCanonical(areaId, s.lx, s.lz),
      approach: toCanonical(areaId, ax, az),
      seatHeight: s.seatHeight ?? 0.44,
    };
  });
}

/** STAFF — focus pods, personal workstations, collaboration island. */
const STAFF_SEATS = build("STAFF", [
  ...[-1, 0, 1].map((i) => ({
    id: `STAFF-FOCUS-0${i + 2}`,
    zoneId: "FOCUS_POD",
    label: `Focus Pod ${i + 2}`,
    lx: -9.58,
    lz: i * 4.2 + 3.8,
    faceX: 0,
    faceZ: -1,
  })),
  // The workstation row is a group turned a quarter turn, so the chair
  // lands one metre INSIDE the desk line: hw - 4.6 - 1.0. Authored at
  // the desk's own x, the avatar sat in the desktop.
  ...[-1, 0, 1].map((i) => ({
    id: `STAFF-DESK-0${i + 2}`,
    zoneId: "WORKSTATION",
    label: `Workstation ${i + 2}`,
    lx: 7.37,
    lz: i * 3.4,
    faceX: 1,
    faceZ: 0,
  })),
  ...[0, 1, 2, 3].map((i) => {
    const a = (i / 6) * Math.PI * 2;
    return {
      id: `STAFF-ISLAND-0${i + 1}`,
      zoneId: "ISLAND",
      label: `Collaboration Island ${i + 1}`,
      lx: Math.cos(a) * 2.9,
      lz: Math.sin(a) * 2.1 - 1.4,
      faceX: -Math.cos(a),
      faceZ: -Math.sin(a),
    };
  }),
]);

/** MEETING — main conference table, plus the two glazed pods. */
const MEETING_SEATS = build("MEETING", [
  // These have to land ON the chairs the conference room actually
  // models — same pitch, same offsets, same group origin. Authored on
  // their own grid they put the avatar in the gaps between chairs.
  ...[-1, 1].flatMap((side) =>
    [-2, -1, 0, 1, 2].map((i) => ({
      id: `MEETING-MAIN-${side > 0 ? "S" : "N"}${i + 3}`,
      zoneId: "MAIN_ROOM",
      label: `Main Room seat`,
      lx: i * 1.28,
      lz: side * 1.55 - 6.4,
      faceX: 0,
      faceZ: -side,
    })),
  ),
  ...[-1, 1].flatMap((s) =>
    [0, 1].map((i) => {
      const a = (i / 4) * Math.PI * 2 + 0.7;
      return {
        id: `MEETING-POD-${s > 0 ? "B" : "A"}${i + 1}`,
        zoneId: s > 0 ? "POD_B" : "POD_A",
        label: `Meeting Pod ${s > 0 ? "B" : "A"}`,
        lx: s * 8.79 + Math.cos(a) * 1.4,
        lz: 1.4 + Math.sin(a) * 1.4,
        faceX: -Math.cos(a),
        faceZ: -Math.sin(a),
      };
    }),
  ),
]);

/**
 * SIGNAL — editing pods, campaign arena stools, content studio.
 *
 * Every anchor is DERIVED from the district's own layout rather than
 * re-authored: the stool and the seat you take on it have to be the
 * same place, and the district is set on a diagonal, so nothing here
 * can be written down as a round number by hand.
 */
const SIGNAL_SEATS = build("SIGNAL", [
  ...EDIT_PODS.map((p) => {
    const seat = spin(POD_STOOL.x, POD_STOOL.z, p.rot);
    const face = spin(0, -1, p.rot); // turned to the desk, not the room
    return {
      id: `SIGNAL-EDIT-0${p.i + 1}`,
      zoneId: "EDITING_DECK",
      label: `Editing Deck ${p.i + 1}`,
      lx: p.x + seat.x,
      lz: p.z + seat.z,
      faceX: face.x,
      faceZ: face.z,
      seatHeight: 0.55,
    };
  }),
  ...ARENA_STOOLS.map((st, i) => {
    const seat = spin(st.x, st.z, FLOW);
    // stools sit either side of the arena; each one faces across it
    const face = spin(0, st.z > 0 ? -1 : 1, FLOW);
    return {
      id: `SIGNAL-ARENA-0${i + 1}`,
      zoneId: "CAMPAIGN_ARENA",
      label: `Campaign Arena ${i + 1}`,
      lx: ARENA[0] + seat.x,
      lz: ARENA[1] + seat.z,
      faceX: face.x,
      faceZ: face.z,
      seatHeight: 0.54,
    };
  }),
  (() => {
    const seat = spin(STUDIO_SEAT.x, STUDIO_SEAT.z, STUDIO.rot);
    const face = spin(0, -1, STUDIO.rot); // toward the bench and the feed
    return {
      id: "SIGNAL-STUDIO-01",
      zoneId: "CONTENT_STUDIO",
      label: "Content Studio",
      lx: STUDIO.x + seat.x,
      lz: STUDIO.z + seat.z,
      faceX: face.x,
      faceZ: face.z,
    };
  })(),
]);

export const SEATS: Seat[] = [...STAFF_SEATS, ...MEETING_SEATS, ...SIGNAL_SEATS];

export const SEAT_BY_ID = SEATS.reduce(
  (acc, s) => {
    acc[s.id] = s;
    return acc;
  },
  {} as Record<string, Seat>,
);

/** Interaction radius, canonical units (~2.2 m). */
export const SEAT_REACH = 30;

/**
 * Closest seat to the avatar, and whether it is already taken. The seat
 * is still returned when occupied so the UI can say OCCUPIED rather
 * than silently offering nothing — "why can't I sit here" is a worse
 * experience than a clear no.
 */
export function seatNear(
  x: number,
  y: number,
  area: AreaId | null,
  occupied?: ReadonlySet<string>,
): { seat: Seat; taken: boolean } | null {
  if (!area) return null;
  let best: Seat | null = null;
  let bestD = SEAT_REACH;
  for (const s of SEATS) {
    if (s.areaId !== area) continue;
    const d = Math.hypot(s.approach.x - x, s.approach.y - y);
    // an occupied seat only wins if nothing free is closer
    const bias = occupied?.has(s.id) ? SEAT_REACH * 0.35 : 0;
    if (d + bias < bestD) {
      bestD = d + bias;
      best = s;
    }
  }
  return best ? { seat: best, taken: occupied?.has(best.id) ?? false } : null;
}
