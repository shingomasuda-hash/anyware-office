// Pure check of the office-data -> wall mapping. No browser, no DB: the
// decisions worth being sure about here are "which meetings go on the
// wall" and "which one may I join", and both are functions of the rows
// and the clock.
import { deriveBoard } from "@/components/office3d/world/boardDerive";
import type { Meeting, MeetingRoom, Project } from "@/lib/repositories";

let failed = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failed++;
};

const NOW = new Date("2026-08-18T14:30:00+09:00");
const at = (h: number, m = 0) =>
  new Date(`2026-08-18T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00+09:00`).toISOString();
const tomorrow = (h: number) => new Date(`2026-08-19T${String(h).padStart(2, "0")}:00:00+09:00`).toISOString();

const room = (id: string, name: string, default_url: string): MeetingRoom => ({
  id,
  name,
  description: "",
  default_url,
  status: "available",
  visible_roles: ["member", "admin"],
  created_at: at(0),
  updated_at: at(0),
});

const meeting = (o: Partial<Meeting> & { id: string; start_at: string; end_at: string }): Meeting => ({
  title: "Meeting",
  meeting_room_id: "room-a",
  meeting_url: null,
  client_name: "ANYWARE",
  host_id: null,
  status: "scheduled",
  visible_roles: ["member", "admin"],
  created_at: at(0),
  updated_at: at(0),
  ...o,
});

const project = (o: Partial<Project> & { id: string; title: string }): Project => ({
  client_name: "ANYWARE",
  business_section: "SIGNAL",
  status: "active",
  description: "",
  assignee_id: null,
  progress: 50,
  due_date: null,
  amount: 0,
  is_public: true,
  created_at: at(0),
  updated_at: at(0),
  ...o,
});

const meetingRooms = [
  room("room-a", "商談ルーム A", "https://zoom.us/j/room-a"),
  room("room-b", "社内MTGルーム", ""),
];

const meetings: Meeting[] = [
  meeting({ id: "m-past", title: "朝会", start_at: at(9), end_at: at(9, 30) }),
  meeting({
    id: "m-now",
    title: "定例レビュー",
    start_at: at(14),
    end_at: at(15),
    meeting_url: "https://zoom.us/j/explicit",
  }),
  meeting({ id: "m-next", title: "夕会", start_at: at(17), end_at: at(18) }),
  meeting({ id: "m-cancelled", title: "中止分", start_at: at(16), end_at: at(16, 30), status: "cancelled" }),
  meeting({ id: "m-tomorrow", title: "明日の会議", start_at: tomorrow(10), end_at: tomorrow(11) }),
  meeting({ id: "m-nourl", title: "URLなし", start_at: at(15, 30), end_at: at(16), meeting_room_id: "room-b" }),
];

const projects: Project[] = [
  project({ id: "p1", title: "Alpha", progress: 20 }),
  project({ id: "p2", title: "Beta", progress: 80 }),
  project({ id: "p3", title: "Done", progress: 100, status: "completed" }),
];

const { board, joinable } = deriveBoard({ meetings, meetingRooms, projects }, NOW);

check("today only", board.meetings.every((m) => m.id !== "m-tomorrow"), board.meetings.map((m) => m.id).join(","));
check("cancelled dropped", !board.meetings.some((m) => m.id === "m-cancelled"));
check("sorted by start", board.meetings.map((m) => m.startAt).join() === [...board.meetings].map((m) => m.startAt).sort().join());
check("room name resolved", board.meetings.find((m) => m.id === "m-nourl")?.room === "社内MTGルーム");
check(
  "hasUrl from meeting_url or room default",
  board.meetings.find((m) => m.id === "m-now")?.hasUrl === true &&
    board.meetings.find((m) => m.id === "m-next")?.hasUrl === true &&
    board.meetings.find((m) => m.id === "m-nourl")?.hasUrl === false,
);

check("running meeting is the joinable one", joinable?.id === "m-now", joinable?.id ?? "none");
check("meeting_url beats room default", joinable?.url === "https://zoom.us/j/explicit", joinable?.url ?? "");

// after the running meeting ends, the next one with a URL takes over
const later = deriveBoard({ meetings, meetingRooms, projects }, new Date("2026-08-18T16:45:00+09:00"));
check("next meeting after the current one ends", later.joinable?.id === "m-next", later.joinable?.id ?? "none");
check("falls back to the room's default_url", later.joinable?.url === "https://zoom.us/j/room-a", later.joinable?.url ?? "");

// nothing left today
const night = deriveBoard({ meetings, meetingRooms, projects }, new Date("2026-08-18T22:00:00+09:00"));
check("nothing to join after hours", night.joinable === null);
check("board still lists the day", night.board.meetings.length === board.meetings.length);

// URLs that are not URLs must never become a link
const bad = deriveBoard(
  {
    meetings: [meeting({ id: "m-bad", start_at: at(14), end_at: at(15), meeting_url: "javascript:alert(1)" })],
    meetingRooms: [room("room-a", "A", "")],
    projects: [],
  },
  NOW,
);
check("non-http url rejected", bad.joinable === null && bad.board.meetings[0].hasUrl === false);

check("completed projects dropped", !board.projects.some((p) => p.title === "Done"));
check("projects sorted by progress", board.projects.map((p) => p.title).join() === "Beta,Alpha");

console.log(failed === 0 ? "\nALL PASS" : `\n${failed} FAILED`);
process.exit(failed === 0 ? 0 : 1);
