"use client";

import type { AvatarIdentity } from "@/lib/identity/identity";
import { moveWithCollision } from "@/lib/game/collision";
import { AVATAR_SIZE, findAreaAt, SOLIDS, SPAWN } from "@/lib/game/map";
import type { GameSnapshot } from "@/lib/game/engine";
import type { RemoteAvatarRender } from "@/lib/realtime/types";
import type { AreaId, AvatarState } from "@/types/office";

// Headless simulation for the 3D lab. Movement, collision and area
// detection REUSE the exact same modules as the production 2D engine
// (map.ts stays the single source of truth); only rendering differs.
// The public surface mirrors OfficeGame so the STEP 3/4 hooks
// (useOfficeRealtime, MiniMap, MobileJoystick) work unchanged.

const SPEED = 260; // world units / second — identical to the 2D engine
const MAX_DT = 0.05;
const JOYSTICK_DEADZONE = 0.12;

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
    x: SPAWN.x,
    y: SPAWN.y,
    direction: "up",
    moving: false,
  };
  private pressed = new Set<string>();
  private joyX = 0;
  private joyY = 0;
  private inputEnabled = true;
  private currentArea: AreaId | null = findAreaAt(SPAWN);
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
      this.joyX = 0;
      this.joyY = 0;
    }
  }

  setJoystick(x: number, y: number) {
    this.joyX = x;
    this.joyY = y;
  }

  teleport(x: number, y: number) {
    this.avatar.x = x;
    this.avatar.y = y;
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
    if (!MOVE_CODES.has(e.code)) return;
    if (!this.inputEnabled || isTypingTarget(e.target)) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    e.preventDefault();
    this.pressed.add(e.code);
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.pressed.delete(e.code);
  };

  private handleBlur = () => {
    this.pressed.clear();
  };

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
    return len > 0 ? { x: right / len, y: down / len } : { x: 0, y: 0 };
  }

  /** Called from the R3F frame loop. */
  update(rawDt: number) {
    const dt = Math.min(rawDt, MAX_DT);
    const v = this.inputEnabled ? this.inputVector() : { x: 0, y: 0 };
    const len = Math.hypot(v.x, v.y);
    this.avatar.moving = len > 0.001;
    if (!this.avatar.moving) return;

    if (Math.abs(v.x) >= Math.abs(v.y)) {
      this.avatar.direction = v.x >= 0 ? "right" : "left";
    } else {
      this.avatar.direction = v.y >= 0 ? "down" : "up";
    }

    const next = moveWithCollision(
      this.avatar,
      v.x * SPEED * dt,
      v.y * SPEED * dt,
      AVATAR_SIZE,
      SOLIDS,
    );
    this.avatar.x = next.x;
    this.avatar.y = next.y;
    this.updateArea();
  }

  private updateArea() {
    const area = findAreaAt(this.avatar);
    if (area !== this.currentArea) {
      this.currentArea = area;
      this.onAreaChange?.(area);
    }
  }
}
