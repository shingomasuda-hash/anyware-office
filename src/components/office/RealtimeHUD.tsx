"use client";

import { useState } from "react";
import type { OfficeRealtimeState } from "@/hooks/useOfficeRealtime";
import { AREA_BY_ID } from "@/lib/game/map";

const STATUS_LABEL = {
  live: "LIVE",
  connecting: "Connecting…",
  offline: "Offline",
} as const;

const STATUS_DOT = {
  live: "bg-emerald-500",
  connecting: "bg-amber-400 animate-pulse",
  offline: "bg-zinc-400",
} as const;

/**
 * Small realtime status + online-count chip in the office HUD (STEP 3).
 * Members/admins only — the hook returns enabled=false for guests, and
 * this renders nothing.
 */
export default function RealtimeHUD({
  realtime,
}: {
  realtime: OfficeRealtimeState;
}) {
  const [open, setOpen] = useState(false);
  if (!realtime.enabled) return null;

  return (
    <div className="absolute left-3 top-3 z-20 flex flex-col items-start gap-1.5">
      <div className="flex items-center gap-1.5">
        <span
          data-testid="realtime-status"
          className="flex items-center gap-1.5 rounded-full border border-zinc-200/70 bg-white/85 px-2.5 py-1 text-[10px] font-semibold tracking-[0.15em] text-zinc-600 shadow-sm backdrop-blur dark:border-zinc-700/70 dark:bg-zinc-900/85 dark:text-zinc-300"
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[realtime.status]}`}
            aria-hidden="true"
          />
          {STATUS_LABEL[realtime.status]}
        </span>
        <button
          type="button"
          data-testid="online-count"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="rounded-full border border-zinc-200/70 bg-white/85 px-2.5 py-1 text-[10px] font-semibold tracking-[0.15em] text-zinc-600 shadow-sm backdrop-blur transition-colors hover:bg-white dark:border-zinc-700/70 dark:bg-zinc-900/85 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          ONLINE {realtime.onlineCount}
        </button>
      </div>

      {open ? (
        <div
          data-testid="online-panel"
          className="w-56 rounded-xl border border-zinc-200/70 bg-white/95 p-2 shadow-lg backdrop-blur dark:border-zinc-700/70 dark:bg-zinc-900/95"
        >
          <p className="px-2 pb-1 pt-0.5 text-[9px] font-semibold tracking-[0.25em] text-zinc-400">
            IN OFFICE
          </p>
          <ul className="max-h-56 overflow-y-auto">
            {realtime.roster.map((entry) => (
              <li
                key={entry.userId}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5"
              >
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                    entry.status === "meeting" ? "bg-violet-500" : "bg-emerald-500"
                  }`}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium text-zinc-800 dark:text-zinc-100">
                    {entry.displayName}
                    {entry.isSelf ? (
                      <span className="ml-1 text-[9px] font-semibold tracking-wider text-zinc-400">
                        YOU
                      </span>
                    ) : null}
                  </span>
                  <span className="block truncate text-[10px] text-zinc-500">
                    {entry.department}
                  </span>
                </span>
                <span className="shrink-0 text-[9px] font-semibold tracking-wider text-zinc-400">
                  {entry.areaId ? AREA_BY_ID[entry.areaId].label : "FLOOR"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
