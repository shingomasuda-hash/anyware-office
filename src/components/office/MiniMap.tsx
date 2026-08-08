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
}: {
  gameRef: React.MutableRefObject<OfficeGame | null>;
  currentArea: AreaId | null;
}) {
  const [pos, setPos] = useState({ x: 0, y: 0 });

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
      className="pointer-events-none absolute right-2 top-2 z-20 w-24 overflow-hidden rounded-lg border border-zinc-200/70 bg-white/85 p-1 shadow-sm backdrop-blur dark:border-zinc-700/70 dark:bg-zinc-900/85 md:right-3 md:top-3 md:w-44"
    >
      <svg
        viewBox={`0 0 ${WORLD.w} ${WORLD.h}`}
        className="block h-auto w-full"
      >
        <rect width={WORLD.w} height={WORLD.h} fill="#ececea" rx={24} />
        {AREAS.map((a) => (
          <g key={a.id}>
            <rect
              x={a.bounds.x}
              y={a.bounds.y}
              width={a.bounds.w}
              height={a.bounds.h}
              fill={a.accent}
              fillOpacity={currentArea === a.id ? 0.55 : 0.22}
              stroke={currentArea === a.id ? a.accent : "#b9b9b4"}
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
              fill="#3b3e45"
              opacity={0.75}
            >
              {SHORT_LABELS[a.id]}
            </text>
          </g>
        ))}
        <circle cx={pos.x} cy={pos.y} r={30} fill="#e14343" stroke="#ffffff" strokeWidth={10} />
      </svg>
    </div>
  );
}
