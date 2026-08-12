"use client";

import { useEffect, useState } from "react";
import type { AreaId } from "@/types/office";
import type { OfficeGame } from "@/lib/game/engine";
import { AREAS, WORLD } from "@/lib/game/map";
import {
  BUILDINGS,
  CAMPUS_RADIUS,
  canonicalToCampus,
  PLAZA_CENTER,
} from "@/components/office3d/world/campus";

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

interface Dot {
  id: string;
  x: number;
  y: number;
}

export default function MiniMap({
  gameRef,
  currentArea,
  variant = "default",
}: {
  gameRef: React.MutableRefObject<OfficeGame | null>;
  currentArea: AreaId | null;
  /**
   * "lab" applies the 3D office-lab glass styling; "campus" additionally
   * redraws the plan as the FUTURE CAMPUS — plaza, ten building
   * footprints and everyone's position in campus space. The 2D office
   * default is untouched.
   */
  variant?: "default" | "lab" | "campus";
}) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [remotes, setRemotes] = useState<Dot[]>([]);
  const lab = variant !== "default";
  const campus = variant === "campus";

  useEffect(() => {
    // Low-frequency polling keeps the dot fresh without per-frame renders.
    const id = window.setInterval(() => {
      const game = gameRef.current;
      const snap = game?.getSnapshot();
      if (snap) setPos({ x: snap.x, y: snap.y });
      const src = (
        game as {
          remoteSource?:
            | ((dt: number) => Array<{ userId: string; x: number; y: number }>)
            | null;
        } | null
      )?.remoteSource;
      setRemotes(src ? src(0).map((r) => ({ id: r.userId, x: r.x, y: r.y })) : []);
    }, 120);
    return () => window.clearInterval(id);
  }, [gameRef]);

  if (campus) {
    const c = canonicalToCampus(PLAZA_CENTER.x, PLAZA_CENTER.y);
    const R = CAMPUS_RADIUS * 1.12;
    const me = canonicalToCampus(pos.x, pos.y);
    return (
      <div
        data-testid="minimap"
        aria-hidden="true"
        className="pointer-events-none absolute right-2 top-2 z-20 w-24 overflow-hidden rounded-xl border border-cyan-200/25 bg-[#0d1420]/70 p-1 shadow-[0_2px_14px_rgba(8,14,24,0.35)] backdrop-blur-md md:right-3 md:top-3 md:w-44"
      >
        <svg
          viewBox={`${c.x - R} ${c.y - R} ${R * 2} ${R * 2}`}
          className="block h-auto w-full"
        >
          <circle cx={c.x} cy={c.y} r={R} fill="#101827" />
          {/* Central Plaza */}
          <circle cx={c.x} cy={c.y} r={R * 0.3} fill="#1b2a40" stroke="#33507a" strokeWidth={10} />
          {BUILDINGS.map((b) => (
            <g key={b.id} transform={`rotate(${(b.phi * 180) / Math.PI} ${b.center.x} ${b.center.y})`}>
              <rect
                x={b.center.x - b.size.w / 2}
                y={b.center.y - b.size.h / 2}
                width={b.size.w}
                height={b.size.h}
                fill={b.accent}
                fillOpacity={currentArea === b.id ? 0.72 : 0.2}
                stroke={currentArea === b.id ? "#7adcff" : "#3d5a80"}
                strokeWidth={currentArea === b.id ? 26 : 8}
                rx={14}
              />
            </g>
          ))}
          {BUILDINGS.map((b) => (
            <text
              key={b.id}
              x={b.center.x}
              y={b.center.y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={96}
              fontWeight={700}
              fill="#c8d8ec"
              opacity={0.8}
            >
              {SHORT_LABELS[b.id]}
            </text>
          ))}
          {remotes.map((r) => {
            const p = canonicalToCampus(r.x, r.y);
            return (
              <circle key={r.id} cx={p.x} cy={p.y} r={34} fill="#f0b45f" stroke="#0d1420" strokeWidth={10} />
            );
          })}
          <circle cx={me.x} cy={me.y} r={40} fill="#5fd0ff" stroke="#0d1420" strokeWidth={12} />
        </svg>
      </div>
    );
  }

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
