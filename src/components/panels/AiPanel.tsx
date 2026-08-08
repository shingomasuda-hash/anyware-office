"use client";

import { aiContent } from "@/data/mockOfficeData";
import { PanelSection, PanelSummary } from "./PanelKit";

export default function AiPanel() {
  return (
    <>
      <PanelSection>
        <p className="text-lg font-semibold tracking-tight">{aiContent.title}</p>
        <p className="mt-1 text-xs font-semibold tracking-[0.25em] text-zinc-400">
          {aiContent.status}
        </p>
      </PanelSection>
      <PanelSection title="TOPICS">
        <div className="flex flex-wrap gap-2">
          {aiContent.topics.map((t) => (
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
        <PanelSummary>
          AI活用・業務効率化の取り組みを紹介するエリアです。
        </PanelSummary>
      </PanelSection>
    </>
  );
}
