"use client";

import { useEffect, useState } from "react";
import type { AreaId } from "@/types/office";
import type { OfficeGame } from "@/lib/game/engine";
import { AREAS, WORLD } from "@/lib/game/map";

const SHORT_LABELS: Record<AreaId, string> = {
  ENTRANCE: "EN",
  STAFF: "ST",
  SIGNAL: "SI",
  PARTNER: "PA",
  TABLE: "TA",
  GREEN: "GR",
  LOCAL: "LO",
  MEETING: "ME",
  AI: "AI",
  ADMIN: "AD",
};

export default function MiniMap({
  gameRef,
  currentArea,
  variant = "default",
}: {
  gameRef: React.MutableRefObject<OfficeGame | null>;
  currentArea: AreaId | null;
  /** "lab" applies the 3D office-lab glass styling; default is untouched. */
  variant?: "default" | "lab";
}) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const lab = variant === "lab";

  useEffect(() => {
    // Low-frequency polling keeps the dot fresh without per-frame renders.
    const id = window.setInterval(() => {
      const snap = gameRef.current?.getSnapshot();
      if (snap) setPos({ x: snap.x, y: snap.y });
    }, 120);
    return () => window.clearInterval(id);
  }, [gameRef]);

  return (
    <div
      data-testid="minimap"
      aria-hidden="true"
      className={
        lab
          ? "pointer-events-none absolute right-2 top-2 z-20 w-24 overflow-hidden rounded-xl border border-cyan-200/25 bg-[#0d1420]/70 p-1 shadow-[0_2px_14px_rgba(8,14,24,0.35)] backdrop-blur-md md:right-3 md:top-3 md:w-44"
          : "pointer-events-none absolute right-2 top-2 z-20 w-24 overflow-hidden rounded-lg border border-zinc-200/70 bg-white/85 p-1 shadow-sm backdrop-blur dark:border-zinc-700/70 dark:bg-zinc-900/85 md:right-3 md:top-3 md:w-44"
      }
    >
      <svg
        viewBox={`0 0 ${WORLD.w} ${WORLD.h}`}
        className="block h-auto w-full"
      >
        <rect
          width={WORLD.w}
          height={WORLD.h}
          fill={lab ? "#101827" : "#ececea"}
          rx={24}
        />
        {AREAS.map((a) => (
          <g key={a.id}>
            <rect
              x={a.bounds.x}
              y={a.bounds.y}
              width={a.bounds.w}
              height={a.bounds.h}
              fill={a.accent}
              fillOpacity={currentArea === a.id ? (lab ? 0.6 : 0.55) : lab ? 0.16 : 0.22}
              stroke={currentArea === a.id ? (lab ? "#7adcff" : a.accent) : lab ? "#33445e" : "#b9b9b4"}
              strokeWidth={currentArea === a.id ? 14 : 5}
              rx={12}
            />
            <text
              x={a.bounds.x + a.bounds.w / 2}
              y={a.bounds.y + a.bounds.h / 2}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={72}
              fontWeight={700}
              fill={lab ? "#c8d8ec" : "#3b3e45"}
              opacity={0.75}
            >
              {SHORT_LABELS[a.id]}
            </text>
          </g>
        ))}
        <circle
          cx={pos.x}
          cy={pos.y}
          r={30}
          fill={lab ? "#5fd0ff" : "#e14343"}
          stroke={lab ? "#0d1420" : "#ffffff"}
          strokeWidth={10}
        />
      </svg>
    </div>
  );
}
