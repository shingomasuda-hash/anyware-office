import type { UserRole } from "@/types/database";
import type { DemoRole, Visibility } from "@/types/office";

// STEP 2: UI simulation only. Real authorization is Supabase RLS — the
// database already filters rows server-side; these helpers only decide
// what the UI renders for the current (demo) role. Never treat DemoRole
// as a security boundary.

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

/** DB-driven visibility: rows carry a visible_roles user_role[] column. */
export function canViewRoles(
  role: DemoRole,
  visibleRoles: readonly UserRole[],
): boolean {
  return visibleRoles.includes(role);
}

/** Label for the minimum role that unlocks a roles list ("MEMBER"/"ADMIN"). */
export function requiredRoleLabel(visibleRoles: readonly UserRole[]): string {
  if (visibleRoles.includes("guest")) return "PUBLIC";
  if (visibleRoles.includes("member")) return "MEMBER";
  return "ADMIN";
}
