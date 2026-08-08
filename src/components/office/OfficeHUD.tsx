"use client";

import type { AreaId } from "@/types/office";
import { AREA_BY_ID } from "@/lib/game/map";

export default function OfficeHUD({ area }: { area: AreaId | null }) {
  const label = area ? AREA_BY_ID[area].label : "OFFICE FLOOR";
  const subtitle = area ? AREA_BY_ID[area].subtitle : "EXPLORE THE AREAS";
  const accent = area ? AREA_BY_ID[area].accent : "#9ca3af";

  return (
    <div
      data-testid="hud"
      className="pointer-events-none absolute left-1/2 top-3 z-20 -translate-x-1/2"
    >
      <div
        // Re-keying restarts the entrance animation on each area change.
        key={label}
        className="animate-hud-in flex max-w-[60vw] flex-col items-center rounded-xl border border-zinc-200/70 bg-white/85 px-4 py-2 shadow-sm backdrop-blur dark:border-zinc-700/70 dark:bg-zinc-900/85 md:max-w-none md:px-6"
      >
        <p className="text-[9px] font-semibold tracking-[0.3em] text-zinc-400">
          YOU ARE HERE
        </p>
        <p
          data-testid="hud-area"
          className="mt-0.5 text-base font-semibold tracking-wide md:text-lg"
          style={{ color: accent }}
        >
          {label}
        </p>
        <p className="max-w-full truncate text-[9px] font-medium tracking-[0.18em] text-zinc-500 md:text-[10px]">
          {subtitle}
        </p>
      </div>
    </div>
  );
}
