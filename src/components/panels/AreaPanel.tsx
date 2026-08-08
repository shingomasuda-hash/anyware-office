"use client";

import type { AreaId, DemoRole } from "@/types/office";
import { AREA_BY_ID } from "@/lib/game/map";
import { PanelShell } from "./PanelKit";
import EntrancePanel from "./EntrancePanel";
import StaffPanel from "./StaffPanel";
import SignalPanel from "./SignalPanel";
import PartnerPanel from "./PartnerPanel";
import TablePanel from "./TablePanel";
import GreenPanel from "./GreenPanel";
import LocalPanel from "./LocalPanel";
import MeetingPanel from "./MeetingPanel";
import AiPanel from "./AiPanel";
import AdminPanel from "./AdminPanel";

function AreaContent({ areaId, role }: { areaId: AreaId; role: DemoRole }) {
  switch (areaId) {
    case "ENTRANCE":
      return <EntrancePanel />;
    case "STAFF":
      return <StaffPanel />;
    case "SIGNAL":
      return <SignalPanel role={role} />;
    case "PARTNER":
      return <PartnerPanel role={role} />;
    case "TABLE":
      return <TablePanel role={role} />;
    case "GREEN":
      return <GreenPanel role={role} />;
    case "LOCAL":
      return <LocalPanel role={role} />;
    case "MEETING":
      return <MeetingPanel />;
    case "AI":
      return <AiPanel />;
    case "ADMIN":
      return <AdminPanel />;
  }
}

export default function AreaPanel({
  areaId,
  role,
  onClose,
}: {
  areaId: AreaId;
  role: DemoRole;
  onClose: () => void;
}) {
  return (
    <PanelShell area={AREA_BY_ID[areaId]} onClose={onClose}>
      <AreaContent areaId={areaId} role={role} />
    </PanelShell>
  );
}
