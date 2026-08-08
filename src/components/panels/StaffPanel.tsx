"use client";

import { staffMembers } from "@/data/mockOfficeData";
import { DemoBadge, PanelList, PanelSection, PanelSummary } from "./PanelKit";

export default function StaffPanel() {
  return (
    <>
      <PanelSection>
        <PanelSummary>
          AnyWareのメンバー紹介エリアです。STEP 2.5で実際のプロフィールと接続されます。
        </PanelSummary>
      </PanelSection>
      <PanelSection title="MEMBERS">
        <div className="mb-2">
          <DemoBadge />
        </div>
        <PanelList
          items={staffMembers.map((m) => ({
            key: m.id,
            primary: (
              <span className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-200 text-xs font-semibold text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"
                >
                  {m.name.slice(-1)}
                </span>
                {m.name}
              </span>
            ),
            secondary: m.department,
            trailing: (
              <span className="text-[10px] font-semibold tracking-wider text-zinc-400">
                {m.status}
              </span>
            ),
          }))}
        />
      </PanelSection>
    </>
  );
}
