"use client";

import type { DemoRole } from "@/types/office";
import SectionMetricsPanel from "./SectionMetricsPanel";

export default function PartnerPanel({ role }: { role: DemoRole }) {
  return (
    <SectionMetricsPanel
      sectionKey="PARTNER"
      role={role}
      fallbackDescription="企業の隣で、事業を動かす。"
    />
  );
}
