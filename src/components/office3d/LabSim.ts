"use client";

import type { AvatarIdentity } from "@/lib/identity/identity";
import { moveWithCollision } from "@/lib/game/collision";
import { AVATAR_SIZE, findAreaAt, SOLIDS } from "@/lib/game/map";
import { campusStretch, canonicalToCampus, LAB_SPAWN } from "./world/campus";
import { type Seat, seatNear } from "./world/seats";
import { LAB_SPEED_UNITS, LAB_SPRINT } from "./labTuning";
import type { GameSnapshot } from "@/lib/game/engine";
import type { RemoteAvatarRender } from "@/lib/realtime/types";
import type { AreaId, AvatarState, Direction } from "@/types/office";

// Headless simulation for the 3D lab. Movement, collision and area
// detection REUSE the exact same modules as the production 2D engine
// (map.ts stays the single source of truth); only rendering differs.
// The public surface mirrors OfficeGame so the STEP 3/4 hooks
// (useOfficeRealtime, MiniMap, MobileJoystick) work unchanged.

// Pace is tuned in METRES across the campus, not in canonical units:
// the campus transform stretches the canonical corridor into the whole
// outdoor world, so one canonical unit is a short step indoors and a
// long one on the plaza. Dividing by the local stretch keeps walking
// speed constant in the world the player actually sees, while the
// POSITION that gets broadcast stays canonical and 2D-compatible.
const MAX_DT = 0.05;
/** clamp so a near-singular patch can never launch or freeze the walk */
const STRETCH_MIN = 0.25;
const STRETCH_MAX = 14;
/** see updateArea() note — tighter than the shared 2D box. */
const LAB_AVATAR_SIZE = Math.round(AVATAR_SIZE * 0.55);
const JOYSTICK_DEADZONE = 0.12;

// Screen→world input rotation: the chase camera sits behind the
// avatar's facing, so "screen up" must mean "away from the camera".
// k = number of 90° clockwise rotations applied to the screen vector,
// derived from the facing the camera is parked behind.
const DIR_K: Record<Direction, number> = { up: 0, right: 1, down: 2, left: 3 };

const SPRINT_CODES = new Set(["ShiftLeft", "ShiftRight"]);

const MOVE_CODES = new Set([
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
]);

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT" ||
    target.isContentEditable
  );
}

export class LabSim {
  avatar: AvatarState = {
    x: LAB_SPAWN.x,
    y: LAB_SPAWN.y,
    direction: "up",
    moving: false,
  };
  private pressed = new Set<string>();
  private joyX = 0;
  private joyY = 0;
  private pointerX = 0;
  private pointerY = 0;
  private latchedK = 0;
  private wasActive = false;
  private sprinting = false;
  // ── seat check-in ──────────────────────────────────────────────────
  private seatPhase: "idle" | "approach" | "sitting" | "seated" | "standing" = "idle";
  private seat: Seat | null = null;
  private seatT = 0;
  private seatFrom = { x: 0, y: 0 };
  private nearby: Seat | null = null;
  private nearbyTaken = false;
  /** Seat ids other people are checked in at (best-effort, from presence). */
  private occupied: ReadonlySet<string> = new Set();
  /** fired when the seat you could take, or the one you are in, changes */
  onSeatChange:
    | ((s: { nearby: Seat | null; seated: Seat | null; taken: boolean }) => void)
    | null = null;
  private inputEnabled = true;
  private currentArea: AreaId | null = findAreaAt(LAB_SPAWN);
  private localIdentity: AvatarIdentity | null = null;
  private attached = false;

  onAreaChange: ((area: AreaId | null) => void) | null = null;
  /** Assigned by useOfficeRealtime — same contract as OfficeGame. */
  remoteSource: ((dt: number) => RemoteAvatarRender[]) | null = null;
  /** dev/test: set by the 3D canvas to project world → screen px. */
  projector: ((x: number, y: number) => { x: number; y: number } | null) | null =
    null;

  attach() {
    if (this.attached) return;
    this.attached = true;
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    window.addEventListener("blur", this.handleBlur);
    this.onAreaChange?.(this.currentArea);
    if (process.env.NODE_ENV !== "production") {
      window.__officeGame = {
        teleport: (x, y) => this.teleport(x, y),
        snapshot: () => this.getSnapshot(),
        worldToScreen: (x, y) => this.projector?.(x, y) ?? null,
      };
    }
  }

