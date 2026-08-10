"use client";

import { useEffect, useRef, useState } from "react";
import {
  STATUS_COLORS,
  STATUS_LABELS,
  initials,
  personalColor,
} from "@/lib/identity/identity";
import type { RosterEntry } from "@/lib/realtime/types";
import { AREA_BY_ID } from "@/lib/game/map";
import {
  getRepositories,
  repositoryErrorMessage,
  type Profile,
} from "@/lib/repositories";

// STEP 4 Profile Card — opened by clicking an avatar on the canvas or a
// person in the People panel. Live fields (status / area) come from the
// presence roster; bio / schedule are fetched RLS-scoped on open.

export default function ProfileCard({
  userId,
  isSelf,
  roster,
  onClose,
  onEditProfile,
}: {
  userId: string;
  isSelf: boolean;
  roster: RosterEntry[];
  onClose: () => void;
  onEditProfile?: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const live = roster.find((r) => r.userId === userId) ?? null;

  useEffect(() => {
    closeRef.current?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getRepositories()
      .profiles.get(userId)
      .then((p) => {
        if (!cancelled) setProfile(p);
      })
      .catch((e) => {
        if (!cancelled) setError(repositoryErrorMessage(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const name = live?.displayName ?? profile?.name ?? "Member";
  const department = live?.department ?? profile?.department ?? "";
  const position = live?.position ?? profile?.position ?? "";
  const avatarUrl = live?.avatarUrl ?? profile?.avatar_url ?? null;
  const color = personalColor(userId);
  const status = live?.status ?? null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/20 animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-label={`Profile: ${name}`}
        data-testid="profile-card"
        className="absolute bg-white text-zinc-900 shadow-2xl dark:bg-zinc-900 dark:text-zinc-100 max-md:inset-x-0 max-md:bottom-0 max-md:rounded-t-2xl max-md:animate-sheet-up md:left-1/2 md:top-1/2 md:w-[360px] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl md:animate-fade-in"
      >
        <div
          className="h-1.5 shrink-0 max-md:rounded-t-2xl md:rounded-t-2xl"
          style={{ background: color }}
        />
        <div className="flex items-start justify-between gap-3 px-5 pt-4">
          <div className="flex items-center gap-3">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt=""
                className="h-12 w-12 rounded-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : (
              <span
                aria-hidden="true"
                className="flex h-12 w-12 items-center justify-center rounded-full text-base font-bold text-white"
                style={{ background: color }}
              >
                {initials(name)}
              </span>
            )}
            <div>
              <p className="text-base font-semibold tracking-tight">
                {name}
                {isSelf ? (
                  <span className="ml-1.5 text-[10px] font-semibold tracking-wider text-zinc-400">
                    YOU
                  </span>
                ) : null}
              </p>
              <p className="mt-0.5 text-[11px] font-medium tracking-wide text-zinc-500">
                {[department, position].filter(Boolean).join(" · ")}
              </p>
            </div>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close profile card"
            data-testid="profile-card-close"
            className="rounded-md p-2 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus:outline-2 focus:outline-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
              <path
                d="M3 3l10 10M13 3L3 13"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="space-y-3 px-5 py-4">
          {status ? (
            <div className="flex items-center gap-2 text-xs">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: STATUS_COLORS[status] }}
                aria-hidden="true"
              />
              <span className="font-medium">{STATUS_LABELS[status]}</span>
              <span className="text-zinc-400">
                {live?.areaId ? `· ${AREA_BY_ID[live.areaId].label}` : "· FLOOR"}
              </span>
            </div>
          ) : (
            <p className="text-xs text-zinc-400">Not in the office right now</p>
          )}

          {loading ? (
            <p className="text-xs text-zinc-400">Loading profile…</p>
          ) : error ? (
            <p className="text-xs text-red-600">{error}</p>
          ) : (
            <>
              {profile?.bio ? (
                <div>
                  <p className="text-[10px] font-semibold tracking-[0.2em] text-zinc-400">
                    BIO
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-zinc-600 dark:text-zinc-300">
                    {profile.bio}
                  </p>
                </div>
              ) : null}
              {profile?.today_schedule ? (
                <div>
                  <p className="text-[10px] font-semibold tracking-[0.2em] text-zinc-400">
                    TODAY
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-zinc-600 dark:text-zinc-300">
                    {profile.today_schedule}
                  </p>
                </div>
              ) : null}
            </>
          )}
        </div>

        {isSelf && onEditProfile ? (
          <div className="border-t border-zinc-200 px-5 py-3 dark:border-zinc-800">
            <button
              type="button"
              onClick={onEditProfile}
              data-testid="profile-card-edit"
              className="w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              Edit my profile
            </button>
          </div>
        ) : (
          <div className="pb-2" />
        )}
      </section>
    </div>
  );
}
