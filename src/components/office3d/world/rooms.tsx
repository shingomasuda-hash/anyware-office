"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { AREA_BY_ID } from "@/lib/game/map";
import type { AreaId } from "@/types/office";
import { MAT, makeTextTexture } from "./materials";
import { u } from "./scale";
import { TwoSidedSign } from "./effects";
import { OfficeChair } from "./Furniture";

// Per-room world building (STEP 4.9.3). Every district in the hall gets
// its own atmosphere — floor treatment, accent color, signature volumes
// — so walking between rooms feels like moving through neighbourhoods of
// one metaverse campus rather than repeating gray boxes.

/** Room identity: the accent that lights the space and paints the floor. */
export interface RoomTheme {
  /** floor tint */
  floor: string;
  /** accent used by light rails, holo props and glow */
  accent: string;
  /** soft ambient fill color for the room's key light */
  light: string;
  /** how the floor pattern is drawn */
  pattern: "grid" | "rings" | "rows" | "hex" | "waves" | "scatter";
}

export const ROOM_THEMES: Record<AreaId, RoomTheme> = {
  ENTRANCE: { floor: "#eef2f6", accent: "#3ec9f5", light: "#fff3e4", pattern: "rings" },
  STAFF: { floor: "#e7ebe6", accent: "#46e0b4", light: "#eaf7f1", pattern: "scatter" },
  SIGNAL: { floor: "#efe9f4", accent: "#f26bd8", light: "#f7e6fb", pattern: "waves" },
  PARTNER: { floor: "#eaeaf6", accent: "#a88cff", light: "#eeeaff", pattern: "hex" },
  TABLE: { floor: "#f4ede2", accent: "#ffab6b", light: "#fff0dd", pattern: "rows" },
  GREEN: { floor: "#e6f0e4", accent: "#7ada6a", light: "#eafbe6", pattern: "rows" },
  LOCAL: { floor: "#eef0e8", accent: "#ffd166", light: "#fff6e0", pattern: "grid" },
  MEETING: { floor: "#e8eaf3", accent: "#a88cff", light: "#ece9fb", pattern: "rings" },
  AI: { floor: "#e6eef6", accent: "#59b8ff", light: "#e6f2ff", pattern: "hex" },
  ADMIN: { floor: "#ecedef", accent: "#9aa7b6", light: "#f2f4f7", pattern: "grid" },
};

/** Floor material per room: tinted base + its own drawn pattern. */
export function useRoomFloor(area: AreaId): THREE.Material {
  return useMemo(() => {
    const theme = ROOM_THEMES[area];
    const N = 512;
    const c = document.createElement("canvas");
    c.width = N;
    c.height = N;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = theme.floor;
    ctx.fillRect(0, 0, N, N);
    ctx.strokeStyle = theme.accent;
    ctx.globalAlpha = 0.16;
    ctx.lineWidth = 2;
    switch (theme.pattern) {
      case "grid":
        for (let g = 0; g <= N; g += 64) {
          ctx.beginPath(); ctx.moveTo(g, 0); ctx.lineTo(g, N); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(0, g); ctx.lineTo(N, g); ctx.stroke();
        }
        break;
      case "rings":
        for (let r = 40; r < N; r += 52) {
          ctx.beginPath();
          ctx.arc(N / 2, N / 2, r, 0, Math.PI * 2);
          ctx.stroke();
        }
        break;
      case "rows":
        ctx.lineWidth = 6;
        for (let y = 32; y < N; y += 74) {
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(N, y); ctx.stroke();
        }
        break;
      case "waves":
        ctx.lineWidth = 3;
        for (let y = 24; y < N; y += 46) {
          ctx.beginPath();
          for (let x = 0; x <= N; x += 8) {
            const yy = y + Math.sin((x / N) * Math.PI * 4) * 12;
            if (x === 0) ctx.moveTo(x, yy);
            else ctx.lineTo(x, yy);
          }
          ctx.stroke();
        }
        break;
      case "hex":
        ctx.lineWidth = 2.5;
        for (let row = 0; row < 9; row++) {
          for (let col = 0; col < 9; col++) {
            const cx = col * 60 + (row % 2 ? 30 : 0);
            const cy = row * 52;
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
              const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
              const px = cx + Math.cos(a) * 26;
              const py = cy + Math.sin(a) * 26;
              if (i === 0) ctx.moveTo(px, py);
              else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.stroke();
          }
        }
        break;
      case "scatter": {
        let seed = 11;
        const rand = () => {
          seed = (seed * 1664525 + 1013904223) >>> 0;
          return seed / 0xffffffff;
        };
        ctx.globalAlpha = 0.2;
        for (let i = 0; i < 90; i++) {
          ctx.fillStyle = theme.accent;
          ctx.beginPath();
          ctx.arc(rand() * N, rand() * N, 2 + rand() * 5, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
    }
    ctx.globalAlpha = 1;
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 4);
    tex.anisotropy = 8;
    return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55, metalness: 0.04 });
  }, [area]);
}

