"use client";

import type { AreaId } from "@/types/office";
import { AREA_BY_ID } from "@/lib/game/map";

export default function InteractionPrompt({
  area,
  mobile,
  onOpen,
  variant = "default",
}: {
  area: AreaId;
  mobile: boolean;
  onOpen: () => void;
  /** "lab" applies the 3D office-lab glass styling; default untouched. */
  variant?: "default" | "lab";
}) {
  const label = AREA_BY_ID[area].label;
  const lab = variant === "lab";

  if (mobile) {
    return (
      <button
        type="button"
        data-testid="view-button"
        onClick={onOpen}
        aria-label={`View ${label} panel`}
        className={
          lab
            ? "absolute bottom-8 right-5 z-20 flex h-16 w-16 flex-col items-center justify-center rounded-full border border-cyan-300/40 bg-[#0d1420]/80 text-cyan-50 shadow-[0_2px_16px_rgba(8,14,24,0.45)] backdrop-blur-md transition-transform active:scale-95"
            : "absolute bottom-8 right-5 z-20 flex h-16 w-16 flex-col items-center justify-center rounded-full bg-zinc-900/90 text-white shadow-lg backdrop-blur transition-transform active:scale-95 dark:bg-zinc-100/90 dark:text-zinc-900"
        }
      >
        <span className="text-[10px] font-bold tracking-widest">VIEW</span>
        <span className="max-w-[3.4rem] truncate text-[8px] font-medium tracking-wider opacity-70">
          {label}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      data-testid="interaction-prompt"
      onClick={onOpen}
      className={
        lab
          ? "animate-hud-in absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2.5 rounded-full border border-cyan-300/30 bg-[#0d1420]/75 py-2 pl-2.5 pr-4 text-cyan-50 shadow-[0_2px_16px_rgba(8,14,24,0.45)] backdrop-blur-md transition-colors hover:bg-[#16233a]/85"
          : "animate-hud-in absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2.5 rounded-full border border-zinc-200/70 bg-white/90 py-2 pl-2.5 pr-4 shadow-md backdrop-blur transition-colors hover:bg-white dark:border-zinc-700/70 dark:bg-zinc-900/90 dark:hover:bg-zinc-900"
      }
    >
      <kbd
        className={
          lab
            ? "flex h-6 w-6 items-center justify-center rounded-md border border-cyan-300/40 bg-cyan-300/10 text-xs font-bold text-cyan-100"
            : "flex h-6 w-6 items-center justify-center rounded-md border border-zinc-300 bg-zinc-100 text-xs font-bold text-zinc-700 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
        }
      >
        E
      </kbd>
      <span className="text-sm font-medium tracking-wide">VIEW {label}</span>
    </button>
  );
}
