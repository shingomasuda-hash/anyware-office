import type { Meeting, MeetingRoom } from "@/lib/repositories";
import type { OfficeData } from "@/hooks/useOfficeData";
import type { BoardData } from "./boardTypes";

/**
 * OFFICE DATA -> WALL SURFACES.
 *
 * The rules that decide what the campus shows: which meetings belong on
 * today's board, and which single meeting a person sitting down in the
 * pavilion is actually being invited to join. Pure, and free of both
 * React and three.js, so it can be checked directly.
 */

/** A meeting you can actually join from where you are sitting. */
export interface JoinableMeeting {
  id: string;
  title: string;
  room: string;
  startAt: string;
  endAt: string;
  url: string;
}

const sameLocalDay = (iso: string, now: Date) => {
  const d = new Date(iso);
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
};

/** meetings.meeting_url wins over the room's default_url — as in MeetingPanel. */
function joinUrl(m: Meeting, rooms: Map<string, MeetingRoom>): string {
  const room = m.meeting_room_id ? rooms.get(m.meeting_room_id) : undefined;
  const url = (m.meeting_url || room?.default_url || "").trim();
  return /^https?:\/\//i.test(url) ? url : "";
}

/**
 * The whole mapping, as a pure function of the data and the clock —
 * "what goes on the wall" and "what can I join" are decisions worth
 * being able to test without a browser in the loop.
 */
export function deriveBoard(
  data: Pick<OfficeData, "meetings" | "meetingRooms" | "projects">,
  now: Date,
): { board: BoardData; joinable: JoinableMeeting | null; joinables: JoinableMeeting[] } {
  const { meetings, meetingRooms, projects } = data;
  const rooms = new Map(meetingRooms.map((r) => [r.id, r]));

  const today = meetings
    .filter((m) => m.status !== "cancelled" && sameLocalDay(m.start_at, now))
    .sort((a, b) => a.start_at.localeCompare(b.start_at));

  const board: BoardData = {
    meetings: today.map((m) => ({
      id: m.id,
      title: m.title,
      client: m.client_name,
      startAt: m.start_at,
      endAt: m.end_at,
      room: m.meeting_room_id ? (rooms.get(m.meeting_room_id)?.name ?? "—") : "—",
      status: m.status,
      hasUrl: joinUrl(m, rooms) !== "",
    })),
    projects: projects
      .filter((p) => p.status !== "completed")
      .sort((a, b) => b.progress - a.progress)
      .map((p) => ({
        title: p.title,
        client: p.client_name,
        status: p.status,
        progress: p.progress,
      })),
  };

  // What to offer someone sitting down in the meeting pavilion: what
  // is running now, else the next thing today that has a URL. A
  // meeting that finished an hour ago is not an invitation.
  const t = now.getTime();
  const candidates = today.filter((m) => joinUrl(m, rooms) !== "" && Date.parse(m.end_at) >= t);
  const running = candidates.find((m) => Date.parse(m.start_at) <= t);
  const ordered = running ? [running, ...candidates.filter((m) => m !== running)] : candidates;
  const joinables: JoinableMeeting[] = ordered.map((m) => ({
    id: m.id,
    title: m.title,
    room: m.meeting_room_id ? (rooms.get(m.meeting_room_id)?.name ?? "Meeting") : "Meeting",
    startAt: m.start_at,
    endAt: m.end_at,
    url: joinUrl(m, rooms),
  }));

  return { board, joinable: joinables[0] ?? null, joinables };
}
