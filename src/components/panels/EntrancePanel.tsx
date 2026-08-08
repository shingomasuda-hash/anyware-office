"use client";

import { entranceContent } from "@/data/mockOfficeData";
import { PanelSection, PanelSummary } from "./PanelKit";

export default function EntrancePanel() {
  const c = entranceContent;
  return (
    <>
      <PanelSection>
        <p className="text-2xl font-semibold tracking-tight">{c.title}</p>
        <p className="mt-1 text-sm text-zinc-500">{c.welcome}</p>
      </PanelSection>
      <PanelSection title="ANNOUNCEMENTS">
        <ul className="space-y-2">
          {c.announcements.map((a) => (
            <li
              key={a}
              className="rounded-lg border border-zinc-200 px-4 py-3 text-sm dark:border-zinc-800"
            >
              {a}
            </li>
          ))}
        </ul>
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
            <li key={v} className="text-sm leading-7 text-zinc-700 dark:text-zinc-300">
              {v}
            </li>
          ))}
        </ul>
      </PanelSection>
    </>
  );
}
