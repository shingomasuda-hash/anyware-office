/**
 * Sanitize a ?next= redirect target: internal paths only. Rejects
 * absolute URLs, protocol-relative ("//host") and backslash tricks so
 * the login flow can never become an open redirect.
 */
export function sanitizeNextPath(value: string | null): string | null {
  if (!value) return null;
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//") || value.includes("\\")) return null;
  return value;
}
