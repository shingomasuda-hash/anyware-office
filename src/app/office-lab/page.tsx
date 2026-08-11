import type { Metadata } from "next";
import { redirect } from "next/navigation";
import ConfigurationError from "@/components/system/ConfigurationError";
import { getCurrentUser } from "@/lib/auth/current-user";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import OfficeLabClient from "./OfficeLabClient";

export const metadata: Metadata = {
  title: "AnyWare OFFICE — 3D Lab",
};

/**
 * STEP 4.9 immersive prototype route. Members/admins only — guests and
 * anonymous visitors are sent to the stable /office (which stays the
 * production surface). The 3D bundle itself is loaded client-side only,
 * from OfficeLabClient.
 */
export default async function OfficeLabPage() {
  if (!isSupabaseConfigured()) {
    if (process.env.NODE_ENV === "production") {
      return <ConfigurationError />;
    }
    redirect("/office"); // DEMO mode has no realtime — lab needs it
  }
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/office-lab");
  }
  if (user.role !== "member" && user.role !== "admin") {
    redirect("/office");
  }
  return <OfficeLabClient />;
}
