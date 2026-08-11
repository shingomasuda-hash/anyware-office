import * as THREE from "three";

// Shared material palette — STEP 4.9.1 "Open-Air Futuristic Metaverse
// Office" art direction: white / light gray / silver / translucent
// glass base with cyan · mint · purple light accents. Wood is reduced
// to rare warm touches; warmth comes from plants and light instead.
// Module-scope singletons — created once, reused by every mesh.

const std = (opts: THREE.MeshStandardMaterialParameters) =>
  new THREE.MeshStandardMaterial(opts);

const basic = (color: string, opts: Partial<THREE.MeshBasicMaterialParameters> = {}) =>
  new THREE.MeshBasicMaterial({ color, ...opts });

export const MAT = {
  // architecture
  wallPaint: std({ color: "#f5f7f9", roughness: 0.88 }),
  wallWarm: std({ color: "#eceef1", roughness: 0.88 }),
  baseboard: std({ color: "#b9c1cc", roughness: 0.4, metalness: 0.45 }),
  windowFrame: std({ color: "#aab3c0", roughness: 0.32, metalness: 0.55 }),
  glass: new THREE.MeshPhysicalMaterial({
    color: "#bfe0f2",
    roughness: 0.06,
    metalness: 0,
    transparent: true,
    opacity: 0.18,
    side: THREE.DoubleSide,
  }),
  glassMeeting: new THREE.MeshPhysicalMaterial({
    color: "#cfe8f6",
    roughness: 0.05,
    transparent: true,
    opacity: 0.13,
    side: THREE.DoubleSide,
  }),
  frost: new THREE.MeshPhysicalMaterial({
    color: "#e8f1f7",
    roughness: 0.4,
    transparent: true,
    opacity: 0.45,
    side: THREE.DoubleSide,
  }),

  // floors — pale porcelain family with a soft sheen
  floorCorridor: std({ color: "#e3e6ea", roughness: 0.5 }),
  floorEntrance: std({ color: "#eef1f4", roughness: 0.32, metalness: 0.05 }),
  floorWood: std({ color: "#e4e1da", roughness: 0.55 }),
  floorCarpet: std({ color: "#c6cfda", roughness: 0.95 }),
  floorMassing: std({ color: "#e0e3e7", roughness: 0.6 }),
  rug: std({ color: "#b7c3cd", roughness: 1 }),
  grass: std({ color: "#8fae7e", roughness: 1 }),

  // furniture — clean resin / matte metal modules
  resinWhite: std({ color: "#f4f5f6", roughness: 0.3 }),
  matteSilver: std({ color: "#c3c9d2", roughness: 0.3, metalness: 0.6 }),
  pearl: new THREE.MeshPhysicalMaterial({
    color: "#f7f9fb",
    roughness: 0.22,
    metalness: 0.12,
    clearcoat: 0.7,
    clearcoatRoughness: 0.35,
  }),
  brushed: std({ color: "#aeb8c4", roughness: 0.5, metalness: 0.85 }),
  coreGlow: basic("#dff2ff", {
    transparent: true,
    opacity: 0.16,
    toneMapped: false,
    depthWrite: false,
  }),
  woodTop: std({ color: "#d9bd94", roughness: 0.5 }),
  woodDark: std({ color: "#b3a07f", roughness: 0.55 }),
  metalLeg: std({ color: "#9aa2ad", roughness: 0.3, metalness: 0.7 }),
  charcoal: std({ color: "#31353d", roughness: 0.65 }),
  fabricGray: std({ color: "#9aa5b1", roughness: 1 }),
  fabricWarm: std({ color: "#bcc4ce", roughness: 1 }),
  fabricGreen: std({ color: "#8fc4ae", roughness: 1 }),
  white: std({ color: "#f5f6f7", roughness: 0.7 }),

  // screens & lights — the digital layer
  screenDark: std({
    color: "#101722",
    roughness: 0.25,
    emissive: "#2b4a66",
    emissiveIntensity: 0.85,
  }),
  screenGlow: std({
    color: "#d9edf7",
    emissive: "#a8dcf5",
    emissiveIntensity: 1.1,
    roughness: 0.35,
  }),
  pendant: std({
    color: "#eef8ff",
    emissive: "#cfeeff",
    emissiveIntensity: 1.8,
    roughness: 0.5,
  }),

  // neon accent strips (always-bright, unlit; toneMapped off so the
  // accent colors stay saturated instead of being lifted by ACES)
  neonCyan: basic("#3ec9f5", { toneMapped: false }),
  neonMint: basic("#46e0b4", { toneMapped: false }),
  neonPurple: basic("#a88cff", { toneMapped: false }),
  neonMagenta: basic("#f26bd8", { toneMapped: false }),
  neonWhite: basic("#dff2ff", { toneMapped: false }),
  holo: basic("#5fc9f7", {
    transparent: true,
    opacity: 0.2,
    side: THREE.DoubleSide,
    toneMapped: false,
  }),
  holoPurple: basic("#c39df5", {
    transparent: true,
    opacity: 0.22,
    side: THREE.DoubleSide,
    toneMapped: false,
  }),
  orbCyan: basic("#7fdcff", { transparent: true, opacity: 0.85, toneMapped: false }),
  orbMint: basic("#7deccb", { transparent: true, opacity: 0.85, toneMapped: false }),
  orbPurple: basic("#c0a6ff", { transparent: true, opacity: 0.85, toneMapped: false }),
  orbMagenta: basic("#f78ade", { transparent: true, opacity: 0.85, toneMapped: false }),

  // plants
  pot: std({ color: "#d7dce2", roughness: 0.55 }),
  potDark: std({ color: "#4a4f58", roughness: 0.9 }),
  trunk: std({ color: "#7a5f43", roughness: 0.9 }),
  leaf: std({ color: "#5d8f5f", roughness: 0.95 }),
  leafDark: std({ color: "#47734d", roughness: 0.95 }),

  skinTone: std({ color: "#e5c29c", roughness: 0.8 }),
} as const;

