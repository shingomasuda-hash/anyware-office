"use client";

import { useEffect, useRef, useState } from "react";
import { useCurrentUser, useSessionRefresh } from "@/lib/auth/SessionProvider";
import { initials, personalColor } from "@/lib/identity/identity";
import { getRepositories, repositoryErrorMessage } from "@/lib/repositories";

// STEP 4 My Profile — self-service editing of the RLS-allowed columns
// (name / position / bio / today_schedule / avatar_url). Frozen columns
// (role / email / department …) are shown read-only and never submitted.

const FIELDS = [
  { name: "name", label: "NAME", type: "text", required: true },
  { name: "position", label: "POSITION", type: "text" },
  { name: "avatar_url", label: "AVATAR URL", type: "url" },
  { name: "bio", label: "BIO", type: "textarea" },
  { name: "today_schedule", label: "TODAY'S SCHEDULE", type: "textarea" },
] as const;

type FieldName = (typeof FIELDS)[number]["name"];

export default function ProfileEditor({ onClose }: { onClose: () => void }) {
  const user = useCurrentUser();
  const refresh = useSessionRefresh();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [values, setValues] = useState<Record<FieldName, string>>({
    name: user?.name ?? "",
    position: user?.position ?? "",
    avatar_url: user?.avatar_url ?? "",
    bio: user?.bio ?? "",
    today_schedule: user?.today_schedule ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  if (!user) return null;

  const save = async () => {
    if (values.name.trim() === "") {
      setError("Name is required");
      return;
    }
    const avatarUrl = values.avatar_url.trim();
    if (avatarUrl !== "" && !/^https?:\/\//i.test(avatarUrl)) {
      setError("Avatar URL must start with http(s)://");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await getRepositories().profiles.update(user.id, {
        name: values.name.trim(),
        position: values.position.trim(),
        avatar_url: avatarUrl === "" ? null : avatarUrl,
        bio: values.bio,
        today_schedule: values.today_schedule,
      });
      await refresh(); // updates SessionProvider → presence re-track
      onClose();
    } catch (e) {
      setError(repositoryErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const color = personalColor(user.id);

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/30 animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-label="My profile"
        data-testid="profile-editor"
        className="absolute flex flex-col bg-white text-zinc-900 shadow-2xl dark:bg-zinc-900 dark:text-zinc-100 max-md:inset-x-0 max-md:bottom-0 max-md:max-h-[85dvh] max-md:rounded-t-2xl max-md:animate-sheet-up md:right-0 md:top-0 md:h-full md:w-[420px] md:animate-drawer-in"
      >
        <div className="h-1.5 shrink-0" style={{ background: color }} />
        <header className="flex items-start justify-between gap-4 border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white"
              style={{ background: color }}
            >
              {initials(values.name || user.name)}
            </span>
            <div>
              <h2 className="text-xl font-semibold tracking-tight">
                My Profile
              </h2>
              <p className="mt-0.5 text-[11px] font-medium tracking-[0.15em] text-zinc-500">
                {user.department} · {user.role.toUpperCase()}
              </p>
            </div>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close profile editor"
            data-testid="profile-close"
            className="rounded-md p-2 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus:outline-2 focus:outline-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <path
                d="M3 3l10 10M13 3L3 13"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
          {FIELDS.map((f) => (
            <div key={f.name}>
              <label
                htmlFor={`profile-${f.name}`}
                className="mb-1 block text-[11px] font-semibold tracking-wider text-zinc-500"
              >
                {f.label}
              </label>
              {f.type === "textarea" ? (
                <textarea
                  id={`profile-${f.name}`}
                  rows={3}
                  value={values[f.name]}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, [f.name]: e.target.value }))
                  }
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
                />
              ) : (
                <input
                  id={`profile-${f.name}`}
                  type="text"
                  value={values[f.name]}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, [f.name]: e.target.value }))
                  }
                  data-testid={`profile-${f.name}`}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
                />
              )}
            </div>
          ))}
          <p className="text-[11px] leading-5 text-zinc-400">
            Department・roleは管理者のみ変更できます。
          </p>
          {error ? (
            <p
              role="alert"
              data-testid="profile-error"
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400"
            >
              {error}
            </p>
          ) : null}
        </div>

        <footer className="flex gap-2 border-t border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            data-testid="profile-save"
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
        </footer>
      </section>
    </div>
  );
}
