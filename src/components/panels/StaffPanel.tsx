"use client";

import { useOfficeDataContext } from "@/hooks/useOfficeData";
import {
  DemoBadge,
  PanelEmpty,
  PanelError,
  PanelList,
  PanelLoading,
  PanelSection,
  PanelSummary,
} from "./PanelKit";

export default function StaffPanel() {
  const state = useOfficeDataContext();

  return (
    <>
      <PanelSection>
        <PanelSummary>
          AnyWareのメンバー紹介エリアです。プロフィールはSupabase Auth経由で作成されます。
        </PanelSummary>
      </PanelSection>
      <PanelSection title="MEMBERS">
        {state.status === "loading" ? (
          <PanelLoading />
        ) : state.status === "error" ? (
          <PanelError message={state.message} />
        ) : (
          <>
            {state.source === "DEMO" ? (
              <div className="mb-2">
                <DemoBadge />
              </div>
            ) : null}
            {(() => {
              const staff = state.data.staff.filter((p) => p.is_public);
              if (staff.length === 0) {
                return <PanelEmpty label="No public member profiles yet" />;
              }
              return (
                <PanelList
                  items={staff.map((m) => ({
                    key: m.id,
                    primary: (
                      <span className="flex items-center gap-2">
                        <span
                          aria-hidden="true"
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-200 text-xs font-semibold text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"
                        >
                          {m.name.slice(0, 1)}
                        </span>
                        {m.name}
                      </span>
                    ),
                    secondary: m.position
                      ? `${m.department} — ${m.position}`
                      : m.department,
                    trailing: (
                      <span className="text-[10px] font-semibold tracking-wider text-zinc-400">
                        {m.status.toUpperCase()}
                      </span>
                    ),
                  }))}
                />
              );
            })()}
          </>
        )}
      </PanelSection>
    </>
  );
}
