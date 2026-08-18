import * as THREE from "three";
import type { BoardMeeting, BoardProject } from "./boardTypes";
import { fillGradient, label, makeScreen } from "./lux";

/**
 * LIVE BOARDS — wall surfaces that show real office data.
 *
 * The screens in these rooms were mock-ups. These build the same
 * surfaces from what is actually in the database, so a meeting on the
 * wall of the conference pavilion is the meeting you are about to have.
 *
 * The shapes themselves live in ./boardTypes, which carries no
 * dependency on three.js — a texture builder should not need a
 * database client, and the shell should not need a renderer.
 */

export { EMPTY_BOARD } from "./boardTypes";
export type { BoardData, BoardMeeting, BoardProject } from "./boardTypes";

const time = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "--:--"
    : `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

const STATUS_TINT: Record<string, string> = {
  in_progress: "#4fc0a0",
  scheduled: "#8e6cc0",
  reserved: "#8e6cc0",
  done: "#7c8b98",
  cancelled: "#c07a7a",
};

/** The conference pavilion's wall: today's meetings, as they stand. */
export function makeMeetingBoard(meetings: BoardMeeting[]): THREE.MeshBasicMaterial {
  return makeScreen(
    (ctx, w, h) => {
      fillGradient(ctx, w, h, "#f7f9fb", "#e6ebf0");
      ctx.fillStyle = "#8e6cc0";
      ctx.fillRect(64, 58, 6, 74);
      label(ctx, "TODAY'S MEETINGS", 92, 56, 46, "#1e2732", 700, 6);
      label(ctx, "ANYWARE HQ · MEETING PAVILION", 92, 112, 22, "#7c8b98", 500, 5);

      if (meetings.length === 0) {
        label(ctx, "No meetings scheduled", 92, h * 0.44, 34, "#9aa7b4", 500, 2);
        return;
      }
      meetings.slice(0, 5).forEach((m, i) => {
        const y = 186 + i * 74;
        ctx.fillStyle = STATUS_TINT[m.status] ?? "#a9b6c2";
        ctx.fillRect(92, y + 6, 5, 40);
        const when = `${time(m.startAt)}–${time(m.endAt)}`;
        label(ctx, when, 116, y + 6, 30, "#5f7181", 600, 2);
        // the title starts after the time actually ends: at a fixed
        // column the two ran into each other for any real time range
        ctx.font = "600 30px system-ui, -apple-system, sans-serif";
        const titleX = Math.max(300, 116 + ctx.measureText(when).width + 2 * when.length + 30);
        label(ctx, m.title, titleX, y + 2, 34, "#1e2732", 600, 1);
        const right = m.hasUrl ? "ZOOM" : m.room;
        ctx.font = "600 24px system-ui, -apple-system, sans-serif";
        const tw = ctx.measureText(right).width + 2 * right.length;
        label(ctx, right, w - 96 - tw, y + 10, 24, m.hasUrl ? "#3f9fd0" : "#8794a1", 600, 2);
        ctx.fillStyle = "rgba(30,39,50,0.08)";
        ctx.fillRect(92, y + 60, w - 184, 1);
      });
    },
    1024,
    576,
  );
}

/** A district's wall: what is actually being worked on. */
export function makeProjectBoard(
  projects: BoardProject[],
  title: string,
  accent: string,
): THREE.MeshBasicMaterial {
  return makeScreen(
    (ctx, w, h) => {
      fillGradient(ctx, w, h, "#16202a", "#101821");
      ctx.fillStyle = accent;
      ctx.fillRect(56, 52, 5, 52);
      label(ctx, title, 80, 50, 38, "#dcebf5", 600, 5);
      if (projects.length === 0) {
        label(ctx, "No active projects", 80, h * 0.44, 30, "#7f96a8", 500, 2);
        return;
      }
      projects.slice(0, 6).forEach((p, i) => {
        const y = 150 + i * 66;
        label(ctx, p.title, 80, y, 30, "#eaf5fd", 600, 1);
        label(ctx, p.client, 80, y + 34, 20, "#7f96a8", 500, 2);
        // progress as a bar, because a number is not readable at 6 m
        const bx = w - 300;
        ctx.fillStyle = "rgba(255,255,255,0.10)";
        ctx.fillRect(bx, y + 12, 200, 8);
        ctx.fillStyle = accent;
        ctx.fillRect(bx, y + 12, Math.max(4, 200 * Math.min(1, p.progress / 100)), 8);
        ctx.fillStyle = "rgba(255,255,255,0.06)";
        ctx.fillRect(80, y + 54, w - 160, 1);
      });
    },
    768,
    512,
  );
}
