"use client";

import { getRepositories } from "@/lib/repositories";
import { ResourceManager } from "@/components/admin/ResourceManager";
import {
  fdateOrNull,
  fenum,
  fnum,
  fstr,
  type FormValues,
} from "@/components/admin/form";
import type { GreenDeal } from "@/lib/repositories";

const STAGES = [
  "lead",
  "meeting",
  "proposal",
  "negotiation",
  "won",
  "lost",
] as const;

const repos = () => getRepositories();
const load = () => repos().greenDeals.list();

function fromForm(values: FormValues) {
  return {
    company_name: fstr(values, "company_name"),
    deal_name: fstr(values, "deal_name"),
    stage: fenum(values, "stage", STAGES, "lead"),
    amount: Math.max(0, fnum(values, "amount")),
    probability: Math.min(100, Math.max(0, fnum(values, "probability"))),
    next_action: fstr(values, "next_action"),
    expected_close_at: fdateOrNull(values, "expected_close_at"),
  };
}

const onCreate = (values: FormValues) =>
  repos().greenDeals.create(fromForm(values));
const onUpdate = (id: string, values: FormValues) =>
  repos().greenDeals.update(id, fromForm(values));
const onRemove = (id: string) => repos().greenDeals.remove(id);

const toForm = (row: GreenDeal | null): FormValues => ({
  company_name: row?.company_name ?? "",
  deal_name: row?.deal_name ?? "",
  stage: row?.stage ?? "lead",
  amount: row?.amount ?? 0,
  probability: row?.probability ?? 0,
  next_action: row?.next_action ?? "",
  expected_close_at: row?.expected_close_at ?? "",
});

const validate = (values: FormValues): string | null =>
  fstr(values, "company_name").trim() === "" ? "Company name is required" : null;

export default function GreenAdminPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <ResourceManager<GreenDeal>
        title="GREEN Deals"
        description="水耕栽培・農業事業の商談パイプライン（実案件のみ登録してください）"
        emptyLabel="No active deals — 0件からスタート"
        columns={[
          { key: "company", label: "COMPANY", render: (r) => r.company_name },
          { key: "deal", label: "DEAL", render: (r) => r.deal_name || "—" },
          { key: "stage", label: "STAGE", render: (r) => r.stage },
          {
            key: "amount",
            label: "AMOUNT",
            render: (r) => `¥${r.amount.toLocaleString()}`,
          },
          {
            key: "probability",
            label: "PROB.",
            render: (r) => `${r.probability}%`,
          },
        ]}
        fields={[
          {
            name: "company_name",
            label: "Company",
            type: "text",
            required: true,
          },
          { name: "deal_name", label: "Deal name", type: "text" },
          {
            name: "stage",
            label: "Stage",
            type: "select",
            options: STAGES.map((s) => ({ value: s, label: s })),
          },
          { name: "amount", label: "Amount (円)", type: "number" },
          { name: "probability", label: "Probability (0-100)", type: "number" },
          { name: "next_action", label: "Next action", type: "text" },
          {
            name: "expected_close_at",
            label: "Expected close",
            type: "date",
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
