"use client";

import type { DemoRole } from "@/types/office";
import type { Meeting, MeetingRoom } from "@/lib/repositories";
import { useOfficeDataContext } from "@/hooks/useOfficeData";
import { canViewRoles } from "@/lib/auth/visibility";
import {
  PanelEmpty,
  PanelError,
  PanelList,
  PanelLoading,
  PanelSection,
  PanelSummary,
  UrlCtaButton,
} from "./PanelKit";

/** meetings.meeting_url wins over the room's default_url. */
function joinUrlForRoom(room: MeetingRoom, meetings: Meeting[]): string {
  const next = meetings
    .filter(
      (m) =>
        m.meeting_room_id === room.id &&
        (m.status === "scheduled" || m.status === "in_progress"),
    )
    .sort((a, b) => a.start_at.localeCompare(b.start_at))[0];
  return (next?.meeting_url || room.default_url || "").trim();
}

export default function MeetingPanel({ role }: { role: DemoRole }) {
  const state = useOfficeDataContext();

  return (
    <>
      <PanelSection>
        <PanelSummary>
          会議室エリアです。Meeting URLが設定されると、ここから参加できます。
        </PanelSummary>
      </PanelSection>
      <PanelSection title="ROOMS">
        {state.status === "loading" ? (
          <PanelLoading />
        ) : state.status === "error" ? (
          <PanelError message={state.message} />
        ) : (
          (() => {
            // meeting_rooms rows carry visible_roles ({member,admin} by
            // default) — RLS enforces this server-side; mirror it here.
            const rooms = state.data.meetingRooms.filter((r) =>
              canViewRoles(role, r.visible_roles),
            );
            if (rooms.length === 0) {
              return (
                <PanelEmpty label="Meeting rooms are visible to members — Sign in (STEP 2.5)" />
              );
            }
            return (
              <PanelList
                items={rooms.map((room) => ({
                  key: room.id,
                  primary: room.name,
                  secondary: room.description || room.status.toUpperCase(),
                  trailing: (
                    <UrlCtaButton
                      label="JOIN MEETING"
                      url={joinUrlForRoom(room, state.data.meetings)}
                      emptyNote="Meeting URL not set"
                    />
                  ),
                }))}
              />
            );
          })()
        )}
      </PanelSection>
    </>
  );
}
