"use client";

import type { DemoRole } from "@/types/office";
import { useOfficeDataContext } from "@/hooks/useOfficeData";
import {
  MetricGrid,
  PanelEmpty,
  PanelList,
  PanelSection,
  type PanelMetric,
} from "./PanelKit";
import SectionMetricsPanel from "./SectionMetricsPanel";

const MEMBER_ONLY = ["member", "admin"] as const;

function StoreToday({ role }: { role: DemoRole }) {
  const state = useOfficeDataContext();
  if (state.status !== "ready") return null;

  // Latest business day (list is ordered by business_date desc for
  // Supabase; sort again so the DEMO source behaves identically).
  const latest = state.data.storeMetrics
    .slice()
    .sort((a, b) => b.business_date.localeCompare(a.business_date))[0];

  // table_store_metrics is member-only under RLS.
  const metrics: PanelMetric[] = latest
    ? [
        {
          id: `${latest.id}-sales`,
          label: "Today's Sales",
          value: String(latest.sales),
          unit: "円",
          visibleRoles: MEMBER_ONLY,
        },
        {
          id: `${latest.id}-customers`,
          label: "Customers",
          value: String(latest.customers),
          unit: "人",
          visibleRoles: MEMBER_ONLY,
        },
        {
          id: `${latest.id}-average`,
          label: "Avg Spend",
          value: String(latest.average_spend),
          unit: "円",
          visibleRoles: MEMBER_ONLY,
        },
      ]
    : [];

  return (
    <>
      <PanelSection title="STORE">
        {latest ? (
          <div className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-800">
            <p className="text-sm font-medium">{latest.store_name}</p>
            <span className="text-[10px] font-semibold tracking-wider text-zinc-400">
              {latest.store_status.toUpperCase()}
            </span>
          </div>
        ) : (
          <PanelEmpty label="No store data yet" />
        )}
      </PanelSection>
      {latest ? (
        <PanelSection title={`TODAY (${latest.business_date})`}>
          <MetricGrid metrics={metrics} role={role} />
        </PanelSection>
      ) : null}
    </>
  );
}

function Menu({ role }: { role: DemoRole }) {
  const state = useOfficeDataContext();
  if (state.status !== "ready") return null;

  // table_menu_items is member-only under RLS.
  if (role === "guest") {
    return (
      <PanelSection title="MENU">
        <PanelEmpty label="MEMBER ONLY — Sign in (STEP 2.5)" />
      </PanelSection>
    );
  }
  const items = state.data.menuItems.filter((m) => m.is_active);
  return (
    <PanelSection title="MENU">
      {items.length === 0 ? (
        <PanelEmpty label="No menu items yet" />
      ) : (
        <PanelList
          items={items.map((m) => ({
            key: m.id,
            primary: m.name,
            secondary: m.category,
            trailing: (
              <span className="text-xs tabular-nums text-zinc-500">
                ¥{m.price.toLocaleString()}
              </span>
            ),
          }))}
        />
      )}
    </PanelSection>
  );
}

export default function TablePanel({ role }: { role: DemoRole }) {
  return (
    <SectionMetricsPanel
      sectionKey="TABLE"
      role={role}
      fallbackDescription="場所と食から、新しい体験をつくる。"
    >
      <StoreToday role={role} />
      <Menu role={role} />
    </SectionMetricsPanel>
  );
}
