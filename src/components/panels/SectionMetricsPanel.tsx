"use client";

import type { SectionKey } from "@/types/database";
import type { DemoRole } from "@/types/office";
import type { Project } from "@/lib/repositories";
import { useOfficeDataContext } from "@/hooks/useOfficeData";
import {
  MetricGrid,
  PanelEmpty,
  PanelError,
  PanelList,
  PanelLoading,
  PanelSection,
  PanelSummary,
} from "./PanelKit";
import { metricsForSection, sectionTagline } from "./shared";

/**
 * projects rows scoped to this business section. RLS already limits
 * anonymous readers to public rows; mirror is_public for the DEMO
 * source so guest sees the same shape either way.
 */
function SectionProjects({
  projects,
  sectionKey,
  role,
}: {
  projects: Project[];
  sectionKey: SectionKey;
  role: DemoRole;
}) {
  const visible = projects.filter(
    (p) =>
      p.business_section === sectionKey && (role !== "guest" || p.is_public),
  );
  return (
    <PanelSection title="PROJECTS">
      {visible.length === 0 ? (
        <PanelEmpty label="No projects yet" />
      ) : (
        <PanelList
          items={visible.map((p) => ({
            key: p.id,
            primary: p.title,
            secondary: p.client_name || undefined,
            trailing: (
              <span className="text-[10px] font-semibold tracking-wider text-zinc-400">
                {p.status.toUpperCase()}
              </span>
            ),
          }))}
        />
      )}
    </PanelSection>
  );
}

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
      <SectionProjects
        projects={state.data.projects}
        sectionKey={sectionKey}
        role={role}
      />
      {children}
    </>
  );
}
