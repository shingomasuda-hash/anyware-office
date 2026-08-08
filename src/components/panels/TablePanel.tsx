"use client";

import type { DemoRole } from "@/types/office";
import { tableContent } from "@/data/mockOfficeData";
import { MetricGrid, PanelSection, PanelSummary } from "./PanelKit";

export default function TablePanel({ role }: { role: DemoRole }) {
  return (
    <>
      <PanelSection>
        <PanelSummary>{tableContent.description}</PanelSummary>
      </PanelSection>
      <PanelSection title="STORE">
        <p className="rounded-lg border border-zinc-200 px-4 py-3 text-sm font-medium dark:border-zinc-800">
          {tableContent.storeName}
        </p>
      </PanelSection>
      <PanelSection title="TODAY">
        <MetricGrid metrics={tableContent.metrics} role={role} />
      </PanelSection>
    </>
  );
}
