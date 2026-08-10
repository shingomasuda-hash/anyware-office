// Renderer-side avatar image cache. Loads each avatar_url once; while
// loading (or on error) renderers fall back to the identity initials.
// Kept out of lib/identity so the identity contract stays free of DOM.

const cache = new Map<string, HTMLImageElement | "loading" | "error">();

export function getAvatarImage(url: string | null): HTMLImageElement | null {
  if (!url || typeof window === "undefined") return null;
  const entry = cache.get(url);
  if (entry === "loading" || entry === "error") return null;
  if (entry) return entry;

  cache.set(url, "loading");
  const img = new Image();
  // Drawing (not reading) a cross-origin image is fine without CORS;
  // requesting it keeps the canvas untainted when the host allows it.
  img.crossOrigin = "anonymous";
  img.onload = () => cache.set(url, img);
  img.onerror = () => cache.set(url, "error");
  img.src = url;
  return null;
}
