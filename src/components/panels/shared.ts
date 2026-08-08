import type { SectionKey } from "@/types/database";
import type { BusinessSection, SectionMetric } from "@/lib/repositories";
import type { PanelMetric } from "./PanelKit";

export function toPanelMetrics(rows: SectionMetric[]): PanelMetric[] {
  return rows
    .slice()
    .sort((a, b) => a.display_order - b.display_order)
    .map((m) => ({
      id: m.id,
      label: m.label,
      value: m.value === "" ? "0" : m.value,
      unit: m.unit === "" ? undefined : m.unit,
      visibleRoles: m.visible_roles,
    }));
}

export function metricsForSection(
  metrics: SectionMetric[],
  key: SectionKey,
): PanelMetric[] {
  return toPanelMetrics(metrics.filter((m) => m.section_key === key));
}

export function sectionTagline(
  sections: BusinessSection[],
  key: SectionKey,
): string {
  return sections.find((s) => s.section_key === key)?.tagline ?? "";
}
