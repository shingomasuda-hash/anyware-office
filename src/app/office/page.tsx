import type { Metadata } from "next";
import ConfigurationError from "@/components/system/ConfigurationError";
import OfficeShell from "@/components/office/OfficeShell";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata: Metadata = {
  title: "AnyWare OFFICE",
};

// /office is public: anonymous visitors browse as guests under RLS.
// Only a misconfigured production build is blocked (fail closed).
export default function OfficePage() {
  if (!isSupabaseConfigured() && process.env.NODE_ENV === "production") {
    return <ConfigurationError />;
  }
  return <OfficeShell />;
}
