"use client";

import { aiStaticContent } from "@/data/officeStaticContent";
import { PanelSection, PanelSummary } from "./PanelKit";

export default function AiPanel() {
  return (
    <>
      <PanelSection>
        <p className="text-lg font-semibold tracking-tight">
          {aiStaticContent.title}
        </p>
        <p className="mt-1 text-xs font-semibold tracking-[0.25em] text-zinc-400">
          {aiStaticContent.status}
        </p>
      </PanelSection>
      <PanelSection title="TOPICS">
        <div className="flex flex-wrap gap-2">
          {aiStaticContent.topics.map((t) => (
            <span
              key={t}
              className="rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-600 dark:border-zinc-800 dark:text-zinc-400"
            >
              {t}
            </span>
          ))}
        </div>
      </PanelSection>
      <PanelSection>
        <PanelSummary>{aiStaticContent.description}</PanelSummary>
      </PanelSection>
    </>
  );
}