/** Slowly rotating holo emblem — each room's landmark object. */
function RoomEmblem({
  area,
  x,
  z,
  y = 4.2,
}: {
  area: AreaId;
  x: number;
  z: number;
  y?: number;
}) {
  const theme = ROOM_THEMES[area];
  const group = useRef<THREE.Group>(null);
  const mat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: theme.accent,
        transparent: true,
        opacity: 0.5,
        toneMapped: false,
      }),
    [theme.accent],
  );
  const solid = useMemo(
    () => new THREE.MeshBasicMaterial({ color: theme.accent, toneMapped: false }),
    [theme.accent],
  );
  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const t = performance.now() / 1000;
    g.rotation.y = t * 0.24;
    g.position.y = y + Math.sin(t * 0.5) * 0.18;
  });
  // Each district gets a different emblem silhouette.
  const shape = () => {
    switch (area) {
      case "SIGNAL": // broadcast rings
        return (
          <>
            <mesh material={mat} rotation-x={Math.PI / 2}>
              <torusGeometry args={[1.9, 0.07, 8, 40]} />
            </mesh>
            <mesh material={mat} rotation-x={Math.PI / 2}>
              <torusGeometry args={[1.25, 0.06, 8, 36]} />
            </mesh>
            <mesh material={solid}>
              <sphereGeometry args={[0.3, 14, 12]} />
            </mesh>
          </>
        );
      case "PARTNER": // two linked rings
        return (
          <>
            <mesh material={mat} position={[-0.7, 0, 0]} rotation-y={0.4}>
              <torusGeometry args={[1.1, 0.07, 8, 36]} />
            </mesh>
            <mesh material={mat} position={[0.7, 0, 0]} rotation-y={-0.4}>
              <torusGeometry args={[1.1, 0.07, 8, 36]} />
            </mesh>
          </>
        );
      case "GREEN": // stacked growth discs
        return (
          <>
            {[0, 0.5, 1.0].map((dy, i) => (
              <mesh key={dy} material={mat} position={[0, dy, 0]} rotation-x={Math.PI / 2}>
                <torusGeometry args={[1.6 - i * 0.45, 0.06, 8, 32]} />
              </mesh>
            ))}
          </>
        );
      case "TABLE": // dome over a disc
        return (
          <>
            <mesh material={mat}>
              <sphereGeometry args={[1.2, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
            </mesh>
            <mesh material={solid} position={[0, -0.1, 0]} rotation-x={Math.PI / 2}>
              <torusGeometry args={[1.35, 0.06, 8, 32]} />
            </mesh>
          </>
        );
      case "LOCAL": // map pin cluster
        return (
          <>
            {[[-0.9, 0], [0.9, 0.4], [0, -0.9]].map(([px, pz], i) => (
              <mesh key={i} material={i === 0 ? solid : mat} position={[px, 0, pz]}>
                <coneGeometry args={[0.32, 0.9, 10]} />
              </mesh>
            ))}
          </>
        );
      case "AI": // orbiting nodes
        return (
          <>
            <mesh material={solid}>
              <icosahedronGeometry args={[0.75, 1]} />
            </mesh>
            <mesh material={mat} rotation-x={0.9}>
              <torusGeometry args={[1.7, 0.05, 8, 40]} />
            </mesh>
            <mesh material={mat} rotation-x={-0.9} rotation-z={0.6}>
              <torusGeometry args={[1.7, 0.05, 8, 40]} />
            </mesh>
          </>
        );
      case "ADMIN": // steady cube frame
        return (
          <>
            <mesh material={mat}>
              <boxGeometry args={[1.7, 1.7, 1.7]} />
            </mesh>
            <mesh material={solid} scale={0.35}>
              <boxGeometry args={[1.7, 1.7, 1.7]} />
            </mesh>
          </>
        );
      case "STAFF": // interlocking people-arcs
        return (
          <>
            {[0, 1, 2].map((i) => (
              <mesh
                key={i}
                material={mat}
                rotation-y={(i / 3) * Math.PI * 2}
                position={[Math.cos((i / 3) * Math.PI * 2) * 0.7, 0, Math.sin((i / 3) * Math.PI * 2) * 0.7]}
              >
                <torusGeometry args={[0.75, 0.07, 8, 28]} />
              </mesh>
            ))}
          </>
        );
      default: // MEETING and ENTRANCE keep their bespoke landmarks
        return (
          <mesh material={mat} rotation-x={Math.PI / 2}>
            <torusGeometry args={[1.6, 0.07, 8, 36]} />
          </mesh>
        );
    }
  };
  return (
    <group ref={group} position={[x, y, z]}>
      {shape()}
    </group>
  );
}

/** Wall banner naming the district, hung high on its north wall. */
function RoomBanner({ area, x, z }: { area: AreaId; x: number; z: number }) {
  const meta = AREA_BY_ID[area];
  const theme = ROOM_THEMES[area];
  const tex = useMemo(
    () =>
      makeTextTexture(
        [
          { text: meta.label, size: 128, color: "#f4fbff", weight: 800 },
          { text: meta.subtitle, size: 34, color: theme.accent, weight: 600 },
        ],
        { width: 1024, height: 320, background: "#0d1524", backgroundTo: "#1b2a44", tracking: 8 },
      ),
    [meta.label, meta.subtitle, theme.accent],
  );
  return <TwoSidedSign texture={tex} width={6.4} height={2.0} position={[x, 3.6, z]} />;
}

/**
 * Themed props filling the enlarged district floor. Positions are
 * fractions of the room bounds, so every room stays populated at any
 * world scale. Shapes are deliberately simple volumes — the character
 * comes from the arrangement and the room's accent color.
 */
function RoomProps({
  area,
  bounds,
}: {
  area: AreaId;
  bounds: { x: number; y: number; w: number; h: number };
}) {
  const theme = ROOM_THEMES[area];
  const accent = useMemo(
    () => new THREE.MeshBasicMaterial({ color: theme.accent, toneMapped: false }),
    [theme.accent],
  );
  const at = (fx: number, fy: number): [number, number, number] => [
    u(bounds.x + bounds.w * fx),
    0,
    u(bounds.y + bounds.h * fy),
  ];

  /** Desk pod: white slab + screen + accent light line. */
  const Pod = ({ p, r = 0 }: { p: [number, number, number]; r?: number }) => (
    <group position={p} rotation-y={r}>
      <mesh material={MAT.resinWhite} position={[0, 0.72, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.0, 0.07, 0.95]} />
      </mesh>
      {[-0.9, 0.9].map((lx) => (
        <mesh key={lx} material={MAT.matteSilver} position={[lx, 0.36, 0]}>
          <boxGeometry args={[0.08, 0.72, 0.8]} />
        </mesh>
      ))}
      <mesh material={MAT.screenDark} position={[0, 1.05, -0.32]}>
        <boxGeometry args={[0.9, 0.55, 0.05]} />
      </mesh>
      <mesh material={accent} position={[0, 0.67, 0.5]}>
        <boxGeometry args={[1.8, 0.03, 0.03]} />
      </mesh>
      <OfficeChair position={[0, 0, 0.95]} rotationY={Math.PI} />
    </group>
  );

  /** Planting bed for the agriculture district. */
  const Bed = ({ p }: { p: [number, number, number] }) => (
    <group position={p}>
      <mesh material={MAT.pearl} position={[0, 0.3, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.2, 0.6, 1.1]} />
      </mesh>
      <mesh material={MAT.leaf} position={[0, 0.72, 0]}>
        <boxGeometry args={[3.0, 0.3, 0.9]} />
      </mesh>
      <mesh material={accent} position={[0, 0.62, 0.57]}>
        <boxGeometry args={[3.0, 0.03, 0.03]} />
      </mesh>
    </group>
  );

  /** Standing display totem used by the media-facing districts. */
  const Totem = ({ p, r = 0 }: { p: [number, number, number]; r?: number }) => (
    <group position={p} rotation-y={r}>
      <mesh material={MAT.brushed} position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.5, 0.6, 0.2, 16]} />
      </mesh>
      <mesh material={MAT.screenDark} position={[0, 1.5, 0]} castShadow>
        <boxGeometry args={[1.4, 2.4, 0.12]} />
      </mesh>
      <mesh material={accent} position={[0, 0.28, 0.08]}>
        <boxGeometry args={[1.2, 0.04, 0.04]} />
      </mesh>
    </group>
  );

  /** Round table cluster for hospitality / community rooms. */
  const RoundTable = ({ p }: { p: [number, number, number] }) => (
    <group position={p}>
      <mesh material={MAT.resinWhite} position={[0, 0.74, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.85, 0.85, 0.07, 20]} />
      </mesh>
      <mesh material={MAT.matteSilver} position={[0, 0.37, 0]}>
        <cylinderGeometry args={[0.1, 0.16, 0.74, 12]} />
      </mesh>
      {[0, 1, 2, 3].map((i) => {
        const a = (i / 4) * Math.PI * 2;
        return (
          <OfficeChair
            key={i}
            position={[Math.cos(a) * 1.35, 0, Math.sin(a) * 1.35]}
            rotationY={-a + Math.PI / 2}
            seatMat={MAT.white}
          />
        );
      })}
    </group>
  );

  switch (area) {
    case "STAFF":
      return (
        <group>
          <Pod p={at(0.28, 0.3)} />
          <Pod p={at(0.68, 0.3)} />
          <Pod p={at(0.28, 0.58)} />
          <Pod p={at(0.68, 0.58)} />
          <RoundTable p={at(0.5, 0.82)} />
          <Totem p={at(0.9, 0.72)} r={-Math.PI / 2} />
        </group>
      );
    case "SIGNAL":
      return (
        <group>
          <Totem p={at(0.22, 0.24)} />
          <Totem p={at(0.5, 0.2)} />
          <Totem p={at(0.78, 0.24)} />
          <Pod p={at(0.32, 0.6)} />
          <Pod p={at(0.68, 0.6)} />
          <RoundTable p={at(0.5, 0.85)} />
        </group>
      );
    case "PARTNER":
      return (
        <group>
          <RoundTable p={at(0.3, 0.32)} />
          <RoundTable p={at(0.7, 0.32)} />
          <RoundTable p={at(0.5, 0.66)} />
          <Totem p={at(0.12, 0.5)} r={Math.PI / 2} />
          <Totem p={at(0.88, 0.5)} r={-Math.PI / 2} />
        </group>
      );
    case "TABLE":
      return (
        <group>
          <RoundTable p={at(0.26, 0.3)} />
          <RoundTable p={at(0.62, 0.28)} />
          <RoundTable p={at(0.34, 0.66)} />
          <RoundTable p={at(0.72, 0.68)} />
          <Pod p={at(0.5, 0.9)} />
        </group>
      );
    case "GREEN":
      return (
        <group>
          <Bed p={at(0.3, 0.28)} />
          <Bed p={at(0.7, 0.28)} />
          <Bed p={at(0.3, 0.52)} />
          <Bed p={at(0.7, 0.52)} />
          <Bed p={at(0.5, 0.78)} />
        </group>
      );
    case "LOCAL":
      return (
        <group>
          <RoundTable p={at(0.32, 0.34)} />
          <Pod p={at(0.7, 0.32)} />
          <Totem p={at(0.5, 0.14)} />
          <RoundTable p={at(0.6, 0.72)} />
          <Pod p={at(0.24, 0.68)} />
        </group>
      );
    case "AI":
      return (
        <group>
          <Totem p={at(0.24, 0.22)} />
          <Totem p={at(0.76, 0.22)} />
          <Pod p={at(0.3, 0.56)} />
          <Pod p={at(0.7, 0.56)} />
          <Pod p={at(0.5, 0.84)} />
        </group>
      );
    case "ADMIN":
      return (
        <group>
          <Pod p={at(0.3, 0.28)} />
          <Pod p={at(0.7, 0.28)} />
          <Pod p={at(0.3, 0.62)} />
          <Pod p={at(0.7, 0.62)} />
          <Totem p={at(0.5, 0.12)} />
        </group>
      );
    default:
      return null;
  }
}

