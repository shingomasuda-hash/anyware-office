"use client";

import type { DemoRole } from "@/types/office";

const ROLES: DemoRole[] = ["guest", "member", "admin"];

/**
 * Development-only role simulator for checking role-based UI.
 * This is NOT authentication — real roles come from Supabase in STEP 2.5.
 */
export default function DemoRoleSwitcher({
  role,
  onChange,
}: {
  role: DemoRole;
  onChange: (role: DemoRole) => void;
}) {
  if (process.env.NODE_ENV === "production") return null;

  return (
    <div
      data-testid="demo-role"
      className="absolute left-2 top-20 z-20 rounded-lg border border-amber-300/70 bg-amber-50/90 p-1.5 shadow-sm backdrop-blur dark:border-amber-700/70 dark:bg-amber-950/90 md:left-3 md:top-3"
    >
      <p className="px-1 text-[8px] font-bold tracking-[0.2em] text-amber-700 dark:text-amber-400">
        DEMO ROLE (DEV)
      </p>
      <div className="mt-1 flex gap-1">
        {ROLES.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => onChange(r)}
            aria-pressed={role === r}
            className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider transition-colors ${
              role === r
                ? "bg-amber-600 text-white"
                : "text-amber-700 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-900"
            }`}
          >
            {r}
          </button>
        ))}
      </div>
    </div>
  );
}