  detach() {
    if (!this.attached) return;
    this.attached = false;
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    window.removeEventListener("blur", this.handleBlur);
    if (process.env.NODE_ENV !== "production" && window.__officeGame) {
      delete window.__officeGame;
    }
  }

  setInputEnabled(enabled: boolean) {
    this.inputEnabled = enabled;
    if (!enabled) {
      this.pressed.clear();
      this.sprinting = false;
      this.joyX = 0;
      this.joyY = 0;
      this.pointerX = 0;
      this.pointerY = 0;
    }
  }

  /** Screen-space steering from touching/dragging the canvas. */
  setPointer(x: number, y: number) {
    this.pointerX = x;
    this.pointerY = y;
  }

  setJoystick(x: number, y: number) {
    this.joyX = x;
    this.joyY = y;
  }

  teleport(x: number, y: number) {
    // Being moved bodily elsewhere ends the check-in. Otherwise the
    // seat keeps claiming an avatar that is demonstrably not in it.
    const wasSeated = this.seat !== null;
    this.seat = null;
    this.seatPhase = "idle";
    this.avatar.x = x;
    this.avatar.y = y;
    this.updateArea();
    if (wasSeated) this.notifySeat();
  }

  /**
   * Dev/test only: walk a virtual body from A toward B through the
   * REAL collision data, without touching the player. Lets the M1
   * acceptance prove "this entrance opening passes" and "this exterior
   * wall blocks" against the same rects the game uses.
   */
  probePath(ax: number, ay: number, bx: number, by: number) {
    const body = { x: ax, y: ay };
    const step = 3;
    for (let i = 0; i < 4000; i++) {
      const dx = bx - body.x;
      const dy = by - body.y;
      const len = Math.hypot(dx, dy);
      if (len < step) break;
      const next = moveWithCollision(
        body,
        (dx / len) * step,
        (dy / len) * step,
        LAB_AVATAR_SIZE,
        SOLIDS,
      );
      if (Math.hypot(next.x - body.x, next.y - body.y) < 0.05) break;
      body.x = next.x;
      body.y = next.y;
    }
    return {
      x: body.x,
      y: body.y,
      reached: Math.hypot(bx - body.x, by - body.y) < 24,
      area: findAreaAt(body),
    };
  }

  /** The seat within reach, if any. */
  seatInReach(): Seat | null {
    return this.seatPhase === "idle" ? this.nearby : null;
  }

  /** The seat currently occupied, if any. */
  seatedIn(): Seat | null {
    return this.seatPhase === "seated" ? this.seat : null;
  }

  isSeated(): boolean {
    return this.seatPhase === "seated";
  }

  /** Walk to a seat and sit. No teleport: the avatar covers the ground. */
  sit(seat?: Seat | null): boolean {
    const target = seat ?? this.nearby;
    if (!target || this.seatPhase !== "idle") return false;
    if (this.occupied.has(target.id)) return false;
    this.seat = target;
    this.seatPhase = "approach";
    this.seatT = 0;
    this.seatFrom = { x: this.avatar.x, y: this.avatar.y };
    this.pressed.clear();
    this.avatar.moving = true;
    this.notifySeat();
    return true;
  }

  /** Stand up and step back to the approach point. */
  stand(): boolean {
    if (this.seatPhase !== "seated" || !this.seat) return false;
    this.seatPhase = "standing";
    this.seatT = 0;
    this.seatFrom = { x: this.avatar.x, y: this.avatar.y };
    this.notifySeat();
    return true;
  }

  private notifySeat() {
    this.onSeatChange?.({
      nearby: this.seatInReach(),
      seated: this.seatedIn(),
      taken: this.nearbyTaken,
    });
  }

  /**
   * Best-effort occupancy from presence. Someone else's claim simply
   * makes a seat unofferable; there is no lock and no reservation, which
   * is the right amount of machinery for one office floor.
   */
  setOccupiedSeats(ids: ReadonlySet<string>) {
    this.occupied = ids;
    if (this.seatPhase === "idle") this.refreshNearby();
  }

