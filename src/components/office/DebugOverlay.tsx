"use client";

import { useEffect, useState } from "react";
import type { GameSnapshot, OfficeGame } from "@/lib/game/engine";

/** Development-only state readout. Also useful for STEP 3 realtime checks. */
export default function DebugOverlay({
  gameRef,
}: {
  gameRef: React.MutableRefObject<OfficeGame | null>;
}) {
  const [snap, setSnap] = useState<GameSnapshot | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => {
      const s = gameRef.current?.getSnapshot();
      if (s) setSnap(s);
    }, 100);
    return () => window.clearInterval(id);
  }, [gameRef]);

  if (process.env.NODE_ENV === "production" || !snap) return null;

  return (
    <div className="pointer-events-none absolute left-2 top-40 z-20 rounded-md bg-black/60 px-2.5 py-1.5 font-mono text-[10px] leading-4 text-green-300 md:left-3 md:top-24">
      <p>x: {snap.x}</p>
      <p>y: {snap.y}</p>
      <p>area: {snap.area ?? "—"}</p>
      <p>direction: {snap.direction}</p>
      <p>moving: {String(snap.moving)}</p>
    </div>
  );
}
