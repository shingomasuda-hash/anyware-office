"use client";

import { useEffect, useRef } from "react";
import type { AreaId } from "@/types/office";
import { OfficeGame, type AvatarPick } from "@/lib/game/engine";

export default function OfficeCanvas({
  gameRef,
  onAreaChange,
  onPick,
}: {
  gameRef: React.MutableRefObject<OfficeGame | null>;
  onAreaChange: (area: AreaId | null) => void;
  /** STEP 4: click/tap hit test result for avatars (null = floor). */
  onPick?: (pick: AvatarPick) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onPick) return;
    const canvas = canvasRef.current;
    const game = gameRef.current;
    if (!canvas || !game) return;
    const rect = canvas.getBoundingClientRect();
    onPick(game.pickAvatar(e.clientX - rect.left, e.clientY - rect.top));
  };

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
      aria-label="AnyWare OFFICE map. Move with WASD or arrow keys. Click an avatar to open their profile."
      className="block h-full w-full touch-none select-none"
      onClick={handleClick}
    />
  );
}
