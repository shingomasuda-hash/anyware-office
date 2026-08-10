"use client";

import type {
  RealtimeChannel,
  RealtimeChannelSendResponse,
} from "@supabase/supabase-js";
import type { GameSnapshot } from "@/lib/game/engine";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { AreaId } from "@/types/office";
import type {
  MoveEvent,
  PresenceMeta,
  RealtimeStats,
  RealtimeStatus,
  RemoteAvatarRender,
  RemotePlayer,
  RosterEntry,
} from "./types";

// Single owner of the office realtime connection: one channel carries
// presence (who is in the office) and movement broadcasts. UI components
// never call supabase.channel() themselves — they talk to this manager
// via useOfficeRealtime.
//
// Security model (STEP 3):
// - Only authenticated members/admins connect (the hook enforces this;
//   guests neither publish nor subscribe).
// - The payload allowlist lives in realtime/types.ts — no email, no
//   tokens.
// - The manager first tries a PRIVATE channel (Supabase Realtime
//   Authorization; see supabase/migrations/step3_realtime.sql). Until
//   those policies are applied to the project it falls back to a public
//   channel carrying the same minimal payload, and reports which mode it
//   is in via stats.privateChannel.

const TOPIC = "office:v1";
/**
 * Once the project rejects the private channel (Realtime Authorization
 * policies not applied), remember it for this page load — reconnects go
 * straight to the public fallback instead of re-erroring.
 */
let privateChannelRejected = false;
/** ~12.5 broadcasts/second ceiling — well under Realtime limits. */
const SEND_INTERVAL_MS = 80;
/** Lerp aggressiveness for remote avatars (per second). */
const LERP_RATE = 12;
/** Beyond this distance, snap instead of gliding across the map. */
const SNAP_DISTANCE = 260;

export class OfficeRealtimeManager {
  private channel: RealtimeChannel | null = null;
  private local: PresenceMeta;
  private remotes = new Map<string, RemotePlayer>();
  private status: RealtimeStatus = "connecting";
  private usingPrivate = true;
  private disposed = false;
  private tracked = false;

  private sendTimer: number | null = null;
  private lastSent: { x: number; y: number; direction: string; areaId: AreaId | null } | null =
    null;
  private sentTimestamps: number[] = [];

  private rosterTimer: number | null = null;

  onRosterChange: ((roster: RosterEntry[]) => void) | null = null;
  onStatusChange: ((status: RealtimeStatus) => void) | null = null;
  /** Supplies the local avatar position for presence tracking. */
  positionSource: (() => GameSnapshot | null) | null = null;

  constructor(local: PresenceMeta) {
    this.local = { ...local };
  }

  // ── lifecycle ────────────────────────────────────────────────────────

  async connect(): Promise<void> {
    const supabase = getSupabaseClient();
    // Attach the user JWT to the realtime socket (required for private
    // channels; harmless on public ones).
    await supabase.realtime.setAuth();
    await this.subscribeChannel(!privateChannelRejected);
  }

  /** Presence payload including the current position snapshot. */
  private trackMeta(): PresenceMeta {
    const snap = this.positionSource?.() ?? null;
    return snap
      ? { ...this.local, x: snap.x, y: snap.y }
      : { ...this.local };
  }

