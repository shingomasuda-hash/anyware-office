"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { LabSim } from "../LabSim";
import { MAT, makeTextTexture } from "./materials";
import { u } from "./scale";

// ENTRANCE = WORLD ARRIVAL HUB (STEP 4.9.2 Milestone A).
// Arrival axis: spawn (880,1100) → light lane → HERO CORE (above the
// reception module, west of the axis) → RING GATE (880,806) → district.
// Everything here is visual-layer only; collision stays in map.ts.

/* ── plaza floor ─────────────────────────────────────────────────────
 * The entrance floor is a designed plaza, not a flat slab: concentric
 * arrival rings, radial ticks and the glowing walk lane are baked into
 * one sRGB canvas texture (kills the "giant single-color plane"). */
export function usePlazaMaterial(): THREE.Material {
  return useMemo(() => {
    const S = 1024;
    const canvas = document.createElement("canvas");
    canvas.width = S;
    canvas.height = S;
    const ctx = canvas.getContext("2d")!;
    // base: soft cool gradient
    const bg = ctx.createLinearGradient(0, 0, 0, S);
    bg.addColorStop(0, "#eef3f8");
    bg.addColorStop(1, "#e2eaf2");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, S, S);
    // ENTRANCE bounds: x 680..1080 (→u), y 800..1184 (→v)
    const px = (wx: number) => ((wx - 680) / 400) * S;
    const py = (wy: number) => ((wy - 800) / 384) * S;
    const cx = px(880);
    const cy = py(1100); // spawn / arrival platform center
    // concentric arrival rings
    for (const [r, a, w] of [
      [90, 0.5, 5], [150, 0.32, 3], [230, 0.22, 3], [330, 0.14, 2], [450, 0.1, 2],
    ] as const) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(62, 201, 245, ${a})`;
      ctx.lineWidth = w;
      ctx.stroke();
    }
    // radial ticks
    for (let i = 0; i < 24; i++) {
      const ang = (i / 24) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(ang) * 170, cy + Math.sin(ang) * 170);
      ctx.lineTo(cx + Math.cos(ang) * 195, cy + Math.sin(ang) * 195);
      ctx.strokeStyle = "rgba(120, 150, 175, 0.35)";
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
    // subtle plaza grid
    ctx.strokeStyle = "rgba(150, 170, 190, 0.14)";
    ctx.lineWidth = 1.5;
    for (let g = 0; g <= S; g += 128) {
      ctx.beginPath(); ctx.moveTo(g, 0); ctx.lineTo(g, S); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, g); ctx.lineTo(S, g); ctx.stroke();
    }
    // glowing walk lane: spawn → gate (x=880 axis, northwards)
    const laneL = px(858);
    const laneR = px(902);
    const laneTop = py(806);
    const lane = ctx.createLinearGradient(0, laneTop, 0, cy);
    lane.addColorStop(0, "rgba(102, 216, 255, 0.34)");
    lane.addColorStop(1, "rgba(102, 216, 255, 0.10)");
    ctx.fillStyle = lane;
    ctx.fillRect(laneL, laneTop, laneR - laneL, cy - laneTop);
    for (const lx of [laneL, laneR]) {
      ctx.beginPath();
      ctx.moveTo(lx, laneTop);
      ctx.lineTo(lx, cy);
      ctx.strokeStyle = "rgba(62, 201, 245, 0.75)";
      ctx.lineWidth = 4;
      ctx.stroke();
    }
    // chevrons pointing to the gate
    ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
    ctx.lineWidth = 5;
    for (let i = 0; i < 4; i++) {
      const yy = cy - 90 - i * 120;
      ctx.beginPath();
      ctx.moveTo(cx - 26, yy + 18);
      ctx.lineTo(cx, yy);
      ctx.lineTo(cx + 26, yy + 18);
      ctx.stroke();
    }
    // faint halo under the hero core (west of axis, above reception)
    const hx = px(788);
    const hy = py(956);
    const halo = ctx.createRadialGradient(hx, hy, 20, hx, hy, 240);
    halo.addColorStop(0, "rgba(140, 220, 255, 0.30)");
    halo.addColorStop(1, "rgba(140, 220, 255, 0)");
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, S, S);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.42, metalness: 0.05 });
  }, []);
}

/* ── hero landmark ──────────────────────────────────────────────────
 * The AnyWare Data Core: a slow twin-ring gyroscope with a pearl core,
 * orbiting light motes and a soft light shaft, floating high above the
 * reception module. One glance = "this is AnyWare's world". */
export function HeroCore() {
  const rings = useRef<THREE.Group>(null);
  const orbiters = useRef<THREE.InstancedMesh>(null);
  const shaftMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#bfe9ff",
        transparent: true,
        opacity: 0.07,
        toneMapped: false,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    [],
  );
  const letters = useMemo(
    () =>
      makeTextTexture(
        [{ text: "A N Y W A R E", size: 108, color: "#ffffff", weight: 800 }],
        { width: 1024, height: 152, tracking: 6 },
      ),
    [],
  );
  const lettersMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: letters,
        transparent: true,
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    [letters],
  );
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const x = u(788);
  const z = u(956);
  const coreY = 3.9;
  useFrame(() => {
    const t = performance.now() / 1000;
    const g = rings.current;
    if (g) {
      g.rotation.y = t * 0.35;
      g.children[0].rotation.x = 1.05 + Math.sin(t * 0.4) * 0.12;
      g.children[1].rotation.x = -0.65 + Math.cos(t * 0.33) * 0.15;
      g.position.y = coreY + Math.sin(t * 0.7) * 0.1;
    }
    const inst = orbiters.current;
    if (inst) {
      for (let i = 0; i < 6; i++) {
        const a = t * 0.5 + (i * Math.PI) / 3;
        dummy.position.set(
          x + Math.cos(a) * 2.1,
          coreY + Math.sin(t * 0.9 + i * 1.3) * 0.55,
          z + Math.sin(a) * 2.1,
        );
        const s = 0.09 + (i % 3) * 0.03;
        dummy.scale.setScalar(s);
        dummy.updateMatrix();
        inst.setMatrixAt(i, dummy.matrix);
      }
      inst.instanceMatrix.needsUpdate = true;
    }
  });
  return (
    <group>
      <group ref={rings} position={[x, coreY, z]}>
        <mesh material={MAT.neonWhite} rotation-x={1.05}>
          <torusGeometry args={[1.7, 0.05, 10, 64]} />
        </mesh>
        <mesh material={MAT.neonCyan} rotation-x={-0.65}>
          <torusGeometry args={[1.2, 0.04, 10, 56]} />
        </mesh>
        {/* pearl core + inner glow */}
        <mesh material={MAT.pearl} castShadow>
          <sphereGeometry args={[0.52, 24, 18]} />
        </mesh>
        <mesh material={MAT.coreGlow}>
          <sphereGeometry args={[0.68, 18, 14]} />
        </mesh>
      </group>
      {/* orbiting light motes */}
      <instancedMesh ref={orbiters} args={[undefined, undefined, 6]} material={MAT.neonCyan}>
        <sphereGeometry args={[1, 10, 8]} />
      </instancedMesh>
      {/* brand letters floating under the core */}
      <mesh material={lettersMat} position={[x, 2.5, z]}>
        <planeGeometry args={[3.4, 0.5]} />
      </mesh>
      {/* soft light shaft down to the reception module */}
      <mesh material={shaftMat} position={[x, 2.15, z]}>
        <cylinderGeometry args={[0.5, 0.85, 3.1, 20, 1, true]} />
      </mesh>
    </group>
  );
}

/* ── ring gate ──────────────────────────────────────────────────────
 * A standing double light-ring over the corridor doorway; the walk
 * lane runs straight through it. Layered digital sign floats above. */
export function RingGate({ sim }: { sim: LabSim }) {
  const group = useRef<THREE.Group>(null);
  const pulse = useRef<THREE.MeshBasicMaterial>(null);
  const xU = 880;
  const zU = 806;
  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const occludes =
      zU > sim.avatar.y + 8 && zU < sim.avatar.y + 230 && Math.abs(xU - sim.avatar.x) < 340;
    g.visible = !occludes;
    if (pulse.current) {
      pulse.current.opacity = 0.5 + Math.sin(performance.now() / 900) * 0.22;
    }
  });
  const x = u(xU);
  const z = u(zU);
  const sign = useMemo(
    () =>
      makeTextTexture(
        [
          { text: "ENTRANCE", size: 92, color: "#d9f2ff", weight: 800 },
          { text: "ANYWARE WORLD · ARRIVAL", size: 30, color: "#7fa8c8", weight: 600 },
        ],
        { width: 768, height: 220, background: "#0b1524", backgroundTo: "#14304e", tracking: 8 },
      ),
    [],
  );
  const signMat = useMemo(
    () => new THREE.MeshBasicMaterial({ map: sign, toneMapped: false }),
    [sign],
  );
  return (
    <group ref={group}>
      {/* main standing ring pair, walkable through */}
      <mesh material={MAT.neonCyan} position={[x, 1.62, z]}>
        <torusGeometry args={[1.62, 0.075, 12, 64]} />
      </mesh>
      <mesh position={[x, 1.62, z]}>
        <torusGeometry args={[1.86, 0.028, 8, 64]} />
        <meshBasicMaterial ref={pulse} color="#dff4ff" transparent opacity={0.6} toneMapped={false} />
      </mesh>
      {/* floor anchors */}
      {[-1.62, 1.62].map((ox) => (
        <group key={ox} position={[x + ox, 0, z]}>
          <mesh material={MAT.pearl} position={[0, 0.26, 0]} castShadow>
            <cylinderGeometry args={[0.09, 0.13, 0.52, 12]} />
          </mesh>
          <mesh material={MAT.neonCyan} position={[0, 0.53, 0]}>
            <cylinderGeometry args={[0.065, 0.065, 0.025, 12]} />
          </mesh>
        </group>
      ))}
      {/* layered digital sign above the ring */}
      <group position={[x, 3.75, z]}>
        <mesh material={MAT.holo} position={[0, 0, -0.06]}>
          <planeGeometry args={[3.3, 1.12]} />
        </mesh>
        <mesh material={signMat}>
          <planeGeometry args={[2.9, 0.83]} />
        </mesh>
        <mesh material={MAT.neonCyan} position={[0, -0.5, 0.02]}>
          <boxGeometry args={[2.9, 0.02, 0.02]} />
        </mesh>
        <mesh material={MAT.neonWhite} position={[0, 0.48, 0.02]}>
          <boxGeometry args={[1.7, 0.014, 0.014]} />
        </mesh>
      </group>
    </group>
  );
}

/* ── arrival platform at the real spawn point (880,1100) ─────────── */
export function ArrivalPlatform() {
  const pillarMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#cdeeff",
        transparent: true,
        opacity: 0.06,
        toneMapped: false,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    [],
  );
  const ring = useRef<THREE.MeshBasicMaterial>(null);
  useFrame(() => {
    if (ring.current) ring.current.opacity = 0.65 + Math.sin(performance.now() / 800) * 0.25;
  });
  const x = u(880);
  const z = u(1100);
  return (
    <group position={[x, 0, z]}>
      <mesh material={MAT.frost} rotation-x={-Math.PI / 2} position={[0, 0.022, 0]}>
        <circleGeometry args={[1.05, 40]} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.03, 0]}>
        <ringGeometry args={[0.98, 1.06, 40]} />
        <meshBasicMaterial ref={ring} color="#5fd4ff" transparent opacity={0.8} toneMapped={false} />
      </mesh>
      <mesh material={MAT.neonWhite} rotation-x={-Math.PI / 2} position={[0, 0.028, 0]}>
        <ringGeometry args={[0.62, 0.665, 36]} />
      </mesh>
      {/* soft light pillar */}
      <mesh material={pillarMat} position={[0, 1.5, 0]}>
        <cylinderGeometry args={[0.85, 1.0, 3.0, 24, 1, true]} />
      </mesh>
    </group>
  );
}

/* ── floating fascia band around the ENTRANCE perimeter ─────────────
 * A clean white band hovering above the wall tops with cyan underglow:
 * intentional open-air architecture instead of roofless boxes. The
 * south edge carries no band (the camera lives there), and the north
 * band joins the dollhouse occlusion so it never blocks the view. */
export function EntranceFascia({ sim }: { sim: LabSim }) {
  const y = 3.0;
  const t = 0.34; // band height
  const d = 0.22; // band depth
  const west = u(680) + 0.1;
  const east = u(1080) - 0.1;
  const north = u(800) + 0.1;
  const south = u(1184) - 0.1;
  const cx = (west + east) / 2;
  const cz = (north + south) / 2;
  const wLen = east - west;
  const dLen = south - north;
  const northRef = useRef<THREE.Group>(null);
  useFrame(() => {
    const g = northRef.current;
    if (!g) return;
    const occludes =
      800 > sim.avatar.y + 8 && 800 < sim.avatar.y + 230 &&
      Math.abs(880 - sim.avatar.x) < 500;
    g.visible = !occludes;
  });
  const band = (p: readonly [number, number, number], s: readonly [number, number, number]) => (
    <>
      <mesh material={MAT.pearl} position={[p[0], p[1], p[2]]} castShadow>
        <boxGeometry args={[s[0], s[1], s[2]]} />
      </mesh>
      <mesh material={MAT.neonCyan} position={[p[0], p[1] - t / 2 - 0.015, p[2]]}>
        <boxGeometry args={[s[0] * 0.995, 0.018, s[2] * 0.995]} />
      </mesh>
    </>
  );
  return (
    <group>
      <group ref={northRef}>{band([cx, y, north], [wLen, t, d])}</group>
      {band([west, y, cz], [d, t, dLen])}
      {band([east, y, cz], [d, t, dLen])}
    </group>
  );
}

/* ── holographic guidance panel beside the walk lane ──────────────── */
export function HoloGreeting() {
  const tex = useMemo(
    () =>
      makeTextTexture(
        [
          { text: "WELCOME", size: 74, color: "#eaf7ff", weight: 800 },
          { text: "AnyWare WORLD", size: 46, color: "#6fe9c8", weight: 700 },
          { text: "世の中をアップデートする。", size: 28, color: "#9db4d4", weight: 500 },
        ],
        { width: 640, height: 320, background: "#0c1626", backgroundTo: "#1a3350", tracking: 4 },
      ),
    [],
  );
  const mat = useMemo(
    () => new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }),
    [tex],
  );
  const g = useRef<THREE.Group>(null);
  useFrame(() => {
    if (g.current) g.current.position.y = 1.55 + Math.sin(performance.now() / 1600) * 0.05;
  });
  const x = u(972);
  const z = u(1052);
  return (
    <group ref={g} position={[x, 1.55, z]} rotation-y={-0.5}>
      <mesh material={MAT.holo} position={[0, 0, -0.05]}>
        <planeGeometry args={[1.9, 1.06]} />
      </mesh>
      <mesh material={mat}>
        <planeGeometry args={[1.66, 0.83]} />
      </mesh>
      <mesh material={MAT.neonMint} position={[0, -0.47, 0.02]}>
        <boxGeometry args={[1.66, 0.016, 0.016]} />
      </mesh>
      {/* slim floor stem so the hologram reads as projected */}
      <mesh material={MAT.brushed} position={[0, -0.83, 0]}>
        <cylinderGeometry args={[0.028, 0.05, 1.44, 8]} />
      </mesh>
    </group>
  );
}
