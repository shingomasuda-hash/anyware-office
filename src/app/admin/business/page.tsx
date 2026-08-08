"use client";

import { getRepositories } from "@/lib/repositories";
import { ResourceManager } from "@/components/admin/ResourceManager";
import {
  fbool,
  fenum,
  fnum,
  froles,
  fstr,
  type FormValues,
} from "@/components/admin/form";
import type { BusinessSection, SectionMetric } from "@/lib/repositories";

const SECTIONS = ["LOCAL", "SIGNAL", "PARTNER", "TABLE", "GREEN"] as const;

const repos = () => getRepositories();

const loadSections = () => repos().businessSections.list();
const onUpdateSection = (id: string, values: FormValues) =>
  repos().businessSections.update(id, {
    title: fstr(values, "title"),
    tagline: fstr(values, "tagline"),
    description: fstr(values, "description"),
    display_order: fnum(values, "display_order"),
    is_active: fbool(values, "is_active"),
  });
const sectionToForm = (row: BusinessSection | null): FormValues => ({
  title: row?.title ?? "",
  tagline: row?.tagline ?? "",
  description: row?.description ?? "",
  display_order: row?.display_order ?? 100,
  is_active: row?.is_active ?? true,
});

const loadMetrics = () => repos().sectionMetrics.list();
function metricFromForm(values: FormValues) {
  return {
    section_key: fenum(values, "section_key", SECTIONS, "SIGNAL"),
    metric_key: fstr(values, "metric_key"),
    label: fstr(values, "label"),
    value: fstr(values, "value"),
    unit: fstr(values, "unit"),
    comparison_value: fstr(values, "comparison_value") || null,
    comparison_label: fstr(values, "comparison_label") || null,
    display_order: fnum(values, "display_order"),
    visible_roles: froles(values, "visible_roles"),
  };
}
const onCreateMetric = (values: FormValues) =>
  repos().sectionMetrics.create(metricFromForm(values));
const onUpdateMetric = (id: string, values: FormValues) =>
  repos().sectionMetrics.update(id, metricFromForm(values));
const onRemoveMetric = (id: string) => repos().sectionMetrics.remove(id);
const metricToForm = (row: SectionMetric | null): FormValues => ({
  section_key: row?.section_key ?? "SIGNAL",
  metric_key: row?.metric_key ?? "",
  label: row?.label ?? "",
  value: row?.value ?? "0",
  unit: row?.unit ?? "",
  comparison_value: row?.comparison_value ?? "",
  comparison_label: row?.comparison_label ?? "",
  display_order: row?.display_order ?? 100,
  visible_roles: row?.visible_roles ?? ["member", "admin"],
});
const validateMetric = (values: FormValues): string | null => {
  if (fstr(values, "metric_key").trim() === "") return "metric_key is required";
  if (fstr(values, "label").trim() === "") return "Label is required";
  return null;
};

export default function BusinessAdminPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <ResourceManager<BusinessSection>
        title="Business Sections"
        description="5事業区分（LOCAL / SIGNAL / PARTNER / TABLE / GREEN）は固定です。表示内容のみ編集できます。"
        emptyLabel="No business sections"
        createDisabledNote="事業区分の追加は不可"
        columns={[
          { key: "key", label: "KEY", render: (r) => r.section_key },
          { key: "title", label: "TITLE", render: (r) => r.title },
          { key: "tagline", label: "TAGLINE", render: (r) => r.tagline },
          {
            key: "active",
            label: "ACTIVE",
            render: (r) => (r.is_active ? "yes" : "no"),
          },
        ]}
        fields={[
          { name: "title", label: "Title", type: "text", required: true },
          { name: "tagline", label: "Tagline", type: "text" },
          { name: "description", label: "Description", type: "textarea" },
          { name: "display_order", label: "Display order", type: "number" },
          {
            name: "is_active",
            label: "Active",
            type: "checkbox",
            help: "guestにも表示（非activeはmember以上のみ）",
          },
        ]}
        load={loadSections}
        toForm={sectionToForm}
        onUpdate={onUpdateSection}
      />

      <ResourceManager<SectionMetric>
        title="Section Metrics"
        description="各事業エリアのKPI（section_key + metric_keyはDB上ユニーク）"
        emptyLabel="No section metrics"
        columns={[
          { key: "section", label: "SECTION", render: (r) => r.section_key },
          { key: "label", label: "LABEL", render: (r) => r.label },
          { key: "value", label: "VALUE", render: (r) => r.value },
          { key: "unit", label: "UNIT", render: (r) => r.unit || "—" },
          {
            key: "roles",
            label: "VISIBLE",
            render: (r) => r.visible_roles.join(", "),
          },
        ]}
        fields={[
          {
            name: "section_key",
            label: "Section",
            type: "select",
            options: SECTIONS.map((s) => ({ value: s, label: s })),
          },
          {
            name: "metric_key",
            label: "Metric key",
            type: "text",
            required: true,
          },
          { name: "label", label: "Label", type: "text", required: true },
          { name: "value", label: "Value", type: "text" },
          { name: "unit", label: "Unit", type: "text" },
          { name: "comparison_value", label: "Comparison value", type: "text" },
          { name: "comparison_label", label: "Comparison label", type: "text" },
          { name: "display_order", label: "Display order", type: "number" },
          { name: "visible_roles", label: "Visible roles", type: "roles" },
        ]}
        load={loadMetrics}
        toForm={metricToForm}
        validate={validateMetric}
        onCreate={onCreateMetric}
        onUpdate={onUpdateMetric}
        onRemove={onRemoveMetric}
      />
    </div>
  );
}
