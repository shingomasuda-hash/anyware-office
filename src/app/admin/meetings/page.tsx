"use client";

import { useEffect, useState } from "react";
import { getRepositories } from "@/lib/repositories";
import { ResourceManager } from "@/components/admin/ResourceManager";
import {
  fdatetimeOrNull,
  fenum,
  froles,
  fstr,
  isoToLocalInput,
  urlFieldError,
  type FormValues,
} from "@/components/admin/form";
import type { Meeting, MeetingRoom } from "@/lib/repositories";

const ROOM_STATUSES = ["available", "reserved", "in_use"] as const;
const MEETING_STATUSES = [
  "scheduled",
  "in_progress",
  "done",
  "cancelled",
] as const;
const NO_ROOM = "__none__";

const repos = () => getRepositories();

const loadRooms = () => repos().meetingRooms.list();
function roomFromForm(values: FormValues) {
  return {
    name: fstr(values, "name"),
    description: fstr(values, "description"),
    default_url: fstr(values, "default_url").trim(),
    status: fenum(values, "status", ROOM_STATUSES, "available"),
    visible_roles: froles(values, "visible_roles"),
  };
}
const onCreateRoom = (values: FormValues) =>
  repos().meetingRooms.create(roomFromForm(values));
const onUpdateRoom = (id: string, values: FormValues) =>
  repos().meetingRooms.update(id, roomFromForm(values));
const onRemoveRoom = (id: string) => repos().meetingRooms.remove(id);
const roomToForm = (row: MeetingRoom | null): FormValues => ({
  name: row?.name ?? "",
  description: row?.description ?? "",
  default_url: row?.default_url ?? "",
  status: row?.status ?? "available",
  visible_roles: row?.visible_roles ?? ["member", "admin"],
});
const validateRoom = (values: FormValues): string | null => {
  if (fstr(values, "name").trim() === "") return "Name is required";
  return urlFieldError(fstr(values, "default_url"), "Default URL");
};

const loadMeetings = () => repos().meetings.list();

export default function MeetingsAdminPage() {
  const [rooms, setRooms] = useState<MeetingRoom[]>([]);

  useEffect(() => {
    loadRooms()
      .then(setRooms)
      .catch(() => setRooms([]));
  }, []);

  const meetingFromForm = (values: FormValues) => {
    const roomId = fstr(values, "meeting_room_id");
    return {
      title: fstr(values, "title"),
      meeting_room_id: roomId === NO_ROOM || roomId === "" ? null : roomId,
      start_at: fdatetimeOrNull(values, "start_at") ?? "",
      end_at: fdatetimeOrNull(values, "end_at") ?? "",
      meeting_url: fstr(values, "meeting_url").trim() || null,
      client_name: fstr(values, "client_name"),
      status: fenum(values, "status", MEETING_STATUSES, "scheduled"),
      visible_roles: froles(values, "visible_roles"),
    };
  };

  const validateMeeting = (values: FormValues): string | null => {
    if (fstr(values, "title").trim() === "") return "Title is required";
    const start = fdatetimeOrNull(values, "start_at");
    const end = fdatetimeOrNull(values, "end_at");
    if (!start || !end) return "Start / End は必須です";
    if (end <= start) return "End は Start より後にしてください（DB制約）";
    return urlFieldError(fstr(values, "meeting_url"), "Meeting URL");
  };

  return (
    <div className="mx-auto max-w-5xl">
      <ResourceManager<MeetingRoom>
        title="Meeting Rooms"
        description="default_urlは http/https のみ有効。空の場合、OfficeのJOIN MEETINGはdisabledになります。"
        emptyLabel="No meeting rooms"
        columns={[
          { key: "name", label: "NAME", render: (r) => r.name },
          { key: "status", label: "STATUS", render: (r) => r.status },
          {
            key: "url",
            label: "DEFAULT URL",
            render: (r) => r.default_url || "(not set)",
          },
          {
            key: "roles",
            label: "VISIBLE",
            render: (r) => r.visible_roles.join(", "),
          },
        ]}
        fields={[
          { name: "name", label: "Name", type: "text", required: true },
          { name: "description", label: "Description", type: "textarea" },
          {
            name: "default_url",
            label: "Default URL",
            type: "text",
            help: "http:// または https:// のみ。空 = URL未設定",
          },
          {
            name: "status",
            label: "Status",
            type: "select",
            options: ROOM_STATUSES.map((s) => ({ value: s, label: s })),
          },
          { name: "visible_roles", label: "Visible roles", type: "roles" },
        ]}
        load={loadRooms}
        toForm={roomToForm}
        validate={validateRoom}
        onCreate={onCreateRoom}
        onUpdate={onUpdateRoom}
        onRemove={onRemoveRoom}
      />

      <ResourceManager<Meeting>
        title="Meetings"
        description="会議の予定。meeting_urlはroomのdefault_urlより優先されます。"
        emptyLabel="No meetings yet"
        columns={[
          { key: "title", label: "TITLE", render: (r) => r.title },
          {
            key: "room",
            label: "ROOM",
            render: (r) =>
              rooms.find((room) => room.id === r.meeting_room_id)?.name ?? "—",
          },
          {
            key: "start",
            label: "START",
            render: (r) => new Date(r.start_at).toLocaleString(),
          },
          { key: "status", label: "STATUS", render: (r) => r.status },
        ]}
        fields={[
          { name: "title", label: "Title", type: "text", required: true },
          {
            name: "meeting_room_id",
            label: "Room",
            type: "select",
            options: [
              { value: NO_ROOM, label: "(none)" },
              ...rooms.map((r) => ({ value: r.id, label: r.name })),
            ],
          },
          { name: "start_at", label: "Start", type: "datetime", required: true },
          { name: "end_at", label: "End", type: "datetime", required: true },
          {
            name: "meeting_url",
            label: "Meeting URL",
            type: "text",
            help: "http:// または https:// のみ",
          },
          { name: "client_name", label: "Client", type: "text" },
          {
            name: "status",
            label: "Status",
            type: "select",
            options: MEETING_STATUSES.map((s) => ({ value: s, label: s })),
          },
          { name: "visible_roles", label: "Visible roles", type: "roles" },
        ]}
        load={loadMeetings}
        toForm={(row: Meeting | null): FormValues => ({
          title: row?.title ?? "",
          meeting_room_id: row?.meeting_room_id ?? NO_ROOM,
          start_at: isoToLocalInput(row?.start_at ?? null),
          end_at: isoToLocalInput(row?.end_at ?? null),
          meeting_url: row?.meeting_url ?? "",
          client_name: row?.client_name ?? "",
          status: row?.status ?? "scheduled",
          visible_roles: row?.visible_roles ?? ["member", "admin"],
        })}
        validate={validateMeeting}
        onCreate={(values) => repos().meetings.create(meetingFromForm(values))}
        onUpdate={(id, values) =>
          repos().meetings.update(id, meetingFromForm(values))
        }
        onRemove={(id) => repos().meetings.remove(id)}
      />
    </div>
  );
}
