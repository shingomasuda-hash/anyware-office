"use client";

import { adminStaticContent } from "@/data/officeStaticContent";
import { PanelSection } from "./PanelKit";

export default function AdminPanel() {
  return (
    <PanelSection>
      <div className="rounded-lg border border-zinc-200 px-5 py-8 text-center dark:border-zinc-800">
        <p className="text-lg font-semibold tracking-wide">
          {adminStaticContent.notice}
        </p>
        <p className="mt-2 text-xs font-semibold tracking-[0.25em] text-zinc-400">
          {adminStaticContent.availability}
        </p>
        <p className="mt-4 text-xs leading-6 text-zinc-500">
          {adminStaticContent.description}
        </p>
      </div>
    </PanelSection>
  );
}
