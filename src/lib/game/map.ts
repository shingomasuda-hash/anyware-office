import type {
  AreaId,
  FurnitureItem,
  OfficeArea,
  Position,
  Rect,
} from "@/types/office";

// This module is intentionally free of value imports so that
// scripts/reachability.ts can load it directly with Node (type-strip mode).

export const WORLD = { w: 1760, h: 1200 } as const;

export const WALL_T = 16;
export const DOOR_W = 100;
export const AVATAR_SIZE = 26;

export const SPAWN: Position = { x: 880, y: 1100 };

interface DoorSpec {
  edge: "top" | "bottom" | "left" | "right";
  /** Center of the opening along the edge axis. Defaults to the edge midpoint. */
  center?: number;
  /** Width of the opening. Defaults to DOOR_W. */
  width?: number;
}

interface RoomSpec {
  id: AreaId;
  label: string;
  subtitle: string;
  accent: string;
  bounds: Rect;
  doors: DoorSpec[];
}

const ROOMS: RoomSpec[] = [
  // ── Top row (opens down onto the corridor) ──────────────────────────
  {
    id: "STAFF",
    label: "STAFF",
    subtitle: "MEMBERS / PROFILE",
    accent: "#64809c",
    bounds: { x: 16, y: 16, w: 346, h: 400 },
    doors: [{ edge: "bottom" }],
  },
  {
    id: "SIGNAL",
    label: "SIGNAL",
    subtitle: "MARKETING / SNS / ADS / RECRUITING / WEB",
    accent: "#4a7dbf",
    bounds: { x: 362, y: 16, w: 346, h: 400 },
    doors: [{ edge: "bottom" }],
  },
  {
    id: "PARTNER",
    label: "PARTNER",
    subtitle: "BUSINESS SUPPORT / SALES / ALLIANCE",
    accent: "#7c6fc0",
    bounds: { x: 708, y: 16, w: 346, h: 400 },
    doors: [{ edge: "bottom" }],
  },
  {
    id: "MEETING",
    label: "MEETING",
    subtitle: "MEETING ROOMS",
    accent: "#8e6cc0",
    bounds: { x: 1054, y: 16, w: 346, h: 400 },
    doors: [{ edge: "bottom" }],
  },
  {
    id: "ADMIN",
    label: "ADMIN",
    subtitle: "MANAGEMENT",
    accent: "#6b7078",
    bounds: { x: 1400, y: 16, w: 344, h: 400 },
    doors: [{ edge: "bottom" }],
  },
  // ── Bottom row (opens up onto the corridor) ─────────────────────────
  {
    id: "GREEN",
    label: "GREEN",
    subtitle: "HYDROPONICS / AGRICULTURE",
    accent: "#4e9e63",
    bounds: { x: 16, y: 800, w: 346, h: 384 },
    doors: [{ edge: "top" }],
  },
  {
    id: "TABLE",
    label: "TABLE",
    subtitle: "FOOD & DINING",
    accent: "#c08b3e",
    bounds: { x: 362, y: 800, w: 318, h: 384 },
    doors: [{ edge: "top" }],
  },
  {
    id: "ENTRANCE",
    label: "ENTRANCE",
    subtitle: "WELCOME TO ANYWARE",
    accent: "#64748b",
    bounds: { x: 680, y: 800, w: 400, h: 384 },
    // The lobby is fully open to the corridor.
    doors: [{ edge: "top", width: 400 }],
  },
  {
    id: "LOCAL",
    label: "LOCAL",
    subtitle: "REGIONAL REVITALIZATION",
    accent: "#3f9fa0",
    bounds: { x: 1080, y: 800, w: 318, h: 384 },
    doors: [{ edge: "top" }],
  },
  {
    id: "AI",
    label: "AI",
    subtitle: "AI / DX LAB",
    accent: "#3e97ba",
    bounds: { x: 1398, y: 800, w: 346, h: 384 },
    doors: [{ edge: "top" }],
  },
];

export const AREAS: OfficeArea[] = ROOMS.map((r) => ({
  id: r.id,
  label: r.label,
  subtitle: r.subtitle,
  accent: r.accent,
  bounds: r.bounds,
}));

export const AREA_BY_ID: Record<AreaId, OfficeArea> = AREAS.reduce(
  (acc, a) => {
    acc[a.id] = a;
    return acc;
  },
  {} as Record<AreaId, OfficeArea>,
);

export function findAreaAt(p: Position): AreaId | null {
  for (const a of AREAS) {
    const b = a.bounds;
    if (p.x >= b.x && p.x < b.x + b.w && p.y >= b.y && p.y < b.y + b.h) {
      return a.id;
    }
  }
  return null;
}

/** Split one edge span into wall segments, leaving gaps for doors. */
function edgeSegments(
  start: number,
  end: number,
  doors: { center: number; width: number }[],
): Array<{ start: number; end: number }> {
  const sorted = [...doors].sort((a, b) => a.center - b.center);
  const segments: Array<{ start: number; end: number }> = [];
  let cursor = start;
  for (const d of sorted) {
    const gapStart = Math.max(start, d.center - d.width / 2);
    const gapEnd = Math.min(end, d.center + d.width / 2);
    if (gapStart > cursor) segments.push({ start: cursor, end: gapStart });
    cursor = Math.max(cursor, gapEnd);
  }
  if (cursor < end) segments.push({ start: cursor, end });
  return segments;
}

