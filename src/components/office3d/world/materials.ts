import * as THREE from "three";

// Shared material palette (§8 material direction: white / warm gray /
// natural wood / glass / green / charcoal). Module-scope singletons —
// created once, reused by every mesh, disposed never (they live for the
// lab session; the renderer itself is disposed by R3F on unmount).

const std = (opts: THREE.MeshStandardMaterialParameters) =>
  new THREE.MeshStandardMaterial(opts);

export const MAT = {
  // architecture
  wallPaint: std({ color: "#f4f2ee", roughness: 0.92 }),
  wallWarm: std({ color: "#e9e4da", roughness: 0.92 }),
  baseboard: std({ color: "#3a3d42", roughness: 0.6 }),
  windowFrame: std({ color: "#3a3d42", roughness: 0.45, metalness: 0.4 }),
  glass: new THREE.MeshPhysicalMaterial({
    color: "#cfe0e8",
    roughness: 0.08,
    metalness: 0,
    transparent: true,
    opacity: 0.22,
    side: THREE.DoubleSide,
  }),
  glassMeeting: new THREE.MeshPhysicalMaterial({
    color: "#d7e6ea",
    roughness: 0.06,
    transparent: true,
    opacity: 0.16,
    side: THREE.DoubleSide,
  }),

  // floors
  floorCorridor: std({ color: "#dcd7cd", roughness: 0.85 }),
  floorEntrance: std({ color: "#cbc2b2", roughness: 0.7 }),
  floorWood: std({ color: "#b98f5f", roughness: 0.55 }),
  floorCarpet: std({ color: "#9aa4a8", roughness: 1 }),
  floorMassing: std({ color: "#d5d2ca", roughness: 0.9 }),
  rug: std({ color: "#7f8b8f", roughness: 1 }),
  grass: std({ color: "#8fae7e", roughness: 1 }),

  // furniture
  woodTop: std({ color: "#c69a66", roughness: 0.45 }),
  woodDark: std({ color: "#8a6a48", roughness: 0.5 }),
  metalLeg: std({ color: "#6f7378", roughness: 0.35, metalness: 0.7 }),
  charcoal: std({ color: "#34373c", roughness: 0.7 }),
  fabricGray: std({ color: "#8d9297", roughness: 1 }),
  fabricWarm: std({ color: "#b9aa96", roughness: 1 }),
  fabricGreen: std({ color: "#7c9a7a", roughness: 1 }),
  white: std({ color: "#f5f5f2", roughness: 0.8 }),

  // screens & lights
  screenDark: std({
    color: "#15181d",
    roughness: 0.3,
    emissive: "#26313d",
    emissiveIntensity: 0.55,
  }),
  screenGlow: std({
    color: "#dfe8ee",
    emissive: "#cfdde8",
    emissiveIntensity: 0.9,
    roughness: 0.4,
  }),
  pendant: std({
    color: "#f7efd9",
    emissive: "#ffe9b8",
    emissiveIntensity: 1.6,
    roughness: 0.6,
  }),

  // plants
  pot: std({ color: "#b0a291", roughness: 0.9 }),
  potDark: std({ color: "#4a4d52", roughness: 0.9 }),
  trunk: std({ color: "#7a5f43", roughness: 0.9 }),
  leaf: std({ color: "#5d8f5f", roughness: 0.95 }),
  leafDark: std({ color: "#47734d", roughness: 0.95 }),

  skinTone: std({ color: "#e5c29c", roughness: 0.8 }),
} as const;

/** Canvas-texture text panel (no external font/CDN dependency). */
export function makeTextTexture(
  lines: Array<{ text: string; size: number; color: string; weight?: number }>,
  opts: { width?: number; height?: number; background?: string; tracking?: number } = {},
): THREE.CanvasTexture {
  const w = opts.width ?? 512;
  const h = opts.height ?? 256;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  if (opts.background) {
    ctx.fillStyle = opts.background;
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
  tex.anisotropy = 4;
  return tex;
}