  /** Face the avatar along a canonical delta, in 4-way terms. */
  private faceAlong(dx: number, dy: number) {
    if (Math.abs(dx) >= Math.abs(dy)) this.avatar.direction = dx >= 0 ? "right" : "left";
    else this.avatar.direction = dy >= 0 ? "down" : "up";
  }

  /**
   * Seat transitions. Position is interpolated in CANONICAL space, so
   * the broadcast position stays continuous and 2D clients see a walk,
   * never a jump.
   */
  private stepSeat(dt: number): void {
    const seat = this.seat;
    if (!seat) {
      this.seatPhase = "idle";
      return;
    }
    const move = (to: { x: number; y: number }, secs: number) => {
      this.seatT = Math.min(1, this.seatT + dt / secs);
      const k = this.seatT * this.seatT * (3 - 2 * this.seatT); // smoothstep
      this.avatar.x = this.seatFrom.x + (to.x - this.seatFrom.x) * k;
      this.avatar.y = this.seatFrom.y + (to.y - this.seatFrom.y) * k;
      this.faceAlong(to.x - this.seatFrom.x, to.y - this.seatFrom.y);
      return this.seatT >= 1;
    };
    if (this.seatPhase === "approach") {
      const secs = Math.max(
        0.25,
        Math.hypot(seat.approach.x - this.seatFrom.x, seat.approach.y - this.seatFrom.y) / 90,
      );
      if (move(seat.approach, secs)) {
        this.seatPhase = "sitting";
        this.seatT = 0;
        this.seatFrom = { x: this.avatar.x, y: this.avatar.y };
      }
    } else if (this.seatPhase === "sitting") {
      if (move(seat.canonical, 0.45)) {
        this.seatPhase = "seated";
        this.avatar.moving = false;
        this.notifySeat();
      }
    } else if (this.seatPhase === "standing") {
      if (move(seat.approach, 0.4)) {
        this.seatPhase = "idle";
        this.seat = null;
        this.avatar.moving = false;
        this.notifySeat();
      }
    }
    this.updateArea();
  }

  getSnapshot(): GameSnapshot {
    return {
      x: Math.round(this.avatar.x),
      y: Math.round(this.avatar.y),
      direction: this.avatar.direction,
      moving: this.avatar.moving,
      area: this.currentArea,
    };
  }

  setLocalIdentity(identity: AvatarIdentity | null) {
    this.localIdentity = identity;
  }

  getLocalIdentity(): AvatarIdentity | null {
    return this.localIdentity;
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (SPRINT_CODES.has(e.code)) {
      if (this.inputEnabled && !isTypingTarget(e.target)) this.sprinting = true;
      return;
    }
    if (!MOVE_CODES.has(e.code)) return;
    if (!this.inputEnabled || isTypingTarget(e.target)) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    e.preventDefault();
    this.pressed.add(e.code);
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    if (SPRINT_CODES.has(e.code)) this.sprinting = false;
    this.pressed.delete(e.code);
  };

  private handleBlur = () => {
    this.pressed.clear();
    this.sprinting = false;
  };

  /** Raw input in SCREEN space (up = away from camera). */
  private inputVector(): { x: number; y: number } {
    const joyLen = Math.hypot(this.joyX, this.joyY);
    if (joyLen > JOYSTICK_DEADZONE) {
      const capped = Math.min(joyLen, 1);
      return {
        x: (this.joyX / joyLen) * capped,
        y: (this.joyY / joyLen) * capped,
      };
    }
    const right =
      (this.pressed.has("ArrowRight") || this.pressed.has("KeyD") ? 1 : 0) -
      (this.pressed.has("ArrowLeft") || this.pressed.has("KeyA") ? 1 : 0);
    const down =
      (this.pressed.has("ArrowDown") || this.pressed.has("KeyS") ? 1 : 0) -
      (this.pressed.has("ArrowUp") || this.pressed.has("KeyW") ? 1 : 0);
    const len = Math.hypot(right, down);
    if (len > 0) return { x: right / len, y: down / len };
    const ptrLen = Math.hypot(this.pointerX, this.pointerY);
    if (ptrLen > 0.001) {
      const capped = Math.min(ptrLen, 1);
      return {
        x: (this.pointerX / ptrLen) * capped,
        y: (this.pointerY / ptrLen) * capped,
      };
    }
    return { x: 0, y: 0 };
  }

