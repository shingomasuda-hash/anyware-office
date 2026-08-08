import type { AvatarState, FurnitureItem } from "@/types/office";
import { AREAS, DOORWAYS, FURNITURE, WALLS, WORLD } from "./map";

export interface Viewport {
  /** World-space offset of the top-left visible corner. */
  ox: number;
  oy: number;
  scale: number;
  /** CSS pixel size of the canvas. */
  w: number;
  h: number;
}

const COLORS = {
  outside: "#e8e8e5",
  floor: "#f6f6f3",
  corridor: "#efefeb",
  wall: "#2f3136",
  deskFill: "#e4e4df",
  deskStroke: "#b8b8b1",
  tableFill: "#ddd6c9",
  tableStroke: "#b3a88f",
  counterFill: "#d6d0c5",
  counterStroke: "#a89f8e",
  bedFill: "#dcebdd",
  bedStroke: "#95bf9d",
  rackFill: "#c9ccd2",
  rackStroke: "#9a9ea8",
  boardFill: "#3a3d44",
  plantPot: "#b9b3a5",
  plantLeaf: "#6da97a",
  label: "rgba(38, 41, 48, 0.30)",
} as const;

function drawFurniture(ctx: CanvasRenderingContext2D, item: FurnitureItem) {
  const { x, y, w, h } = item.rect;
  switch (item.kind) {
    case "plant": {
      const cx = x + w / 2;
      const cy = y + h / 2;
      ctx.fillStyle = COLORS.plantPot;
      ctx.fillRect(x + w * 0.2, y + h * 0.55, w * 0.6, h * 0.45);
      ctx.fillStyle = COLORS.plantLeaf;
      ctx.beginPath();
      ctx.arc(cx, cy - h * 0.1, w * 0.42, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    case "board":
      ctx.fillStyle = COLORS.boardFill;
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = "#7fd0a8";
      ctx.fillRect(x + 6, y + 6, w - 12, 4);
      ctx.fillRect(x + 6, y + h - 8, w * 0.5, 3);
      return;
    default: {
      const palette = {
        desk: [COLORS.deskFill, COLORS.deskStroke],
        table: [COLORS.tableFill, COLORS.tableStroke],
        counter: [COLORS.counterFill, COLORS.counterStroke],
        bed: [COLORS.bedFill, COLORS.bedStroke],
        rack: [COLORS.rackFill, COLORS.rackStroke],
      } as const;
      const [fill, stroke] = palette[item.kind];
      ctx.fillStyle = fill;
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 5);
      ctx.fill();
      ctx.stroke();
      if (item.label) {
        ctx.fillStyle = "rgba(50, 50, 55, 0.55)";
        ctx.font = "600 18px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(item.label, x + w / 2, y + h / 2);
      }
    }
  }
}

function drawAvatar(ctx: CanvasRenderingContext2D, avatar: AvatarState) {
  const { x, y, direction } = avatar;

  // Shadow
  ctx.fillStyle = "rgba(0, 0, 0, 0.15)";
  ctx.beginPath();
  ctx.ellipse(x, y + 12, 11, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body
  ctx.fillStyle = "#2b2d33";
  ctx.beginPath();
  ctx.roundRect(x - 9, y - 4, 18, 16, 6);
  ctx.fill();

  // Head
  ctx.fillStyle = "#4a4d55";
  ctx.beginPath();
  ctx.arc(x, y - 10, 7.5, 0, Math.PI * 2);
  ctx.fill();

  // Face — eyes indicate facing direction (none when facing away)
  ctx.fillStyle = "#f5f5f2";
  const eye = (ex: number, ey: number) => {
    ctx.beginPath();
    ctx.arc(ex, ey, 1.6, 0, Math.PI * 2);
    ctx.fill();
  };
  if (direction === "down") {
    eye(x - 3, y - 10);
    eye(x + 3, y - 10);
  } else if (direction === "left") {
    eye(x - 4.5, y - 10);
  } else if (direction === "right") {
    eye(x + 4.5, y - 10);
  }
  // Facing up: back of the head, no eyes.
}

export function drawScene(
  ctx: CanvasRenderingContext2D,
  view: Viewport,
  avatar: AvatarState,
) {
  ctx.save();
  ctx.fillStyle = COLORS.outside;
  ctx.fillRect(0, 0, view.w, view.h);

  ctx.scale(view.scale, view.scale);
  ctx.translate(-view.ox, -view.oy);

  // Corridor / base floor
  ctx.fillStyle = COLORS.corridor;
  ctx.fillRect(0, 0, WORLD.w, WORLD.h);

  // Room floors, lightly tinted per area
  for (const area of AREAS) {
    const b = area.bounds;
    ctx.fillStyle = COLORS.floor;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = `${area.accent}12`; // ~7% alpha hex suffix
    ctx.fillRect(b.x, b.y, b.w, b.h);
  }

  // Doorway thresholds
  for (const d of DOORWAYS) {
    ctx.fillStyle = `${d.accent}55`;
    ctx.fillRect(d.rect.x, d.rect.y + d.rect.h - 4, d.rect.w, 4);
  }

  // Walls
  ctx.fillStyle = COLORS.wall;
  for (const wall of WALLS) {
    ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
  }

  // Furniture
  for (const item of FURNITURE) {
    drawFurniture(ctx, item);
  }

  // Area labels (drawn above furniture, low-contrast)
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const area of AREAS) {
    const b = area.bounds;
    ctx.fillStyle = COLORS.label;
    ctx.font = "700 30px system-ui, sans-serif";
    ctx.fillText(area.label, b.x + b.w / 2, b.y + b.h / 2 + 60);
  }

  drawAvatar(ctx, avatar);
  ctx.restore();
}
