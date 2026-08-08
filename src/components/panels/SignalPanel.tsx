"use client";

import type { DemoRole } from "@/types/office";
import { signalContent } from "@/data/mockOfficeData";
import { MetricGrid, PanelSection, PanelSummary } from "./PanelKit";

export default function SignalPanel({ role }: { role: DemoRole }) {
  return (
    <>
      <PanelSection>
        <PanelSummary>{signalContent.description}</PanelSummary>
      </PanelSection>
      <PanelSection title="METRICS">
        <MetricGrid metrics={signalContent.metrics} role={role} />
      </PanelSection>
    </>
  );
}
