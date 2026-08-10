"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { OfficeGame } from "@/lib/game/engine";
import {
  buildIdentity,
  type EffectiveStatus,
  type ManualStatus,
} from "@/lib/identity/identity";
import { OfficeRealtimeManager } from "@/lib/realtime/officeRealtime";
import type {
  RealtimeStats,
  RealtimeStatus,
  RosterEntry,
} from "@/lib/realtime/types";
import { useCurrentUser } from "@/lib/auth/SessionProvider";
import { getDataSource } from "@/lib/repositories";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { AreaId } from "@/types/office";

declare global {
  interface Window {
    /** Development-only instrumentation for realtime acceptance tests. */
    __officeRealtime?: {
      roster: () => RosterEntry[];
      stats: () => RealtimeStats;
      remotes: () => ReturnType<OfficeRealtimeManager["sample"]>;
      channels: () => string[];
      simulateIdle: (idle: boolean) => void;
    };
  }
}

/** Inactivity threshold for automatic away (STEP 4). */
const IDLE_AWAY_MS = 5 * 60 * 1000;
const IDLE_CHECK_MS = 30 * 1000;

export interface OfficeRealtimeState {
  /** false for guests / DEMO mode — no presence UI at all. */
  enabled: boolean;
  status: RealtimeStatus;
  roster: RosterEntry[];
  /** Everyone currently in the office, self included. */
  onlineCount: number;
  /** The local player's status as others see it. */
  myStatus: EffectiveStatus;
  manualStatus: ManualStatus;
  setManualStatus: (status: ManualStatus) => void;
  /** Dev diagnostics for the DebugOverlay (null in production). */
  statsSource: (() => RealtimeStats) | null;
}

const DISABLED: OfficeRealtimeState = {
  enabled: false,
  status: "offline",
  roster: [],
  onlineCount: 0,
  myStatus: "available",
  manualStatus: "available",
  setManualStatus: () => {},
  statsSource: null,
};

/**
 * Bridges the office realtime layer into the office UI:
 * - connects members/admins (never guests) to the presence channel,
 * - feeds remote avatars + the local identity into the engine renderer,
 * - publishes throttled local movement and status/identity changes,
 * - exposes a low-frequency roster + connection status for the HUD.
 */
export function useOfficeRealtime(
  gameRef: React.MutableRefObject<OfficeGame | null>,
  currentArea: AreaId | null,
): OfficeRealtimeState {
  const user = useCurrentUser();
  const [status, setStatus] = useState<RealtimeStatus>("connecting");
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [manualStatus, setManualStatusState] = useState<ManualStatus>("available");
  const managerRef = useRef<OfficeRealtimeManager | null>(null);

  const enabled =
    getDataSource() === "SUPABASE" &&
    user !== null &&
    (user.role === "member" || user.role === "admin");
  const userId = enabled ? user.id : null;

  useEffect(() => {
    if (!enabled || !userId || !user) return;

    const manager = new OfficeRealtimeManager({
      // Client-safe fields only — never email or auth material.
      userId: user.id,
      displayName: user.name,
      department: user.department,
      position: user.position,
      avatarUrl: user.avatar_url,
      areaId: gameRef.current?.getSnapshot().area ?? null,
      status: "available",
    });
    managerRef.current = manager;
    manager.onStatusChange = setStatus;
    manager.onRosterChange = setRoster;
    manager.positionSource = () => gameRef.current?.getSnapshot() ?? null;
    setStatus("connecting");
    setRoster(manager.roster());
    void manager.connect();

    manager.startPublishing(() => gameRef.current?.getSnapshot() ?? null);

    // The engine mounts in a sibling effect — bind as soon as it exists.
    let bound: OfficeGame | null = null;
    const bind = window.setInterval(() => {
      const game = gameRef.current;
      if (game) {
        game.remoteSource = (dt) => manager.sample(dt);
        bound = game;
        window.clearInterval(bind);
      }
    }, 100);

    // Idle detection → automatic away (STEP 4).
    let lastActivity = Date.now();
    const onActivity = () => {
      lastActivity = Date.now();
      manager.setIdle(false);
    };
    const activityEvents: Array<keyof WindowEventMap> = [
      "pointerdown",
      "pointermove",
      "keydown",
      "touchstart",
      "wheel",
    ];
    for (const ev of activityEvents) {
      window.addEventListener(ev, onActivity, { passive: true });
    }
    const idleTimer = window.setInterval(() => {
      if (Date.now() - lastActivity >= IDLE_AWAY_MS) manager.setIdle(true);
    }, IDLE_CHECK_MS);

    if (process.env.NODE_ENV !== "production") {
      window.__officeRealtime = {
        roster: () => manager.roster(),
        stats: () => manager.stats(),
        remotes: () => manager.sample(0),
        channels: () => getSupabaseClient().getChannels().map((c) => c.topic),
        simulateIdle: (idle: boolean) => {
          // Freeze the activity clock so the interval doesn't undo it.
          lastActivity = idle ? 0 : Date.now();
          manager.setIdle(idle);
        },
      };
    }

    return () => {
      window.clearInterval(bind);
      window.clearInterval(idleTimer);
      for (const ev of activityEvents) {
        window.removeEventListener(ev, onActivity);
      }
      if (bound) bound.remoteSource = null;
      managerRef.current = null;
      manager.onStatusChange = null;
      manager.onRosterChange = null;
      void manager.dispose();
      setRoster([]);
      setStatus("offline");
      if (process.env.NODE_ENV !== "production") {
        delete window.__officeRealtime;
      }
    };
    // user object identity changes on token refresh; reconnect only on
    // user switch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, userId]);

  useEffect(() => {
    managerRef.current?.setLocalArea(currentArea);
  }, [currentArea]);

  // Profile edits (name / position / avatar…) re-announce presence so
  // peers update without reloads.
  useEffect(() => {
    if (!user) return;
    managerRef.current?.updateLocalIdentity({
      displayName: user.name,
      department: user.department,
      position: user.position,
      avatarUrl: user.avatar_url,
    });
  }, [user]);

  // Keep the canvas renderer's local identity in sync (color / photo /
  // effective status). Identity building stays renderer-agnostic.
  const myStatus: EffectiveStatus =
    roster.find((r) => r.isSelf)?.status ?? "available";
  useEffect(() => {
    if (!enabled || !user) return;
    const game = gameRef.current;
    if (!game) return;
    game.setLocalIdentity(
      buildIdentity({
        userId: user.id,
        displayName: user.name,
        department: user.department,
        avatarUrl: user.avatar_url,
        status: myStatus,
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, user, myStatus, roster.length]);

  const setManualStatus = useCallback((next: ManualStatus) => {
    managerRef.current?.setManualStatus(next);
    setManualStatusState(next);
  }, []);

  if (!enabled) return DISABLED;
  return {
    enabled,
    status,
    roster,
    onlineCount: roster.length,
    myStatus,
    manualStatus,
    setManualStatus,
    statsSource:
      process.env.NODE_ENV !== "production" && managerRef.current
        ? () => managerRef.current!.stats()
        : null,
  };
}