  private async subscribeChannel(tryPrivate: boolean) {
    if (this.disposed) return;
    const supabase = getSupabaseClient();
    // A channel for this topic may still exist from a React re-mount
    // (dev StrictMode) — joining the same topic twice on one socket
    // fails, so clear stale instances first.
    for (const stale of supabase.getChannels()) {
      if (stale.topic === `realtime:${TOPIC}`) {
        await supabase.removeChannel(stale);
      }
    }
    if (this.disposed) return;
    this.usingPrivate = tryPrivate;
    this.tracked = false;

    const channel = supabase.channel(TOPIC, {
      config: {
        private: tryPrivate,
        presence: { key: this.local.userId },
        broadcast: { self: false, ack: false },
      },
    });
    this.channel = channel;

    // Presence listeners must be bound BEFORE subscribe.
    channel.on("presence", { event: "sync" }, () => this.syncFromPresence());
    channel.on("presence", { event: "join" }, () => this.syncFromPresence());
    channel.on("presence", { event: "leave" }, () => this.syncFromPresence());
    channel.on("broadcast", { event: "move" }, ({ payload }) =>
      this.handleMove(payload as MoveEvent),
    );

    // The subscribe callback fires on every status transition, including
    // auto-rejoin attempts of an errored channel. Guard so (a) callbacks
    // from a superseded channel instance are ignored and (b) the
    // private→public fallback runs at most once per instance.
    let fellBack = false;
    channel.subscribe((state, err) => {
      if (this.disposed || this.channel !== channel) return;
      if (state === "SUBSCRIBED") {
        this.setStatus("live");
        // (Re)announce ourselves after every successful join — this is
        // what restores presence after a reconnect.
        void channel.track(this.trackMeta()).then(() => {
          this.tracked = true;
        });
        return;
      }
      if (state === "CHANNEL_ERROR") {
        const message = err?.message ?? "";
        if (tryPrivate && !fellBack && /unauthorized|permission/i.test(message)) {
          // Realtime Authorization policies not applied yet — fall back
          // to the public channel (payload is minimal by design).
          fellBack = true;
          privateChannelRejected = true;
          this.channel = null; // supersede before async teardown
          void supabase.removeChannel(channel).then(() => {
            if (!this.disposed) void this.subscribeChannel(false);
          });
          return;
        }
        this.setStatus("connecting");
        return;
      }
      if (state === "TIMED_OUT") {
        this.setStatus("connecting");
        return;
      }
      if (state === "CLOSED") {
        this.setStatus(this.disposed ? "offline" : "connecting");
      }
    });
  }

  async dispose(): Promise<void> {
    this.disposed = true;
    this.stopPublishing();
    if (this.rosterTimer !== null) {
      window.clearTimeout(this.rosterTimer);
      this.rosterTimer = null;
    }
    const channel = this.channel;
    this.channel = null;
    this.remotes.clear();
    this.setStatus("offline");
    if (channel) {
      try {
        if (this.tracked) await channel.untrack();
      } catch {
        // Socket already gone — presence timeout will clean up.
      }
      await getSupabaseClient().removeChannel(channel);
    }
  }

  // ── presence roster ─────────────────────────────────────────────────

  private syncFromPresence() {
    const channel = this.channel;
    if (!channel) return;
    const state = channel.presenceState<PresenceMeta>();
    const seen = new Set<string>();

    for (const [key, metas] of Object.entries(state)) {
      if (key === this.local.userId) continue; // never render self remotely
      const meta = metas[metas.length - 1]; // multi-tab: latest wins
      if (!meta?.userId) continue;
      seen.add(key);
      const existing = this.remotes.get(key);
      if (existing) {
        // Movement broadcasts are the position authority once flowing —
        // keep interpolation state, refresh identity/area/status only.
        existing.meta = { ...meta, x: existing.meta.x, y: existing.meta.y };
      } else {
        const hasPos = typeof meta.x === "number" && typeof meta.y === "number";
        this.remotes.set(key, {
          meta,
          // Park the avatar at its tracked position so idle users are
          // visible immediately; the first broadcast corrects it.
          x: hasPos ? meta.x! : -1,
          y: hasPos ? meta.y! : -1,
          tx: hasPos ? meta.x! : -1,
          ty: hasPos ? meta.y! : -1,
          direction: "down",
          moving: false,
          lastEventAt: hasPos ? Date.now() : 0,
        });
      }
    }

    // Presence LEAVE → drop the avatar (no ghosts).
    for (const key of this.remotes.keys()) {
      if (!seen.has(key)) this.remotes.delete(key);
    }
    this.scheduleRosterNotify();
  }

  private handleMove(event: MoveEvent) {
    if (!event?.userId || event.userId === this.local.userId) return;
    const player = this.remotes.get(event.userId);
    if (!player) return; // move before presence join — presence sync will add it
    const first = player.lastEventAt === 0;
    player.tx = event.x;
    player.ty = event.y;
    if (first || Math.hypot(event.x - player.x, event.y - player.y) > SNAP_DISTANCE) {
      player.x = event.x;
      player.y = event.y;
    }
    player.direction = event.direction;
    player.lastEventAt = event.ts;
    if (player.meta.areaId !== event.areaId) {
      player.meta = {
        ...player.meta,
        areaId: event.areaId,
        status: event.areaId === "MEETING" ? "meeting" : "online",
      };
      this.scheduleRosterNotify();
    }
  }

