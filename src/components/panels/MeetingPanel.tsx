"use client";

import { meetingRooms } from "@/data/mockOfficeData";
import { PanelList, PanelSection, PanelSummary, UrlCtaButton } from "./PanelKit";

export default function MeetingPanel() {
  return (
    <>
      <PanelSection>
        <PanelSummary>
          会議室エリアです。STEP 2でSupabaseのmeeting_rooms / meetingsと接続されます。
        </PanelSummary>
      </PanelSection>
      <PanelSection title="ROOMS">
        <PanelList
          items={meetingRooms.map((room) => {
            const url = (room.meetingUrl || room.defaultUrl || "").trim();
            return {
              key: room.id,
              primary: room.name,
              secondary: `Capacity ${room.capacity}`,
              trailing: (
                <UrlCtaButton
                  label="JOIN MEETING"
                  url={url}
                  emptyNote="Meeting URL not set"
                />
              ),
            };
          })}
        />
      </PanelSection>
    </>
  );
}
