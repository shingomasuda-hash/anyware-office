import {
  STATUS_COLORS,
  buildIdentity,
  type AvatarIdentity,
} from "@/lib/identity/identity";
import type { RemoteAvatarRender } from "@/lib/realtime/types";
import type { AvatarState, FurnitureItem } from "@/types/office";
import { getAvatarImage } from "./avatarImages";
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

function shade(hex: string, factor: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(v * factor)));
  const r = ch((n >> 16) & 255);
  const g = ch((n >> 8) & 255);
  const b = ch(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

/**
 * STEP 4: identity-aware avatar body shared by local and remote.
 * Personal color body, avatar photo (or darker head + initials chip),
 * status ring around the head.
 */
function drawIdentityAvatar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  direction: AvatarState["direction"],
  identity: AvatarIdentity | null,
  emphasized: boolean,
) {
  const bodyColor = identity ? identity.color : "#2b2d33";
  const headColor = identity ? shade(identity.color, 1.25) : "#4a4d55";

  // Shadow
  ctx.fillStyle = `rgba(0, 0, 0, ${emphasized ? 0.15 : 0.1})`;
  ctx.beginPath();
  ctx.ellipse(x, y + 12, 11, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body
  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.roundRect(x - 9, y - 4, 18, 16, 6);
  ctx.fill();

  // Status ring around the head
  if (identity) {
    ctx.strokeStyle = STATUS_COLORS[identity.status];
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y - 10, 9.5, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Head: avatar photo when loaded, else colored head (+ eyes).
  const img = identity ? getAvatarImage(identity.avatarUrl) : null;
  if (img) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y - 10, 7.5, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, x - 7.5, y - 17.5, 15, 15);
    ctx.restore();
  } else {
    ctx.fillStyle = headColor;
    ctx.beginPath();
    ctx.arc(x, y - 10, 7.5, 0, Math.PI * 2);
    ctx.fill();
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

  // Initials chip on the chest — identity even without a photo.
  if (identity && !img) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
    ctx.font = "700 7px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(identity.initials, x, y + 4, 16);
  }
}

function drawAvatar(
  ctx: CanvasRenderingContext2D,
  avatar: AvatarState,
  identity: AvatarIdentity | null,
) {
  drawIdentityAvatar(ctx, avatar.x, avatar.y, avatar.direction, identity, true);
}

/**
 * Remote avatars (STEP 3): same silhouette in a lighter tone so the
 * local player stays visually primary, plus a compact name/department
 * tag and a status dot. Kept deliberately quiet to preserve the clean,
 * neutral look.
 */
function drawRemoteAvatar(
  ctx: CanvasRenderingContext2D,
  remote: RemoteAvatarRender,
) {
  const { x, y, direction } = remote;
  const identity = buildIdentity({
    userId: remote.userId,
    displayName: remote.displayName,
    department: remote.department,
    avatarUrl: remote.avatarUrl,
    status: remote.status,
  });
  drawIdentityAvatar(ctx, x, y, direction, identity, false);

  // Name tag: NAME · DEPARTMENT with a status dot, in a soft pill.
  const name = remote.displayName || "MEMBER";
  const dept = remote.department ? ` · ${remote.department}` : "";
  ctx.font = "600 11px system-ui, sans-serif";
  const nameW = ctx.measureText(name).width;
  ctx.font = "500 9px system-ui, sans-serif";
  const deptW = dept ? ctx.measureText(dept).width : 0;
  const dotSpace = 10;
  const pillW = Math.min(nameW + deptW + dotSpace + 14, 190);
  const pillH = 16;
  const px = x - pillW / 2;
  const py = y - 34;

  ctx.fillStyle = "rgba(255, 255, 255, 0.88)";
  ctx.beginPath();
  ctx.roundRect(px, py, pillW, pillH, 8);
  ctx.fill();
  ctx.strokeStyle = "rgba(47, 49, 54, 0.12)";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = STATUS_COLORS[remote.status];
  ctx.beginPath();
  ctx.arc(px + 8, py + pillH / 2, 2.6, 0, Math.PI * 2);
  ctx.fill();

  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#2f3136";
  ctx.font = "600 11px system-ui, sans-serif";
  ctx.fillText(name, px + 13, py + pillH / 2, 120);
  if (dept) {
    ctx.fillStyle = "rgba(47, 49, 54, 0.55)";
    ctx.font = "500 9px system-ui, sans-serif";
    ctx.fillText(dept, px + 13 + Math.min(nameW, 120), py + pillH / 2, 60);
  }
}

export function drawScene(
  ctx: CanvasRenderingContext2D,
  view: Viewport,
  avatar: AvatarState,
  remotes: RemoteAvatarRender[] | null = null,
  localIdentity: AvatarIdentity | null = null,
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

  if (remotes) {
    for (const remote of remotes) {
      drawRemoteAvatar(ctx, remote);
    }
  }
  drawAvatar(ctx, avatar, localIdentity); // local player draws on top
  ctx.restore();
}
