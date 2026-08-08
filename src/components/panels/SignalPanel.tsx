"use client";

import type { DemoRole } from "@/types/office";
import SectionMetricsPanel from "./SectionMetricsPanel";

export default function SignalPanel({ role }: { role: DemoRole }) {
  return (
    <SectionMetricsPanel
      sectionKey="SIGNAL"
      role={role}
      fallbackDescription="企業の魅力を、届く形に変える。"
    />
  );
}
