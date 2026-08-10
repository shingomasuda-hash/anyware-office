import type { AvatarIdentity } from "@/lib/identity/identity";
import type { RemoteAvatarRender } from "@/lib/realtime/types";
import type { AreaId, AvatarState, Direction } from "@/types/office";
import { moveWithCollision } from "./collision";
import { AVATAR_SIZE, findAreaAt, SOLIDS, SPAWN, WORLD } from "./map";
import { drawScene, type Viewport } from "./render";

/** Result of a click/tap hit test against avatars (STEP 4). */
export type AvatarPick =
  | { kind: "self" }
  | { kind: "remote"; userId: string }
  | null;

export interface GameSnapshot {
  x: number;
  y: number;
  direction: Direction;
  moving: boolean;
  area: AreaId | null;
}

const SPEED = 260; // world units per second
const MAX_DT = 0.05; // clamp long frames (tab switch etc.)
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

declare global {
  interface Window {
    __officeGame?: {
      teleport: (x: number, y: number) => void;
      snapshot: () => GameSnapshot;
      /** dev/test: world → canvas CSS px (for click simulation). */
      worldToScreen: (x: number, y: number) => { x: number; y: number } | null;
    };
  }
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT" ||
    target.isContentEditable
  );
}

/**
 * Owns the game loop, input state, avatar state, and canvas rendering.
 * React only hears about discrete changes (current area) via callback;
 * per-frame state stays out of React to avoid re-render storms.
 */
export class OfficeGame {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private rafId = 0;
  private lastTime = 0;

  private pressed = new Set<string>();
  private joyX = 0;
  private joyY = 0;
  private inputEnabled = true;

  private avatar: AvatarState = {
    x: SPAWN.x,
    y: SPAWN.y,
    direction: "up",
    moving: false,
  };
  private currentArea: AreaId | null = findAreaAt(SPAWN);

  onAreaChange: ((area: AreaId | null) => void) | null = null;

  /**
   * STEP 3: remote avatars. The realtime manager owns their state and
   * interpolation; the engine just asks for this frame's draw list.
   * Stays outside React — sampled once per rendered frame.
   */
  remoteSource: ((dt: number) => RemoteAvatarRender[]) | null = null;

  /** STEP 4: the local player's identity (color / photo / status). */
  private localIdentity: AvatarIdentity | null = null;
  /** Last frame's remotes + viewport, kept for click hit tests. */
  private lastRemotes: RemoteAvatarRender[] = [];
  private lastViewport: Viewport | null = null;

  setLocalIdentity(identity: AvatarIdentity | null) {
    this.localIdentity = identity;
  }

  /**
   * Hit test a canvas-space (CSS px) point against avatars. The local
   * player wins ties; remotes are tested nearest-first.
   */
  pickAvatar(cssX: number, cssY: number): AvatarPick {
    const view = this.lastViewport;
    if (!view) return null;
    const wx = cssX / view.scale + view.ox;
    const wy = cssY / view.scale + view.oy;
    // Avatar visual bounds: head top ~y-18 to shadow ~y+14, width ~22.
    const hit = (ax: number, ay: number) =>
      Math.abs(wx - ax) <= 14 && wy >= ay - 22 && wy <= ay + 16;
    if (hit(this.avatar.x, this.avatar.y)) return { kind: "self" };
    let best: { userId: string; d: number } | null = null;
    for (const r of this.lastRemotes) {
      if (!hit(r.x, r.y)) continue;
      const d = Math.hypot(wx - r.x, wy - r.y);
      if (!best || d < best.d) best = { userId: r.userId, d };
    }
    return best ? { kind: "remote", userId: best.userId } : null;
  }

  attach(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    window.addEventListener("blur", this.handleBlur);
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame(this.loop);
    this.onAreaChange?.(this.currentArea);
    if (process.env.NODE_ENV !== "production") {
      window.__officeGame = {
        teleport: (x, y) => this.teleport(x, y),
        snapshot: () => this.getSnapshot(),
        worldToScreen: (x, y) => {
          const view = this.lastViewport;
          if (!view) return null;
          return { x: (x - view.ox) * view.scale, y: (y - view.oy) * view.scale };
        },
      };
    }
  }

  detach() {
    cancelAnimationFrame(this.rafId);
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    window.removeEventListener("blur", this.handleBlur);
    if (process.env.NODE_ENV !== "production" && window.__officeGame) {
      delete window.__officeGame;
    }
    this.canvas = null;
    this.ctx = null;
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
      // Joystick already carries analog magnitude; cap at 1.
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
    // Normalize so diagonal movement is not faster.
    return len > 0 ? { x: right / len, y: down / len } : { x: 0, y: 0 };
  }

  private update(dt: number) {
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

  private viewport(cssW: number, cssH: number): Viewport {
    const fit = Math.min(cssW / WORLD.w, cssH / WORLD.h);
    const scale = cssW < 768 ? 0.8 : Math.min(Math.max(fit, 0.55), 1);
    const viewW = cssW / scale;
    const viewH = cssH / scale;
    const ox =
      viewW >= WORLD.w
        ? -(viewW - WORLD.w) / 2
        : Math.min(Math.max(this.avatar.x - viewW / 2, 0), WORLD.w - viewW);
    const oy =
      viewH >= WORLD.h
        ? -(viewH - WORLD.h) / 2
        : Math.min(Math.max(this.avatar.y - viewH / 2, 0), WORLD.h - viewH);
    return { ox, oy, scale, w: cssW, h: cssH };
  }

  private render(dt: number) {
    const canvas = this.canvas;
    const ctx = this.ctx;
    if (!canvas || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.clientWidth;
    const cssH = canvas.clientHeight;
    if (cssW === 0 || cssH === 0) return;
    const bw = Math.round(cssW * dpr);
    const bh = Math.round(cssH * dpr);
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw;
      canvas.height = bh;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const remotes = this.remoteSource?.(dt) ?? null;
    const view = this.viewport(cssW, cssH);
    this.lastRemotes = remotes ?? [];
    this.lastViewport = view;
    drawScene(ctx, view, this.avatar, remotes, this.localIdentity);
  }

  private loop = (time: number) => {
    const dt = Math.min((time - this.lastTime) / 1000, MAX_DT);
    this.lastTime = time;
    this.update(dt);
    this.render(dt);
    this.rafId = requestAnimationFrame(this.loop);
  };
}