function wallsForRoom(spec: RoomSpec): Rect[] {
  const b = spec.bounds;
  const walls: Rect[] = [];
  const edges: DoorSpec["edge"][] = ["top", "bottom", "left", "right"];
  for (const edge of edges) {
    const horizontal = edge === "top" || edge === "bottom";
    const axisStart = horizontal ? b.x : b.y;
    const axisEnd = horizontal ? b.x + b.w : b.y + b.h;
    const doors = spec.doors
      .filter((d) => d.edge === edge)
      .map((d) => ({
        center: d.center ?? (axisStart + axisEnd) / 2,
        width: d.width ?? DOOR_W,
      }));
    for (const seg of edgeSegments(axisStart, axisEnd, doors)) {
      if (horizontal) {
        walls.push({
          x: seg.start,
          y: edge === "top" ? b.y : b.y + b.h - WALL_T,
          w: seg.end - seg.start,
          h: WALL_T,
        });
      } else {
        walls.push({
          x: edge === "left" ? b.x : b.x + b.w - WALL_T,
          y: seg.start,
          w: WALL_T,
          h: seg.end - seg.start,
        });
      }
    }
  }
  return walls;
}

const OUTER_WALLS: Rect[] = [
  { x: 0, y: 0, w: WORLD.w, h: WALL_T },
  { x: 0, y: WORLD.h - WALL_T, w: WORLD.w, h: WALL_T },
  { x: 0, y: 0, w: WALL_T, h: WORLD.h },
  { x: WORLD.w - WALL_T, y: 0, w: WALL_T, h: WORLD.h },
];

export const WALLS: Rect[] = [
  ...OUTER_WALLS,
  ...ROOMS.flatMap((r) => wallsForRoom(r)),
];

/** Doorway markers (for rendering thresholds only, not collision). */
export const DOORWAYS: Array<{ rect: Rect; accent: string }> = ROOMS.flatMap(
  (r) =>
    r.doors.map((d) => {
      const b = r.bounds;
      const horizontal = d.edge === "top" || d.edge === "bottom";
      const axisStart = horizontal ? b.x : b.y;
      const axisEnd = horizontal ? b.x + b.w : b.y + b.h;
      const center = d.center ?? (axisStart + axisEnd) / 2;
      const width = d.width ?? DOOR_W;
      const rect: Rect = horizontal
        ? {
            x: center - width / 2,
            y: d.edge === "top" ? b.y : b.y + b.h - WALL_T,
            w: width,
            h: WALL_T,
          }
        : {
            x: d.edge === "left" ? b.x : b.x + b.w - WALL_T,
            y: center - width / 2,
            w: WALL_T,
            h: width,
          };
      return { rect, accent: r.accent };
    }),
);

export const FURNITURE: FurnitureItem[] = [
  // STAFF
  { kind: "desk", rect: { x: 70, y: 100, w: 120, h: 44 } },
  { kind: "desk", rect: { x: 70, y: 200, w: 120, h: 44 } },
  { kind: "plant", rect: { x: 312, y: 48, w: 26, h: 26 } },
  // SIGNAL
  { kind: "desk", rect: { x: 410, y: 100, w: 120, h: 44 } },
  { kind: "desk", rect: { x: 410, y: 200, w: 120, h: 44 } },
  { kind: "board", rect: { x: 600, y: 48, w: 64, h: 20 } },
  // PARTNER
  { kind: "desk", rect: { x: 760, y: 100, w: 120, h: 44 } },
  { kind: "desk", rect: { x: 760, y: 200, w: 120, h: 44 } },
  { kind: "plant", rect: { x: 1000, y: 48, w: 26, h: 26 } },
  // MEETING — three rooms represented as three tables
  { kind: "table", rect: { x: 1100, y: 90, w: 120, h: 56 }, label: "A" },
  { kind: "table", rect: { x: 1100, y: 200, w: 120, h: 56 }, label: "B" },
  { kind: "table", rect: { x: 1260, y: 140, w: 100, h: 56 }, label: "C" },
  // ADMIN
  { kind: "desk", rect: { x: 1460, y: 100, w: 140, h: 48 } },
  { kind: "rack", rect: { x: 1700, y: 80, w: 28, h: 140 } },
  // GREEN — hydroponic beds
  { kind: "bed", rect: { x: 60, y: 980, w: 90, h: 34 } },
  { kind: "bed", rect: { x: 212, y: 980, w: 90, h: 34 } },
  { kind: "bed", rect: { x: 60, y: 1060, w: 90, h: 34 } },
  { kind: "bed", rect: { x: 212, y: 1060, w: 90, h: 34 } },
  // TABLE — dining tables
  { kind: "table", rect: { x: 420, y: 980, w: 64, h: 44 } },
  { kind: "table", rect: { x: 540, y: 980, w: 64, h: 44 } },
  { kind: "table", rect: { x: 420, y: 1080, w: 64, h: 44 } },
  { kind: "table", rect: { x: 540, y: 1080, w: 64, h: 44 } },
  // ENTRANCE — reception counter (offset left so the center aisle stays clear)
  { kind: "counter", rect: { x: 716, y: 936, w: 144, h: 40 }, label: "RECEPTION" },
  { kind: "plant", rect: { x: 1028, y: 950, w: 26, h: 26 } },
  { kind: "plant", rect: { x: 1028, y: 1120, w: 26, h: 26 } },
  // LOCAL
  { kind: "table", rect: { x: 1140, y: 980, w: 110, h: 50 } },
  { kind: "board", rect: { x: 1290, y: 1100, w: 80, h: 26 } },
  // AI
  { kind: "desk", rect: { x: 1450, y: 980, w: 120, h: 44 } },
  { kind: "desk", rect: { x: 1450, y: 1080, w: 120, h: 44 } },
  { kind: "rack", rect: { x: 1690, y: 1000, w: 30, h: 90 } },
];

/** Everything the avatar cannot walk through. */
export const SOLIDS: Rect[] = [...WALLS, ...FURNITURE.map((f) => f.rect)];
