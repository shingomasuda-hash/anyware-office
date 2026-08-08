"use client";

import type { DataSource } from "@/lib/repositories";

/** Development-only indicator showing which data source feeds the office. */
export default function DataSourceBadge({ source }: { source: DataSource }) {
  if (process.env.NODE_ENV === "production") return null;

  const demo = source === "DEMO";
  return (
    <div
      data-testid="data-source"
      className={`pointer-events-none absolute bottom-2 right-2 z-20 rounded px-2 py-1 text-[9px] font-bold tracking-[0.2em] ${
        demo
          ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
          : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
      }`}
    >
      {demo ? "DEMO DATA" : "SUPABASE"}
    </div>
  );
}
