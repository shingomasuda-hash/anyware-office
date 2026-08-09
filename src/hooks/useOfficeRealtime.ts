"use client";

import { useEffect, useRef, useState } from "react";
import type { OfficeGame } from "@/lib/game/engine";
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
    };
  }
}

export interface OfficeRealtimeState {
  /** false for guests / DEMO mode — no presence UI at all. */
  enabled: boolean;
  status: RealtimeStatus;
  roster: RosterEntry[];
  /** Everyone currently in the office, self included. */
  onlineCount: number;
  /** Dev diagnostics for the DebugOverlay (null in production). */
  statsSource: (() => RealtimeStats) | null;
}

const DISABLED: OfficeRealtimeState = {
  enabled: false,
  status: "offline",
  roster: [],
  onlineCount: 0,
  statsSource: null,
};

/**
 * Bridges the office realtime layer into the office UI:
 * - connects members/admins (never guests) to the presence channel,
 * - feeds remote avatars into the engine's render loop,
 * - publishes throttled local movement,
 * - exposes a low-frequency roster + connection status for the HUD.
 */
export function useOfficeRealtime(
  gameRef: React.MutableRefObject<OfficeGame | null>,
  currentArea: AreaId | null,
): OfficeRealtimeState {
  const user = useCurrentUser();
  const [status, setStatus] = useState<RealtimeStatus>("connecting");
  const [roster, setRoster] = useState<RosterEntry[]>([]);
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
      status: "online",
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

    if (process.env.NODE_ENV !== "production") {
      window.__officeRealtime = {
        roster: () => manager.roster(),
        stats: () => manager.stats(),
        remotes: () => manager.sample(0),
        channels: () => getSupabaseClient().getChannels().map((c) => c.topic),
      };
    }

    return () => {
      window.clearInterval(bind);
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

  if (!enabled) return DISABLED;
  return {
    enabled,
    status,
    roster,
    onlineCount: roster.length,
    statsSource:
      process.env.NODE_ENV !== "production" && managerRef.current
        ? () => managerRef.current!.stats()
        : null,
  };
}
