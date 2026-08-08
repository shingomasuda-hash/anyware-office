import type { Position, Rect } from "@/types/office";

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function boxAt(x: number, y: number, size: number): Rect {
  return { x: x - size / 2, y: y - size / 2, w: size, h: size };
}

/** Whether an avatar of `size` can stand with its center at (x, y). */
export function canStand(
  x: number,
  y: number,
  size: number,
  solids: Rect[],
): boolean {
  const box = boxAt(x, y, size);
  for (const s of solids) {
    if (rectsOverlap(box, s)) return false;
  }
  return true;
}

const MAX_SUBSTEP = 8;

/**
 * Move with axis-separated collision resolution (wall sliding).
 * Large deltas are split into substeps so fast frames cannot tunnel
 * through thin walls.
 */
export function moveWithCollision(
  pos: Position,
  dx: number,
  dy: number,
  size: number,
  solids: Rect[],
): Position {
  const distance = Math.max(Math.abs(dx), Math.abs(dy));
  const steps = Math.max(1, Math.ceil(distance / MAX_SUBSTEP));
  let { x, y } = pos;
  const stepX = dx / steps;
  const stepY = dy / steps;
  for (let i = 0; i < steps; i++) {
    if (stepX !== 0 && canStand(x + stepX, y, size, solids)) x += stepX;
    if (stepY !== 0 && canStand(x, y + stepY, size, solids)) y += stepY;
  }
  return { x, y };
}
