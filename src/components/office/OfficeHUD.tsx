"use client";

import type { AreaId } from "@/types/office";
import { AREA_BY_ID } from "@/lib/game/map";

export default function OfficeHUD({
  area,
  variant = "default",
}: {
  area: AreaId | null;
  /** "lab" applies the 3D office-lab glass styling; default is untouched. */
  variant?: "default" | "lab";
}) {
  const label = area ? AREA_BY_ID[area].label : "OFFICE FLOOR";
  const subtitle = area ? AREA_BY_ID[area].subtitle : "EXPLORE THE AREAS";
  const accent = area ? AREA_BY_ID[area].accent : "#9ca3af";
  const lab = variant === "lab";

  return (
    <div
      data-testid="hud"
      className="pointer-events-none absolute left-1/2 top-3 z-20 -translate-x-1/2"
    >
      <div
        // Re-keying restarts the entrance animation on each area change.
        key={label}
        className={
          lab
            ? "animate-hud-in flex max-w-[60vw] flex-col items-center rounded-2xl border border-cyan-200/25 bg-[#0d1420]/70 px-4 py-2 shadow-[0_2px_14px_rgba(8,14,24,0.35)] backdrop-blur-md md:max-w-none md:px-6"
            : "animate-hud-in flex max-w-[60vw] flex-col items-center rounded-xl border border-zinc-200/70 bg-white/85 px-4 py-2 shadow-sm backdrop-blur dark:border-zinc-700/70 dark:bg-zinc-900/85 md:max-w-none md:px-6"
        }
      >
        <p
          className={`text-[9px] font-semibold tracking-[0.3em] ${
            lab ? "text-cyan-200/70" : "text-zinc-400"
          }`}
        >
          YOU ARE HERE
        </p>
        <p
          data-testid="hud-area"
          className="mt-0.5 text-base font-semibold tracking-wide md:text-lg"
          style={{ color: lab ? "#dcefff" : accent }}
        >
          {label}
        </p>
        <p
          className={`max-w-full truncate text-[9px] font-medium tracking-[0.18em] md:text-[10px] ${
            lab ? "text-slate-400" : "text-zinc-500"
          }`}
        >
          {subtitle}
        </p>
      </div>
    </div>
  );
}
