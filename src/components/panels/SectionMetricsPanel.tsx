"use client";

import type { SectionKey } from "@/types/database";
import type { DemoRole } from "@/types/office";
import { useOfficeDataContext } from "@/hooks/useOfficeData";
import {
  MetricGrid,
  PanelError,
  PanelLoading,
  PanelSection,
  PanelSummary,
} from "./PanelKit";
import { metricsForSection, sectionTagline } from "./shared";

/**
 * Shared body for the business-section areas: tagline from
 * business_sections + KPI cards from section_metrics. Area-specific
 * extras render below via children.
 */
export default function SectionMetricsPanel({
  sectionKey,
  role,
  fallbackDescription,
  children,
}: {
  sectionKey: SectionKey;
  role: DemoRole;
  fallbackDescription: string;
  children?: React.ReactNode;
}) {
  const state = useOfficeDataContext();

  if (state.status === "loading") return <PanelLoading />;
  if (state.status === "error") return <PanelError message={state.message} />;

  const tagline =
    sectionTagline(state.data.sections, sectionKey) || fallbackDescription;
  const metrics = metricsForSection(state.data.sectionMetrics, sectionKey);

  return (
    <>
      <PanelSection>
        <PanelSummary>{tagline}</PanelSummary>
      </PanelSection>
      <PanelSection title="METRICS">
        <MetricGrid metrics={metrics} role={role} />
      </PanelSection>
      {children}
    </>
  );
}
