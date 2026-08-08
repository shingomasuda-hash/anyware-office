"use client";

import { getRepositories } from "@/lib/repositories";
import { ResourceManager } from "@/components/admin/ResourceManager";
import {
  fnum,
  fnumOrNull,
  fstr,
  type FormValues,
} from "@/components/admin/form";
import type { ExecutiveMetric } from "@/lib/repositories";

const repos = () => getRepositories();
const load = () => repos().executiveMetrics.list();

function fromForm(values: FormValues) {
  return {
    metric_key: fstr(values, "metric_key"),
    label: fstr(values, "label"),
    value: fnum(values, "value"),
    unit: fstr(values, "unit"),
    period: fstr(values, "period"),
    comparison_value: fnumOrNull(values, "comparison_value"),
  };
}

const onCreate = (values: FormValues) =>
  repos().executiveMetrics.create(fromForm(values));
const onUpdate = (id: string, values: FormValues) =>
  repos().executiveMetrics.update(id, fromForm(values));
const onRemove = (id: string) => repos().executiveMetrics.remove(id);

const toForm = (row: ExecutiveMetric | null): FormValues => ({
  metric_key: row?.metric_key ?? "",
  label: row?.label ?? "",
  value: row?.value ?? 0,
  unit: row?.unit ?? "",
  period: row?.period ?? "",
  comparison_value: row?.comparison_value ?? "",
});

const validate = (values: FormValues): string | null => {
  if (fstr(values, "metric_key").trim() === "") return "metric_key is required";
  if (fstr(values, "label").trim() === "") return "Label is required";
  return null;
};

export default function SettingsAdminPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <ResourceManager<ExecutiveMetric>
        title="Executive Metrics"
        description="経営KPI（metric_keyはDB上ユニーク）。初期値は0からスタート。"
        emptyLabel="No executive metrics"
        columns={[
          { key: "key", label: "KEY", render: (r) => r.metric_key },
          { key: "label", label: "LABEL", render: (r) => r.label },
          {
            key: "value",
            label: "VALUE",
            render: (r) => r.value.toLocaleString(),
          },
          { key: "unit", label: "UNIT", render: (r) => r.unit || "—" },
          { key: "period", label: "PERIOD", render: (r) => r.period || "—" },
        ]}
        fields={[
          {
            name: "metric_key",
            label: "Metric key",
            type: "text",
            required: true,
          },
          { name: "label", label: "Label", type: "text", required: true },
          { name: "value", label: "Value", type: "number" },
          { name: "unit", label: "Unit", type: "text" },
          { name: "period", label: "Period", type: "text" },
          {
            name: "comparison_value",
            label: "Comparison value",
            type: "number",
          },
        ]}
        load={load}
        toForm={toForm}
        validate={validate}
        onCreate={onCreate}
        onUpdate={onUpdate}
        onRemove={onRemove}
      />
    </div>
  );
}
