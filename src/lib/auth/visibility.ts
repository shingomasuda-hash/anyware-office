import type { DemoRole, Visibility } from "@/types/office";

// STEP 1: UI simulation only. Real authorization arrives with Supabase
// Auth + RLS in STEP 2.5 — never treat DemoRole as a security boundary.

const ROLE_LEVEL: Record<DemoRole, number> = {
  guest: 0,
  member: 1,
  admin: 2,
};

const REQUIRED_LEVEL: Record<Visibility, number> = {
  public: 0,
  member: 1,
  admin: 2,
};

export function canView(role: DemoRole, visibility: Visibility): boolean {
  return ROLE_LEVEL[role] >= REQUIRED_LEVEL[visibility];
}
