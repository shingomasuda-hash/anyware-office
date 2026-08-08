import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { DataSource } from "./types";

/**
 * SUPABASE when env vars are present, DEMO otherwise.
 *
 * STEP 2: DEMO is also allowed in production builds so the office can be
 * previewed without configuration. STEP 2.5 replaces that with fail-closed
 * behavior (production + unconfigured → configuration error screen).
 */
export function getDataSource(): DataSource {
  return isSupabaseConfigured() ? "SUPABASE" : "DEMO";
}
