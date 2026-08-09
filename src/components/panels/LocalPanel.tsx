"use client";

import type { DemoRole } from "@/types/office";
import { useOfficeDataContext } from "@/hooks/useOfficeData";
import { PanelEmpty, PanelList, PanelSection } from "./PanelKit";
import SectionMetricsPanel from "./SectionMetricsPanel";

function LocalProjects() {
  const state = useOfficeDataContext();
  if (state.status !== "ready") return null;

  // RLS already limits rows for anonymous readers; is_public is also
  // respected here for the DEMO source.
  const projects = state.data.localProjects.filter((p) => p.is_public);
  return (
    <PanelSection title="LOCAL PROJECTS">
      {projects.length === 0 ? (
        <PanelEmpty label="No local projects yet" />
      ) : (
        <PanelList
          items={projects.map((p) => ({
            key: p.id,
            primary: p.title,
            secondary: [p.area, p.partner].filter(Boolean).join(" / "),
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

export default function LocalPanel({ role }: { role: DemoRole }) {
  return (
    <SectionMetricsPanel
      sectionKey="LOCAL"
      role={role}
      fallbackDescription="地域の余白から、新しい価値をつくる。"
    >
      <LocalProjects />
    </SectionMetricsPanel>
  );
}
