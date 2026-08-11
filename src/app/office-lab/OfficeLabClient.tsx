"use client";

import dynamic from "next/dynamic";

// The three.js stack loads only in this route's client chunk — the
// production /office bundle is untouched (§4).
const OfficeLabShell = dynamic(
  () => import("@/components/office3d/OfficeLabShell"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[100dvh] flex-col items-center justify-center gap-3 bg-[#dce9f2]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-400 border-t-zinc-700" />
        <p className="text-xs font-semibold tracking-[0.25em] text-zinc-500">
          ENTERING ANYWARE OFFICE…
        </p>
      </div>
    ),
  },
);

export default function OfficeLabClient() {
  return <OfficeLabShell />;
}
