"use client";

import type { DemoRole } from "@/types/office";
import { greenContent } from "@/data/mockOfficeData";
import { MetricGrid, PanelSection, PanelSummary } from "./PanelKit";

export default function GreenPanel({ role }: { role: DemoRole }) {
  return (
    <>
      <PanelSection>
        <PanelSummary>{greenContent.description}</PanelSummary>
      </PanelSection>
      <PanelSection title="METRICS">
        <MetricGrid metrics={greenContent.metrics} role={role} />
      </PanelSection>
    </>
  );
}