  /** Rotate a screen-space vector into world space (k × 90° CW). */
  private rotateK(v: { x: number; y: number }, k: number) {
    let { x, y } = v;
    for (let i = 0; i < k; i++) {
      const nx = -y;
      y = x;
      x = nx;
    }
    return { x, y };
  }

  /** Called from the R3F frame loop. */
  update(rawDt: number) {
    const dt = Math.min(rawDt, MAX_DT);
    if (this.seatPhase === "approach" || this.seatPhase === "sitting" || this.seatPhase === "standing") {
      this.stepSeat(dt);
      return;
    }
    const raw = this.inputEnabled ? this.inputVector() : { x: 0, y: 0 };
    if (this.seatPhase === "seated") {
      // walking away is the natural way to leave a seat
      if (Math.hypot(raw.x, raw.y) > 0.001) this.stand();
      return;
    }
    const len = Math.hypot(raw.x, raw.y);
    this.avatar.moving = len > 0.001;
    // Latch the view rotation when an input gesture STARTS: while a
    // key/stick/drag is held the mapping stays fixed, so the camera
    // swinging behind the new facing doesn't re-steer the input
    // (no spin while holding a direction).
    if (this.avatar.moving && !this.wasActive) {
      this.latchedK = DIR_K[this.avatar.direction];
    }
    this.wasActive = this.avatar.moving;
    if (!this.avatar.moving) return;
    const v = this.rotateK(raw, this.latchedK);

    if (Math.abs(v.x) >= Math.abs(v.y)) {
      this.avatar.direction = v.x >= 0 ? "right" : "left";
    } else {
      this.avatar.direction = v.y >= 0 ? "down" : "up";
    }

    // Campus metres per second -> canonical units per second. The
    // stretch changes quickly as you step out of a building, so the
    // first estimate is corrected against the campus distance the step
    // would ACTUALLY cover; otherwise leaving a doorway reads as a
    // lurch even though the position itself is continuous.
    const want = LAB_SPEED_UNITS * (this.sprinting ? LAB_SPRINT : 1) * dt;
    const s0 = campusStretch(this.avatar.x, this.avatar.y, v.x, v.y);
    const lo = want / STRETCH_MAX;
    const hi = want / STRETCH_MIN;
    let step = Math.min(hi, Math.max(lo, want / s0));
    const here = canonicalToCampus(this.avatar.x, this.avatar.y);
    for (let i = 0; i < 3; i++) {
      const trial = canonicalToCampus(this.avatar.x + v.x * step, this.avatar.y + v.y * step);
      const covered = Math.hypot(trial.x - here.x, trial.y - here.y);
      if (covered < 1e-5) break;
      step = Math.min(hi, Math.max(lo, step * (want / covered)));
    }
    const next = moveWithCollision(
      this.avatar,
      v.x * step,
      v.y * step,
      LAB_AVATAR_SIZE,
      SOLIDS,
    );
    this.avatar.x = next.x;
    this.avatar.y = next.y;
    this.updateArea();
  }

  /**
   * Collision radius for the lab. The shared AVATAR_SIZE is authored
   * for the 1:1 office; at the hall's larger render scale that box
   * would read as a 2 m bubble around a 1.7 m person, so the lab uses
   * a tighter box that matches the body you actually see.
   */
  private updateArea() {
    const area = findAreaAt(this.avatar);
    if (area !== this.currentArea) {
      this.currentArea = area;
      this.onAreaChange?.(area);
    }
    this.refreshNearby();
  }

  private refreshNearby() {
    const found = seatNear(this.avatar.x, this.avatar.y, this.currentArea, this.occupied);
    const seat = found?.seat ?? null;
    const taken = found?.taken ?? false;
    if (seat !== this.nearby || taken !== this.nearbyTaken) {
      this.nearby = seat;
      this.nearbyTaken = taken;
      this.notifySeat();
    }
  }
}
