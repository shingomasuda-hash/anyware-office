import type { AreaId } from "@/types/office";

// District identity table (STEP 4.9.3). Kept in its own module so both
// the generic room dressing and the bespoke district interiors can read
// it without importing each other.

/** Room identity: the accent that lights the space and paints the floor. */
export interface RoomTheme {
  /** floor tint */
  floor: string;
  /** accent used by light rails, holo props and glow */
  accent: string;
  /** soft ambient fill color for the room's key light */
  light: string;
  /** how the floor pattern is drawn */
  pattern: "grid" | "rings" | "rows" | "hex" | "waves" | "scatter";
}

export const ROOM_THEMES: Record<AreaId, RoomTheme> = {
  ENTRANCE: { floor: "#eef2f6", accent: "#3ec9f5", light: "#fff3e4", pattern: "rings" },
  STAFF: { floor: "#e7ebe6", accent: "#46e0b4", light: "#eaf7f1", pattern: "scatter" },
  SIGNAL: { floor: "#efe9f4", accent: "#f26bd8", light: "#f7e6fb", pattern: "waves" },
  PARTNER: { floor: "#eaeaf6", accent: "#a88cff", light: "#eeeaff", pattern: "hex" },
  TABLE: { floor: "#f4ede2", accent: "#ffab6b", light: "#fff0dd", pattern: "rows" },
  GREEN: { floor: "#e6f0e4", accent: "#7ada6a", light: "#eafbe6", pattern: "rows" },
  LOCAL: { floor: "#eef0e8", accent: "#ffd166", light: "#fff6e0", pattern: "grid" },
  MEETING: { floor: "#e8eaf3", accent: "#a88cff", light: "#ece9fb", pattern: "rings" },
  AI: { floor: "#e6eef6", accent: "#59b8ff", light: "#e6f2ff", pattern: "hex" },
  ADMIN: { floor: "#ecedef", accent: "#9aa7b6", light: "#f2f4f7", pattern: "grid" },
};