/** Canvas-texture text panel (no external font/CDN dependency). */
export function makeTextTexture(
  lines: Array<{ text: string; size: number; color: string; weight?: number }>,
  opts: {
    width?: number;
    height?: number;
    background?: string;
    /** vertical gradient end color — `background` fades into this */
    backgroundTo?: string;
    tracking?: number;
  } = {},
): THREE.CanvasTexture {
  const w = opts.width ?? 512;
  const h = opts.height ?? 256;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  if (opts.background) {
    if (opts.backgroundTo) {
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, opts.background);
      grad.addColorStop(1, opts.backgroundTo);
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = opts.background;
    }
    ctx.fillRect(0, 0, w, h);
  }
  const total = lines.reduce((acc, l) => acc + l.size * 1.35, 0);
  let y = (h - total) / 2;
  for (const line of lines) {
    ctx.font = `${line.weight ?? 700} ${line.size}px system-ui, sans-serif`;
    ctx.fillStyle = line.color;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    if (opts.tracking) {
      const chars = [...line.text];
      const widths = chars.map((c) => ctx.measureText(c).width);
      const tw = widths.reduce((a, b) => a + b, 0) + opts.tracking * (chars.length - 1);
      let x = (w - tw) / 2;
      ctx.textAlign = "left";
      chars.forEach((c, i) => {
        ctx.fillText(c, x, y);
        x += widths[i] + (opts.tracking ?? 0);
      });
      ctx.textAlign = "center";
    } else {
      ctx.fillText(line.text, w / 2, y);
    }
    y += line.size * 1.35;
  }
  const tex = new THREE.CanvasTexture(canvas);
  // Canvas 2D draws in sRGB; without declaring it, three treats the
  // pixels as linear and the authored darks wash out to pale gray.
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}