  /** Coalesce roster updates so React re-renders stay low-frequency. */
  private scheduleRosterNotify() {
    if (this.rosterTimer !== null) return;
    this.rosterTimer = window.setTimeout(() => {
      this.rosterTimer = null;
      this.onRosterChange?.(this.roster());
    }, 60);
  }

  roster(): RosterEntry[] {
    const entries: RosterEntry[] = [
      {
        userId: this.local.userId,
        displayName: this.local.displayName,
        department: this.local.department,
        areaId: this.local.areaId,
        status: this.local.status,
        isSelf: true,
      },
    ];
    for (const p of this.remotes.values()) {
      entries.push({
        userId: p.meta.userId,
        displayName: p.meta.displayName,
        department: p.meta.department,
        areaId: p.meta.areaId,
        status: p.meta.status,
        isSelf: false,
      });
    }
    return entries;
  }

  // ── movement publishing (throttled, change-gated) ───────────────────

  startPublishing(sample: () => GameSnapshot | null) {
    this.stopPublishing();
    this.sendTimer = window.setInterval(() => {
      const snap = sample();
      const channel = this.channel;
      if (!snap || !channel || this.status !== "live") return;
      const last = this.lastSent;
      if (
        last &&
        last.x === snap.x &&
        last.y === snap.y &&
        last.direction === snap.direction &&
        last.areaId === snap.area
      ) {
        return; // idle — send nothing (§9 broadcast optimization)
      }
      const event: MoveEvent = {
        userId: this.local.userId,
        x: snap.x,
        y: snap.y,
        direction: snap.direction,
        areaId: snap.area,
        ts: Date.now(),
      };
      this.lastSent = {
        x: snap.x,
        y: snap.y,
        direction: snap.direction,
        areaId: snap.area,
      };
      const result: Promise<RealtimeChannelSendResponse> = channel.send({
        type: "broadcast",
        event: "move",
        payload: event,
      });
      void result;
      const now = Date.now();
      this.sentTimestamps.push(now);
      while (this.sentTimestamps.length && this.sentTimestamps[0] < now - 5000) {
        this.sentTimestamps.shift();
      }
    }, SEND_INTERVAL_MS);
  }

  stopPublishing() {
    if (this.sendTimer !== null) {
      window.clearInterval(this.sendTimer);
      this.sendTimer = null;
    }
  }

  /** Local area changed — refresh presence meta (rare, safe to re-track). */
  setLocalArea(areaId: AreaId | null) {
    const status = areaId === "MEETING" ? "meeting" : "online";
    if (this.local.areaId === areaId && this.local.status === status) return;
    this.local = { ...this.local, areaId, status };
    if (this.channel && this.status === "live" && this.tracked) {
      void this.channel.track(this.trackMeta());
    }
    this.scheduleRosterNotify();
  }

  // ── per-frame sampling from the game engine ─────────────────────────

  /**
   * Called by the canvas render loop every frame. Advances interpolation
   * and returns draw states. No React involved.
   */
  sample(dt: number): RemoteAvatarRender[] {
    const out: RemoteAvatarRender[] = [];
    for (const p of this.remotes.values()) {
      if (p.lastEventAt === 0) continue; // no position yet
      const dx = p.tx - p.x;
      const dy = p.ty - p.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 0.5) {
        const k = Math.min(1, dt * LERP_RATE);
        p.x += dx * k;
        p.y += dy * k;
        p.moving = true;
      } else {
        p.x = p.tx;
        p.y = p.ty;
        p.moving = false;
      }
      out.push({
        x: p.x,
        y: p.y,
        direction: p.direction,
        moving: p.moving,
        displayName: p.meta.displayName,
        department: p.meta.department,
        status: p.meta.status,
      });
    }
    return out;
  }

  // ── diagnostics ─────────────────────────────────────────────────────

  stats(): RealtimeStats {
    const now = Date.now();
    const recent = this.sentTimestamps.filter((t) => t >= now - 5000);
    return {
      status: this.status,
      presenceCount: this.remotes.size + 1,
      sentPerSecond: Math.round((recent.length / 5) * 10) / 10,
      privateChannel: this.usingPrivate,
    };
  }

  private setStatus(status: RealtimeStatus) {
    if (this.status === status) return;
    this.status = status;
    this.onStatusChange?.(status);
    if (status === "live") this.scheduleRosterNotify();
  }
}
