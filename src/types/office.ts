export type Direction = "up" | "down" | "left" | "right";

export interface Position {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type AreaId =
  | "ENTRANCE"
  | "STAFF"
  | "SIGNAL"
  | "PARTNER"
  | "TABLE"
  | "GREEN"
  | "LOCAL"
  | "MEETING"
  | "AI"
  | "ADMIN";

export interface OfficeArea {
  id: AreaId;
  label: string;
  subtitle: string;
  accent: string;
  bounds: Rect;
}

export interface AvatarState extends Position {
  direction: Direction;
  moving: boolean;
}

export type FurnitureKind =
  | "desk"
  | "table"
  | "counter"
  | "plant"
  | "bed"
  | "rack"
  | "board";

export interface FurnitureItem {
  kind: FurnitureKind;
  rect: Rect;
  label?: string;
}

/**
 * DemoRole is a development-only UI simulation of the future auth roles.
 * It is NOT authentication and must never be used as a security boundary.
 * Real roles arrive with Supabase Auth in STEP 2.5.
 */
export type DemoRole = "guest" | "member" | "admin";

export type Visibility = "public" | "member" | "admin";
