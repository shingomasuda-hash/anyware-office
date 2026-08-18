import type { EffectiveStatus } from "@/lib/identity/identity";
import type { AreaId, Direction } from "@/types/office";

// STEP 3 realtime contracts. Everything that crosses the wire is defined
// here so payloads stay auditable: NEVER add email, tokens, or any other
// credential/identity material beyond what the office UI displays.

/** STEP 4: presence carries the identity layer's effective status. */
export type PresenceStatus = EffectiveStatus;

export type RealtimeStatus = "connecting" | "live" | "offline";

/**
 * Presence payload for one member/admin in the office.
 * Client-safe fields only — no email, no auth material.
 */
export interface PresenceMeta {
  userId: string;
  displayName: string;
  department: string;
  position: string;
  avatarUrl: string | null;
  areaId: AreaId | null;
  status: PresenceStatus;
  /** Position at track time so idle users render immediately for joiners. */
  x?: number;
  y?: number;
  /**
   * Seat check-in. Deliberately two fields and nothing else: the seat
   * you occupy and whether you are working at it. Kept separate from
   * `status`, because "checked in" and "away" are both true of someone
   * who sat down and went to make coffee.
   */
  seatId?: string | null;
  workplaceState?: WorkplaceState;
}

/** Whether someone is moving about or working at a seat. */
export type WorkplaceState = "walking" | "checked_in";

/** Broadcast movement event (throttled; integers in world units). */
export interface MoveEvent {
  userId: string;
  x: number;
  y: number;
  direction: Direction;
  areaId: AreaId | null;
  ts: number;
}

/**
 * Internal per-remote-user state. Broadcast updates move the target
 * (tx/ty); the canvas render loop lerps x/y toward it every frame, so
 * React never re-renders for movement.
 */
export interface RemotePlayer {
  meta: PresenceMeta;
  x: number;
  y: number;
  tx: number;
  ty: number;
  direction: Direction;
  moving: boolean;
  lastEventAt: number;
  /**
   * Set while the key is absent from presence state. Rapid re-tracks can
   * transiently drop a key between leave/join diffs, so removal waits a
   * grace period instead of firing on the first empty snapshot.
   */
  missingSince?: number;
  /**
   * Status observed before a movement event put this player into the
   * MEETING area — used as the provisional status when they walk out,
   * until their next presence re-track delivers the authoritative one.
   */
  preMeetingStatus?: PresenceStatus;
}

/** What a renderer needs to draw one remote avatar this frame. */
export interface RemoteAvatarRender {
  userId: string;
  x: number;
  y: number;
  direction: Direction;
  moving: boolean;
  displayName: string;
  department: string;
  avatarUrl: string | null;
  status: PresenceStatus;
  /** Seat they are checked in at, so the renderer can sit them down. */
  seatId: string | null;
}

/** Low-frequency roster entry for the People panel (self included). */
export interface RosterEntry {
  userId: string;
  displayName: string;
  department: string;
  position: string;
  avatarUrl: string | null;
  areaId: AreaId | null;
  status: PresenceStatus;
  seatId: string | null;
  workplaceState: WorkplaceState;
  isSelf: boolean;
}

/** Dev-only diagnostics surfaced by the DebugOverlay. */
export interface RealtimeStats {
  status: RealtimeStatus;
  presenceCount: number;
  sentPerSecond: number;
  privateChannel: boolean;
}
