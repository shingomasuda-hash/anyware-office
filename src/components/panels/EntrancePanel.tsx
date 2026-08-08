"use client";

import type { DemoRole } from "@/types/office";
import { entranceStaticContent } from "@/data/officeStaticContent";
import { useOfficeDataContext } from "@/hooks/useOfficeData";
import { canViewRoles } from "@/lib/auth/visibility";
import {
  PanelEmpty,
  PanelError,
  PanelLoading,
  PanelSection,
  PanelSummary,
} from "./PanelKit";

export default function EntrancePanel({ role }: { role: DemoRole }) {
  const state = useOfficeDataContext();
  const c = entranceStaticContent;

  return (
    <>
      <PanelSection>
        <p className="text-2xl font-semibold tracking-tight">{c.title}</p>
        <p className="mt-1 text-sm text-zinc-500">{c.welcome}</p>
      </PanelSection>
      <PanelSection title="ANNOUNCEMENTS">
        {state.status === "loading" ? (
          <PanelLoading />
        ) : state.status === "error" ? (
          <PanelError message={state.message} />
        ) : (
          (() => {
            const visible = state.data.announcements.filter((a) =>
              canViewRoles(role, a.visible_roles),
            );
            if (visible.length === 0) {
              return <PanelEmpty label="No announcements" />;
            }
            return (
              <ul className="space-y-2">
                {visible.map((a) => (
                  <li
                    key={a.id}
                    className="rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-800"
                  >
                    <div className="flex items-center gap-2">
                      {a.priority !== "normal" ? (
                        <span className="rounded bg-red-100 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-red-700 dark:bg-red-950 dark:text-red-400">
                          {a.priority.toUpperCase()}
                        </span>
                      ) : null}
                      <p className="text-sm font-medium">{a.title}</p>
                    </div>
                    {a.body ? (
                      <p className="mt-1 text-xs leading-5 text-zinc-500">
                        {a.body}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            );
          })()
        )}
      </PanelSection>
      <PanelSection title="MISSION">
        <PanelSummary>{c.mission}</PanelSummary>
      </PanelSection>
      <PanelSection title="VISION">
        <PanelSummary>{c.vision}</PanelSummary>
      </PanelSection>
      <PanelSection title="VALUE">
        <ul className="space-y-1">
          {c.values.map((v) => (
            <li
              key={v}
              className="text-sm leading-7 text-zinc-700 dark:text-zinc-300"
            >
              {v}
            </li>
          ))}
        </ul>
      </PanelSection>
    </>
  );
}
