import type { AreaId } from "@/types/office";
import { BUILDING_BY_ID } from "./campus";

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
  ...[-1, 0, 1].map((i) => ({
    id: `STAFF-DESK-0${i + 2}`,
    zoneId: "WORKSTATION",
    label: `Workstation ${i + 2}`,
    lx: 8.38,
    lz: i * 3.4,
    faceX: -1,
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
  ...[-1, 1].flatMap((side) =>
    [-1.5, -0.5, 0.5, 1.5].map((i) => ({
      id: `MEETING-MAIN-${side > 0 ? "S" : "N"}${Math.abs(i * 2)}`,
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

/** SIGNAL — editing pods, campaign arena stools, content studio. */
const SIGNAL_SEATS = build("SIGNAL", [
  ...[0, 1, 2, 3].map((i) => ({
    id: `SIGNAL-EDIT-0${i + 1}`,
    zoneId: "EDITING_DECK",
    label: `Editing Deck ${i + 1}`,
    lx: -8.0 + i * 0.9,
    lz: 5.6 - i * 2.6,
    faceX: 0.35,
    faceZ: -1,
  })),
  ...[0, 1, 2, 3].map((i) => ({
    id: `SIGNAL-ARENA-0${i + 1}`,
    zoneId: "CAMPAIGN_ARENA",
    label: `Campaign Arena ${i + 1}`,
    lx: 4.0 - 2.4 + i * 1.6,
    lz: -4.0 + 2.4,
    faceX: 0,
    faceZ: -1,
    seatHeight: 0.52,
  })),
  {
    id: "SIGNAL-STUDIO-01",
    zoneId: "CONTENT_STUDIO",
    label: "Content Studio",
    lx: -6.4,
    lz: -8.0,
    faceX: 0,
    faceZ: -1,
  },
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

/** Closest seat the avatar could sit in right now, or null. */
export function seatNear(x: number, y: number, area: AreaId | null): Seat | null {
  if (!area) return null;
  let best: Seat | null = null;
  let bestD = SEAT_REACH;
  for (const s of SEATS) {
    if (s.areaId !== area) continue;
    const d = Math.hypot(s.approach.x - x, s.approach.y - y);
    if (d < bestD) {
      bestD = d;
      best = s;
    }
  }
  return best;
}
