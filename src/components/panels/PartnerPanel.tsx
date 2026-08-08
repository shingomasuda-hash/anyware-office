"use client";

import type { DemoRole } from "@/types/office";
import { partnerContent } from "@/data/mockOfficeData";
import { MetricGrid, PanelSection, PanelSummary } from "./PanelKit";

export default function PartnerPanel({ role }: { role: DemoRole }) {
  return (
    <>
      <PanelSection>
        <PanelSummary>{partnerContent.description}</PanelSummary>
      </PanelSection>
      <PanelSection title="METRICS">
        <MetricGrid metrics={partnerContent.metrics} role={role} />
      </PanelSection>
    </>
  );
}
