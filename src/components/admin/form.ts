import type { UserRole } from "@/types/database";

// Typed form-value helpers. ResourceManager stores every field as a
// FormValue; page-level adapters narrow them into the exact database
// Insert/Update types — no `any` escape hatches.

export type FormValue = string | number | boolean | string[];
export type FormValues = Record<string, FormValue>;

export function fstr(values: FormValues, key: string): string {
  const v = values[key];
  return typeof v === "string" ? v : "";
}

export function fnum(values: FormValues, key: string): number {
  const v = values[key];
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const parsed = Number(v);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

export function fnumOrNull(values: FormValues, key: string): number | null {
  const v = values[key];
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const parsed = Number(v);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export function fbool(values: FormValues, key: string): boolean {
  return values[key] === true;
}

const USER_ROLES: readonly UserRole[] = ["guest", "member", "admin"];

export function froles(values: FormValues, key: string): UserRole[] {
  const v = values[key];
  if (!Array.isArray(v)) return [];
  return USER_ROLES.filter((role) => v.includes(role));
}

export function fenum<T extends string>(
  values: FormValues,
  key: string,
  allowed: readonly T[],
  fallback: T,
): T {
  const v = values[key];
  return typeof v === "string" && (allowed as readonly string[]).includes(v)
    ? (v as T)
    : fallback;
}

/** date input ("YYYY-MM-DD") → same string, or null when empty. */
export function fdateOrNull(values: FormValues, key: string): string | null {
  const v = fstr(values, key).trim();
  return v === "" ? null : v;
}

/** datetime-local input value → ISO string, or null when empty/invalid. */
export function localInputToIso(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function fdatetimeOrNull(values: FormValues, key: string): string | null {
  return localInputToIso(fstr(values, key));
}

/** ISO timestamp → datetime-local input value in the viewer's timezone. */
export function isoToLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function isValidHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}

/** Empty is allowed; anything non-empty must be http(s). */
export function urlFieldError(value: string, label: string): string | null {
  const trimmed = value.trim();
  if (trimmed === "" || isValidHttpUrl(trimmed)) return null;
  return `${label}: http:// または https:// で始まるURLを入力してください`;
}
