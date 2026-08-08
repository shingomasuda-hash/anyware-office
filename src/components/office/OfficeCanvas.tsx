"use client";

import { useEffect, useRef } from "react";
import type { AreaId } from "@/types/office";
import { OfficeGame } from "@/lib/game/engine";

export default function OfficeCanvas({
  gameRef,
  onAreaChange,
}: {
  gameRef: React.MutableRefObject<OfficeGame | null>;
  onAreaChange: (area: AreaId | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const game = new OfficeGame();
    game.onAreaChange = onAreaChange;
    game.attach(canvas);
    gameRef.current = game;
    return () => {
      game.detach();
      gameRef.current = null;
    };
    // The game instance lives for the lifetime of the canvas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <canvas
      ref={canvasRef}
      data-testid="office-canvas"
      aria-label="AnyWare OFFICE map. Move with WASD or arrow keys."
      className="block h-full w-full touch-none select-none"
    />
  );
}
