"use client";

import { useMemo, useState } from "react";
import type { OfficeRealtimeState } from "@/hooks/useOfficeRealtime";
import { useOfficeDataContext } from "@/hooks/useOfficeData";
import {
  MANUAL_STATUSES,
  STATUS_COLORS,
  STATUS_LABELS,
  initials,
  personalColor,
} from "@/lib/identity/identity";
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

function PersonAvatar({
  userId,
  name,
  avatarUrl,
}: {
  userId: string;
  name: string;
  avatarUrl: string | null;
}) {
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={avatarUrl} alt="" className="h-7 w-7 shrink-0 rounded-full object-cover" />
    );
  }
  return (
    <span
      aria-hidden="true"
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
      style={{ background: personalColor(userId) }}
    >
      {initials(name)}
    </span>
  );
}

/**
 * Realtime status + People panel + status switcher (STEP 3 → STEP 4).
 * Members/admins only — the hook returns enabled=false for guests, and
 * this renders nothing.
 */
export default function RealtimeHUD({
  realtime,
  onSelectPerson,
  onOpenProfile,
  variant = "default",
}: {
  realtime: OfficeRealtimeState;
  onSelectPerson: (userId: string, isSelf: boolean) => void;
  onOpenProfile: () => void;
  /** "lab" applies the 3D office-lab glass styling; default is untouched. */
  variant?: "default" | "lab";
}) {
  const [peopleOpen, setPeopleOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [query, setQuery] = useState("");
  const dataState = useOfficeDataContext();

  const onlineIds = useMemo(
    () => new Set(realtime.roster.map((r) => r.userId)),
    [realtime.roster],
  );

  const q = query.trim().toLowerCase();
  const matches = (...fields: Array<string | null | undefined>) =>
    q === "" || fields.some((f) => f?.toLowerCase().includes(q));

  const onlineList = realtime.roster.filter((r) =>
    matches(r.displayName, r.department, r.position),
  );
  const directory =
    dataState.status === "ready"
      ? dataState.data.staff.filter(
          (p) =>
            p.is_public &&
            !onlineIds.has(p.id) &&
            matches(p.name, p.department, p.position),
        )
      : [];

  if (!realtime.enabled) return null;

  const lab = variant === "lab";
  const chip = lab
    ? "border-cyan-200/25 bg-[#0d1420]/70 text-cyan-50/90 shadow-[0_2px_10px_rgba(8,14,24,0.35)] backdrop-blur-md"
    : "border-zinc-200/70 bg-white/85 text-zinc-600 shadow-sm backdrop-blur dark:border-zinc-700/70 dark:bg-zinc-900/85 dark:text-zinc-300";
  const chipHover = lab
    ? "transition-colors hover:bg-[#16233a]/80"
    : "transition-colors hover:bg-white dark:hover:bg-zinc-900";
  const panel = lab
    ? "rounded-2xl border border-white/50 bg-white/80 shadow-xl backdrop-blur-xl"
    : "rounded-xl border border-zinc-200/70 bg-white/95 shadow-lg backdrop-blur dark:border-zinc-700/70 dark:bg-zinc-900/95";

  return (
    <div className="absolute left-3 top-3 z-20 flex flex-col items-start gap-1.5">
      <div className="flex items-center gap-1.5">
        <span
          data-testid="realtime-status"
          className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-[0.15em] ${chip}`}
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
          onClick={() => {
            setPeopleOpen((v) => !v);
            setStatusOpen(false);
          }}
          aria-expanded={peopleOpen}
          className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-[0.15em] ${chip} ${chipHover}`}
        >
          ONLINE {realtime.onlineCount}
        </button>
        <div className="relative">
          <button
            type="button"
            data-testid="status-switcher"
            onClick={() => {
              setStatusOpen((v) => !v);
              setPeopleOpen(false);
            }}
            aria-expanded={statusOpen}
            aria-haspopup="menu"
            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-[0.15em] ${chip} ${chipHover}`}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: STATUS_COLORS[realtime.myStatus] }}
              aria-hidden="true"
            />
            {STATUS_LABELS[realtime.myStatus].toUpperCase()}
          </button>
          {statusOpen ? (
            <div
              role="menu"
              data-testid="status-menu"
              className={`absolute left-0 top-8 w-40 p-1 ${panel}`}
            >
              {MANUAL_STATUSES.map((s) => (
                <button
                  key={s}
                  role="menuitemradio"
                  aria-checked={realtime.manualStatus === s}
                  type="button"
                  data-testid={`status-${s}`}
                  onClick={() => {
                    realtime.setManualStatus(s);
                    setStatusOpen(false);
                  }}
                  className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                    realtime.manualStatus === s ? "font-semibold" : ""
                  }`}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: STATUS_COLORS[s] }}
                    aria-hidden="true"
                  />
                  {STATUS_LABELS[s]}
                </button>
              ))}
              <div className="my-1 border-t border-zinc-200 dark:border-zinc-800" />
              <button
                type="button"
                data-testid="open-profile"
                onClick={() => {
                  setStatusOpen(false);
                  onOpenProfile();
                }}
                className="w-full rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                My Profile…
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {peopleOpen ? (
        <div
          data-testid="online-panel"
          className={`w-64 p-2 ${panel}`}
        >
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people…"
            aria-label="Search people"
            data-testid="people-search"
            className="mb-1 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900"
          />
          <p className="px-2 pb-1 pt-1 text-[9px] font-semibold tracking-[0.25em] text-zinc-400">
            IN OFFICE
          </p>
          <ul className="max-h-44 overflow-y-auto">
            {onlineList.length === 0 ? (
              <li className="px-2 py-1.5 text-xs text-zinc-400">No matches</li>
            ) : (
              onlineList.map((entry) => (
                <li key={entry.userId}>
                  <button
                    type="button"
                    onClick={() => onSelectPerson(entry.userId, entry.isSelf)}
                    data-testid={`person-${entry.isSelf ? "self" : "online"}`}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    <PersonAvatar
                      userId={entry.userId}
                      name={entry.displayName}
                      avatarUrl={entry.avatarUrl}
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
                    <span className="flex shrink-0 flex-col items-end gap-0.5">
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ background: STATUS_COLORS[entry.status] }}
                        aria-hidden="true"
                        title={STATUS_LABELS[entry.status]}
                      />
                      <span className="text-[9px] font-semibold tracking-wider text-zinc-400">
                        {entry.areaId ? AREA_BY_ID[entry.areaId].label : "FLOOR"}
                      </span>
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>

          {directory.length > 0 ? (
            <>
              <p className="px-2 pb-1 pt-2 text-[9px] font-semibold tracking-[0.25em] text-zinc-400">
                NOT IN OFFICE
              </p>
              <ul className="max-h-32 overflow-y-auto">
                {directory.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => onSelectPerson(p.id, false)}
                      data-testid="person-directory"
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left opacity-70 transition-colors hover:bg-zinc-100 hover:opacity-100 dark:hover:bg-zinc-800"
                    >
                      <PersonAvatar
                        userId={p.id}
                        name={p.name}
                        avatarUrl={p.avatar_url}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-medium text-zinc-800 dark:text-zinc-100">
                          {p.name}
                        </span>
                        <span className="block truncate text-[10px] text-zinc-500">
                          {p.department}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
