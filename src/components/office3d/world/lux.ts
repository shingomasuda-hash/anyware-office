import * as THREE from "three";

/**
 * LUXURY METAVERSE PASS — material and surface library.
 *
 * The brief's rule is that richness comes from architecture, material,
 * light and restraint — not from object count or neon. So this module
 * holds a small, disciplined palette (pearl / brushed silver / frosted
 * glass / warm stone / soft wood) plus the light and screen surfaces
 * that carry the "digital layer sitting on a physical space" feeling.
 *
 * Everything here is a module-scope singleton: one material instance
 * shared by every mesh that uses it, so a richer look costs geometry,
 * never draw-call-per-material churn.
 */

const std = (o: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial(o);
const phys = (o: THREE.MeshPhysicalMaterialParameters) => new THREE.MeshPhysicalMaterial(o);
/** Unlit: the authored colour IS the emitted light (a lit device). */
const emit = (color: string, opacity = 1) =>
  new THREE.MeshBasicMaterial({
    color,
    toneMapped: false,
    transparent: opacity < 1,
    opacity,
    depthWrite: opacity > 0.9,
  });

export const LUX = {
  // ── surfaces ──────────────────────────────────────────────────────
  /** the HQ base note: warm pearl white, softly reflective */
  pearl: std({ color: "#f4f2ee", roughness: 0.55, metalness: 0.04 }),
  /** slightly deeper pearl for inset planes and recesses */
  pearlDeep: std({ color: "#e6e4df", roughness: 0.62, metalness: 0.03 }),
  /** matte plaster — the quiet background wall */
  matte: std({ color: "#eef0f1", roughness: 0.95 }),
  /** polished stone floor with a hint of sheen */
  stone: std({ color: "#e9e7e3", roughness: 0.28, metalness: 0.06 }),
  stoneDark: std({ color: "#cfd2d4", roughness: 0.34, metalness: 0.08 }),
  /** brushed silver — frames, mullions, fine structure */
  silver: std({ color: "#b9bfc7", roughness: 0.34, metalness: 0.78 }),
  silverDark: std({ color: "#8d949d", roughness: 0.4, metalness: 0.72 }),
  /** warm timber for seating, tables, counters */
  wood: std({ color: "#c8a882", roughness: 0.58 }),
  woodDeep: std({ color: "#a08055", roughness: 0.62 }),
  /** warm ceramic / clay accents */
  ceramic: std({ color: "#e7ded2", roughness: 0.7 }),
  /** executive dark: only used where the brief asks for weight */
  graphite: std({ color: "#3c4148", roughness: 0.5, metalness: 0.25 }),
  /** upholstery */
  fabric: std({ color: "#cbd2d8", roughness: 1 }),
  fabricWarm: std({ color: "#d9cec0", roughness: 1 }),
  fabricSage: std({ color: "#b9c9bd", roughness: 1 }),
  rug: std({ color: "#dcd8d1", roughness: 1 }),

  // ── glass ─────────────────────────────────────────────────────────
  clearGlass: phys({
    color: "#dbe9f2",
    roughness: 0.06,
    metalness: 0.02,
    transparent: true,
    opacity: 0.34,
    side: THREE.DoubleSide,
  }),
  frosted: phys({
    color: "#eef4f8",
    roughness: 0.55,
    metalness: 0,
    transparent: true,
    opacity: 0.42,
    side: THREE.DoubleSide,
  }),
  /** smart glass: a tinted, information-bearing pane */
  smartGlass: phys({
    color: "#dfeaf2",
    roughness: 0.18,
    metalness: 0.05,
    transparent: true,
    opacity: 0.3,
    side: THREE.DoubleSide,
  }),

  // ── light ─────────────────────────────────────────────────────────
  /** hidden cove / indirect strip — warm architectural white */
  cove: emit("#fff2e2"),
  coveSoft: emit("#fff4ea", 0.75),
  /** floor edge light */
  edge: emit("#eaf4ff", 0.85),
  /** the information layer: quiet, never neon */
  holo: emit("#9fd8f2", 0.5),
  holoSoft: emit("#b9e2f5", 0.28),
  holoWarm: emit("#f6d9a8", 0.42),
  /** core glow for hero objects */
  core: emit("#eaf7ff"),
  greenLight: emit("#c9edd2", 0.5),

  // ── vegetation ────────────────────────────────────────────────────
  leaf: std({ color: "#6f9a6a", roughness: 0.95 }),
  leafDeep: std({ color: "#557a54", roughness: 0.95 }),
  trunk: std({ color: "#8b7355", roughness: 0.9 }),
  soil: std({ color: "#5c534a", roughness: 1 }),
} as const;

/**
 * A lit screen surface. Screens are drawn once into a canvas and shown
 * unlit, so a display reads as a device that emits its own image
 * instead of a painted board that the room's lights fall on.
 */
export function makeScreen(
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  w = 1024,
  h = 576,
): THREE.MeshBasicMaterial {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });
}

/** Vertical gradient fill helper for screen canvases. */
export function fillGradient(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  from: string,
  to: string,
) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, from);
  g.addColorStop(1, to);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/** Thin type scale used on every in-world surface, for one HQ voice. */
export function label(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  color: string,
  weight = 600,
  tracking = 0,
) {
  ctx.font = `${weight} ${size}px system-ui, -apple-system, sans-serif`;
  ctx.fillStyle = color;
  ctx.textBaseline = "top";
  if (!tracking) {
    ctx.fillText(text, x, y);
    return;
  }
  let cx = x;
  for (const ch of text) {
    ctx.fillText(ch, cx, y);
    cx += ctx.measureText(ch).width + tracking;
  }
}

/**
 * Spatial signage plate: the floating identity of a place. Deliberately
 * light-on-dark-free — an HQ sign is a pale pane with quiet type, not a
 * glowing billboard.
 */
export function makeSignage(
  title: string,
  sub: string,
  accent: string,
  opts: { dark?: boolean } = {},
): THREE.MeshBasicMaterial {
  return makeScreen(
    (ctx, w, h) => {
      if (opts.dark) fillGradient(ctx, w, h, "#20262d", "#171c22");
      else fillGradient(ctx, w, h, "#fbfbfa", "#eceeef");
      ctx.fillStyle = accent;
      ctx.fillRect(0, h - 12, w, 12);
      label(ctx, title, 56, h * 0.3, 96, opts.dark ? "#f2f6f9" : "#1d242b", 700, 8);
      label(ctx, sub, 58, h * 0.62, 30, opts.dark ? "#9fb0be" : "#6d7c88", 500, 5);
    },
    1024,
    256,
  );
}

/** A quiet information pane: rows of live-looking data, no chrome. */
export function makeInfoPane(
  title: string,
  rows: Array<[string, string]>,
  accent: string,
): THREE.MeshBasicMaterial {
  return makeScreen(
    (ctx, w, h) => {
      fillGradient(ctx, w, h, "#16202a", "#101821");
      ctx.fillStyle = accent;
      ctx.fillRect(52, 46, 5, 40);
      label(ctx, title, 74, 48, 34, "#dcebf5", 600, 4);
      rows.forEach(([k, v], i) => {
        const y = 130 + i * 62;
        label(ctx, k, 56, y, 26, "#7f96a8", 500, 2);
        label(ctx, v, w - 56 - ctx.measureText(v).width, y - 4, 32, "#eaf5fd", 600, 1);
        ctx.fillStyle = "rgba(255,255,255,0.07)";
        ctx.fillRect(56, y + 44, w - 112, 1);
      });
    },
    768,
    512,
  );
}
