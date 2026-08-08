"use client";

import type { DemoRole } from "@/types/office";
import { localContent } from "@/data/mockOfficeData";
import { MetricGrid, PanelSection, PanelSummary } from "./PanelKit";

export default function LocalPanel({ role }: { role: DemoRole }) {
  return (
    <>
      <PanelSection>
        <PanelSummary>{localContent.description}</PanelSummary>
      </PanelSection>
      <PanelSection title="METRICS">
        <MetricGrid metrics={localContent.metrics} role={role} />
      </PanelSection>
    </>
  );
}
