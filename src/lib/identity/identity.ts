import type { AreaId } from "@/types/office";

// STEP 4 Identity contract — renderer-agnostic. Both the Canvas 2D
// renderer and the future /office-lab 3D AvatarMesh consume this module;
// nothing here may import canvas, three.js, or React.

/**
 * Presence status vocabulary.
 * - meeting is derived (inside the MEETING area) and always wins.
 * - away is derived from idleness unless a stronger manual mode is set.
 * - available / busy / focus are user-chosen.
 */
export type ManualStatus = "available" | "busy" | "focus" | "away";
export type EffectiveStatus = ManualStatus | "meeting";

export const MANUAL_STATUSES: readonly ManualStatus[] = [
  "available",
  "busy",
  "focus",
  "away",
];

export const STATUS_LABELS: Record<EffectiveStatus, string> = {
  available: "Available",
  busy: "Busy",
  focus: "Focus",
  away: "Away",
  meeting: "In meeting",
};

/** Status colors double as the avatar status ring (AA on white). */
export const STATUS_COLORS: Record<EffectiveStatus, string> = {
  available: "#3fa66a",
  busy: "#d95f4c",
  focus: "#4a7dbf",
  away: "#b7a14a",
  meeting: "#8e6cc0",
};

/**
 * Resolve the status shown to others.
 * Priority: MEETING area > deliberate manual mode (busy/focus/away) >
 * idle-away > available.
 */
export function effectiveStatus(
  manual: ManualStatus,
  areaId: AreaId | null,
  idle: boolean,
): EffectiveStatus {
  if (areaId === "MEETING") return "meeting";
  if (manual !== "available") return manual;
  return idle ? "away" : "available";
}

/**
 * Deterministic personal color from a user id — the same user renders
 * the same hue everywhere (2D canvas, roster, future 3D). Curated
 * palette: readable on light floors, distinct from status colors' role.
 */
const PERSONAL_PALETTE = [
  "#4a7dbf", // blue
  "#7c6fc0", // violet
  "#3f9fa0", // teal
  "#4e9e63", // green
  "#c08b3e", // amber
  "#b56576", // rose
  "#5f7a8c", // steel
  "#8a6d3b", // bronze
  "#6d8c3f", // olive
  "#a05fa3", // orchid
] as const;

export function personalColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  }
  return PERSONAL_PALETTE[hash % PERSONAL_PALETTE.length];
}

/** "山田 太郎" -> "山", "Taro Yamada" -> "TY", "info" -> "IN". */
export function initials(name: string): string {
  const trimmed = name.trim();
  if (trimmed === "") return "?";
  const words = trimmed.split(/\s+/);
  const first = [...words[0]][0] ?? "?";
  // Latin names: two initials; CJK etc.: one character carries identity.
  if (/^[a-zA-Z]/.test(first)) {
    const second = words.length > 1 ? ([...words[1]][0] ?? "") : ([...words[0]][1] ?? "");
    return (first + second).toUpperCase();
  }
  return first;
}

/**
 * Everything a renderer needs to draw one person. Built from presence
 * meta (remote) or the current user (local) — never from renderer state.
 */
export interface AvatarIdentity {
  userId: string;
  displayName: string;
  department: string;
  color: string;
  initials: string;
  avatarUrl: string | null;
  status: EffectiveStatus;
}

export function buildIdentity(input: {
  userId: string;
  displayName: string;
  department: string;
  avatarUrl: string | null;
  status: EffectiveStatus;
}): AvatarIdentity {
  return {
    userId: input.userId,
    displayName: input.displayName,
    department: input.department,
    color: personalColor(input.userId),
    initials: initials(input.displayName),
    avatarUrl: input.avatarUrl,
    status: input.status,
  };
}
