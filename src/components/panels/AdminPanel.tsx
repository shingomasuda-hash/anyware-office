"use client";

import { adminContent } from "@/data/mockOfficeData";
import { PanelSection } from "./PanelKit";

export default function AdminPanel() {
  return (
    <PanelSection>
      <div className="rounded-lg border border-zinc-200 px-5 py-8 text-center dark:border-zinc-800">
        <p className="text-lg font-semibold tracking-wide">
          {adminContent.notice}
        </p>
        <p className="mt-2 text-xs font-semibold tracking-[0.25em] text-zinc-400">
          {adminContent.availability}
        </p>
        <p className="mt-4 text-xs leading-6 text-zinc-500">
          管理コンソールはSTEP 2で実装し、STEP 2.5でサーバーサイド認証により保護されます。
        </p>
      </div>
    </PanelSection>
  );
}