/**
 * Everything that gives a district its character beyond the floor: a
 * floating emblem, a wall banner, themed props and a perimeter light
 * rail in the room's accent color.
 */
export function RoomIdentity({
  area,
  bounds,
}: {
  area: AreaId;
  bounds: { x: number; y: number; w: number; h: number };
}) {
  const theme = ROOM_THEMES[area];
  const rail = useMemo(
    () => new THREE.MeshBasicMaterial({ color: theme.accent, toneMapped: false }),
    [theme.accent],
  );
  const cx = u(bounds.x + bounds.w / 2);
  const cz = u(bounds.y + bounds.h / 2);
  const w = u(bounds.w);
  const d = u(bounds.h);
  return (
    <group>
      <RoomEmblem area={area} x={cx} z={cz} y={4.6} />
      <RoomBanner area={area} x={cx} z={u(bounds.y) + 0.35} />
      <RoomProps area={area} bounds={bounds} />
      {/* perimeter light rail just above the baseboard */}
      {[
        { p: [cx, 0.62, u(bounds.y) + 0.3] as const, s: [w - 1.2, 0.06, 0.06] as const },
        { p: [cx, 0.62, u(bounds.y + bounds.h) - 0.3] as const, s: [w - 1.2, 0.06, 0.06] as const },
        { p: [u(bounds.x) + 0.3, 0.62, cz] as const, s: [0.06, 0.06, d - 1.2] as const },
        { p: [u(bounds.x + bounds.w) - 0.3, 0.62, cz] as const, s: [0.06, 0.06, d - 1.2] as const },
      ].map((r, i) => (
        <mesh key={i} material={rail} position={[r.p[0], r.p[1], r.p[2]]}>
          <boxGeometry args={[r.s[0], r.s[1], r.s[2]]} />
        </mesh>
      ))}
    </group>
  );
}
