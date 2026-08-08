"use client";

import type { DemoRole } from "@/types/office";
import { useOfficeDataContext } from "@/hooks/useOfficeData";
import { PanelEmpty, PanelList, PanelSection } from "./PanelKit";
import SectionMetricsPanel from "./SectionMetricsPanel";

const STAGE_LABELS: Record<string, string> = {
  lead: "LEAD",
  meeting: "MEETING",
  proposal: "PROPOSAL",
  negotiation: "NEGOTIATION",
  won: "WON",
  lost: "LOST",
};

function GreenDeals({ role }: { role: DemoRole }) {
  const state = useOfficeDataContext();
  if (state.status !== "ready") return null;

  // green_deals is member-only under RLS; mirror that in the demo UI.
  if (role === "guest") {
    return (
      <PanelSection title="DEALS">
        <PanelEmpty label="MEMBER ONLY — Sign in (STEP 2.5)" />
      </PanelSection>
    );
  }
  const deals = state.data.greenDeals;
  return (
    <PanelSection title="DEALS">
      {deals.length === 0 ? (
        <PanelEmpty label="No active deals" />
      ) : (
        <PanelList
          items={deals.map((d) => ({
            key: d.id,
            primary: d.deal_name || d.company_name,
            secondary: d.company_name,
            trailing: (
              <span className="text-[10px] font-semibold tracking-wider text-zinc-400">
                {STAGE_LABELS[d.stage] ?? d.stage}
              </span>
            ),
          }))}
        />
      )}
    </PanelSection>
  );
}

export default function GreenPanel({ role }: { role: DemoRole }) {
  return (
    <SectionMetricsPanel
      sectionKey="GREEN"
      role={role}
      fallbackDescription="テクノロジーで、育て方をアップデートする。"
    >
      <GreenDeals role={role} />
    </SectionMetricsPanel>
  );
}
