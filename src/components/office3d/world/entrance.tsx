"use client";

import { useMemo, useRef, useState } from "react";
import { Html } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { LabSim } from "../LabSim";
import { AREA_BY_ID } from "@/lib/game/map";
import type { AreaId } from "@/types/office";
import { MAT, makeTextTexture } from "./materials";
import { TwoSidedSign } from "./effects";
import { cameraWorldUnits, segmentHitsRect } from "./occlusion";
import { u } from "./scale";

// ENTRANCE = WORLD ARRIVAL HUB (STEP 4.9.2 Milestone A.1 — FUTURE
// IMMERSION PASS). Direction: Premium Office 60 / Near Future 30 /
// Metaverse 10 — architecture, material and light carry the future
// feel; cyan is reserved for information, connection and guidance.
// Arrival axis: spawn (880,1100) → light lane → DATA CORE (west of
// the axis) → RING GATE (880,806) → district.

/** Fine terrazzo grain, tiled across the plaza for close-up detail. */
function grainCanvas(): HTMLCanvasElement {
  const N = 256;
  const c = document.createElement("canvas");
  c.width = N;
  c.height = N;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#cfd6de";
  ctx.fillRect(0, 0, N, N);
  let seed = 7;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0xffffffff;
  };
  for (let i = 0; i < 900; i++) {
    const g = 190 + Math.floor(rand() * 60);
    ctx.fillStyle = `rgb(${g},${g},${g})`;
    ctx.beginPath();
    ctx.arc(rand() * N, rand() * N, 0.7 + rand() * 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
  return c;
}

/* ── plaza floor: pearl terrazzo with embedded guidance ───────────── */
export function usePlazaMaterial(): THREE.Material {
  return useMemo(() => {
    const S = 1024;
    const canvas = document.createElement("canvas");
    canvas.width = S;
    canvas.height = S;
    const ctx = canvas.getContext("2d")!;
    const bg = ctx.createLinearGradient(0, 0, 0, S);
    bg.addColorStop(0, "#eef2f6");
    bg.addColorStop(1, "#e4eaf1");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, S, S);
    // pearl terrazzo flecks (deterministic LCG)
    let seed = 42;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 0xffffffff;
    };
    const fleckColors = [
      "rgba(197, 206, 216, 0.55)",
      "rgba(176, 189, 202, 0.4)",
      "rgba(226, 231, 238, 0.7)",
      "rgba(154, 189, 214, 0.28)",
    ];
    for (let i = 0; i < 700; i++) {
      ctx.fillStyle = fleckColors[i % fleckColors.length];
      const r = 0.8 + rand() * 1.9;
      ctx.beginPath();
      ctx.arc(rand() * S, rand() * S, r, 0, Math.PI * 2);
      ctx.fill();
    }
    // ENTRANCE bounds: x 680..1080 (→u), y 800..1184 (→v)
    const px = (wx: number) => ((wx - 680) / 400) * S;
    const py = (wy: number) => ((wy - 800) / 384) * S;
    const cx = px(880);
    const cy = py(1100); // spawn / arrival platform center
    for (const [r, a, w] of [
      [90, 0.4, 5], [150, 0.26, 3], [230, 0.18, 3], [330, 0.12, 2], [450, 0.08, 2],
    ] as const) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(62, 201, 245, ${a})`;
      ctx.lineWidth = w;
      ctx.stroke();
    }
    for (let i = 0; i < 24; i++) {
      const ang = (i / 24) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(ang) * 170, cy + Math.sin(ang) * 170);
      ctx.lineTo(cx + Math.cos(ang) * 195, cy + Math.sin(ang) * 195);
      ctx.strokeStyle = "rgba(120, 150, 175, 0.3)";
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
    // subtle plaza panel joints
    ctx.strokeStyle = "rgba(150, 170, 190, 0.13)";
    ctx.lineWidth = 1.5;
    for (let g = 0; g <= S; g += 128) {
      ctx.beginPath(); ctx.moveTo(g, 0); ctx.lineTo(g, S); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, g); ctx.lineTo(S, g); ctx.stroke();
    }
    // glowing walk lane: spawn → gate
    const laneL = px(858);
    const laneR = px(902);
    const laneTop = py(806);
    const lane = ctx.createLinearGradient(0, laneTop, 0, cy);
    lane.addColorStop(0, "rgba(102, 216, 255, 0.3)");
    lane.addColorStop(1, "rgba(102, 216, 255, 0.08)");
    ctx.fillStyle = lane;
    ctx.fillRect(laneL, laneTop, laneR - laneL, cy - laneTop);
    for (const lx of [laneL, laneR]) {
      ctx.beginPath();
      ctx.moveTo(lx, laneTop);
      ctx.lineTo(lx, cy);
      ctx.strokeStyle = "rgba(62, 201, 245, 0.65)";
      ctx.lineWidth = 4;
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
    ctx.lineWidth = 5;
    for (let i = 0; i < 4; i++) {
      const yy = cy - 90 - i * 120;
      ctx.beginPath();
      ctx.moveTo(cx - 26, yy + 18);
      ctx.lineTo(cx, yy);
      ctx.lineTo(cx + 26, yy + 18);
      ctx.stroke();
    }
    const hx = px(788);
    const hy = py(956);
    const halo = ctx.createRadialGradient(hx, hy, 20, hx, hy, 220);
    halo.addColorStop(0, "rgba(150, 215, 245, 0.22)");
    halo.addColorStop(1, "rgba(150, 215, 245, 0)");
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, S, S);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    // The plaza art is authored for the room's footprint; a detail
    // layer tiled on top keeps the terrazzo grain crisp now that the
    // floor is three times larger.
    const grain = new THREE.CanvasTexture(grainCanvas());
    grain.colorSpace = THREE.SRGBColorSpace;
    grain.wrapS = grain.wrapT = THREE.RepeatWrapping;
    grain.repeat.set(14, 14);
    grain.anisotropy = 8;
    return new THREE.MeshStandardMaterial({
      map: tex,
      roughnessMap: grain,
      roughness: 0.42,
      metalness: 0.06,
    });
  }, []);
}

/* ── floating light ceiling ─────────────────────────────────────────
 * Layered white panels hovering at different heights over the plaza,
 * the central one softly luminous — vertical composition: floor →
 * people → data core → floating ceiling. Panels drift millimetres. */
export function FloatingCeiling() {
  const group = useRef<THREE.Group>(null);
  useFrame(() => {
    const g = group.current;
    if (!g) return;
    // millimetre-scale kinetic drift (§6) — visible as life, not motion
    g.position.y = Math.sin(performance.now() / 3600) * 0.05;
  });
  // Positions in map units so the canopy tracks the hall at any world
  // scale; heights and panel sizes are metres.
  const panels: Array<{
    p: [number, number, number];
    s: [number, number];
    m: THREE.Material;
  }> = [
    { p: [u(812), 10.4, u(960)], s: [10.5, 4.8], m: MAT.frost },
    { p: [u(952), 9.8, u(1028)], s: [7.2, 3.8], m: MAT.frost },
    { p: [u(860), 9.2, u(1080)], s: [6.2, 3.1], m: MAT.frost },
    { p: [u(984), 10.7, u(908)], s: [5.5, 3.0], m: MAT.frost },
    { p: [u(888), 9.5, u(992)], s: [5.0, 2.8], m: MAT.softGlow },
  ];
  return (
    <group ref={group}>
      {panels.map((pn, i) => (
        <group key={i} position={pn.p}>
          <mesh material={pn.m}>
            <boxGeometry args={[pn.s[0], 0.06, pn.s[1]]} />
          </mesh>
        </group>
      ))}
      {/* thin light seams between panel layers */}
      {[
        { p: [u(876), 9.9, u(996)] as const, l: 8.2 },
        { p: [u(928), 9.4, u(1008)] as const, l: 6.4 },
      ].map((sm, i) => (
        <mesh key={i} material={MAT.neonWhite} position={[sm.p[0], sm.p[1], sm.p[2]]}>
          <boxGeometry args={[sm.l, 0.012, 0.012]} />
        </mesh>
      ))}
    </group>
  );
}

/* ── smart glass volume (spatial UI as architecture) ───────────────
 * A cantilevered translucent volume on the west wall: information
 * lives inside the glass, softly fading — not a billboard. */
export function SmartGlass() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const tex = useMemo(
    () =>
      makeTextTexture(
        [
          { text: "ANYWARE OFFICE", size: 30, color: "rgba(230,242,250,0.85)", weight: 600 },
          { text: `${hh}:${mm}`, size: 118, color: "rgba(240,248,255,0.95)", weight: 700 },
          { text: "TODAY", size: 26, color: "rgba(150,175,195,0.8)", weight: 600 },
          { text: "SIGNAL 3 · PARTNER 2", size: 34, color: "rgba(180,220,245,0.9)", weight: 600 },
          { text: "MEETING 1", size: 34, color: "rgba(180,220,245,0.9)", weight: 600 },
        ],
        { width: 512, height: 640, tracking: 2 },
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const uiMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        toneMapped: false,
        depthWrite: false,
      }),
    [tex],
  );
  useFrame(() => {
    // information breathes inside the glass (data fade, §6)
    uiMat.opacity = 0.72 + Math.sin(performance.now() / 4200) * 0.18;
  });
  const x = u(696);
  const z = u(880);
  return (
    <group position={[x + 0.6, 3.4, z]}>
      {/* cantilevered frame */}
      <mesh material={MAT.pearl} position={[0, 1.9, 0]} castShadow>
        <boxGeometry args={[1.2, 0.16, 4.6]} />
      </mesh>
      <mesh material={MAT.pearl} position={[0, -1.9, 0]} castShadow>
        <boxGeometry args={[1.2, 0.16, 4.6]} />
      </mesh>
      {/* frosted back + clear front */}
      <mesh material={MAT.frost} position={[-0.3, 0, 0]} rotation-y={Math.PI / 2}>
        <planeGeometry args={[4.4, 3.6]} />
      </mesh>
      <mesh material={MAT.glass} position={[0.55, 0, 0]} rotation-y={Math.PI / 2}>
        <planeGeometry args={[4.5, 3.75]} />
      </mesh>
      {/* the information layer floats between the two surfaces */}
      <mesh material={uiMat} position={[0.2, 0, 0]} rotation-y={Math.PI / 2}>
        <planeGeometry args={[3.2, 3.4]} />
      </mesh>
      {/* single quiet state indicator */}
      <mesh material={MAT.neonCyan} position={[0.58, -1.6, 1.9]}>
        <sphereGeometry args={[0.055, 8, 8]} />
      </mesh>
    </group>
  );
}

/* ── AnyWare Data Core: the hero landmark ──────────────────────────
 * Twin-ring gyroscope + pearl core. Five business sub-nodes (LOCAL /
 * SIGNAL / PARTNER / TABLE / GREEN) orbit the core, joined by light
 * spokes — the businesses connect into one AnyWare economy. Labels
 * open softly when a player approaches (§7 ambient interaction). */
const CORE_NODES: AreaId[] = ["LOCAL", "SIGNAL", "PARTNER", "TABLE", "GREEN"];

export function HeroCore({ sim }: { sim: LabSim }) {
  const rings = useRef<THREE.Group>(null);
  const [near, setNear] = useState(false);
  const nearRef = useRef(false);
  const nodeMats = useMemo(
    () =>
      CORE_NODES.map(
        (id) =>
          new THREE.MeshBasicMaterial({ color: AREA_BY_ID[id].accent, toneMapped: false }),
      ),
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

  const shaftMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#cfe9fa",
        transparent: true,
        opacity: 0.06,
        toneMapped: false,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    [],
  );
  const x = u(788);
  const z = u(956);
  const coreY = 9.0;
  useFrame(() => {
    const t = performance.now() / 1000;
    const g = rings.current;
    if (g) {
      g.rotation.y = t * 0.3;
      g.children[0].rotation.x = 1.05 + Math.sin(t * 0.4) * 0.12;
      g.children[1].rotation.x = -0.65 + Math.cos(t * 0.33) * 0.15;
      g.position.y = coreY + Math.sin(t * 0.7) * 0.08;
    }
    const dx = sim.avatar.x - 788;
    const dy = sim.avatar.y - 956;
    const isNear = dx * dx + dy * dy < 200 * 200;
    if (isNear !== nearRef.current) {
      nearRef.current = isNear;
      setNear(isNear);
    }
  });
  return (
    <group>
      <group ref={rings} position={[x, coreY, z]}>
        <mesh material={MAT.neonWhite} rotation-x={1.05}>
          <torusGeometry args={[3.4, 0.12, 10, 72]} />
        </mesh>
        <mesh material={MAT.neonCyan} rotation-x={-0.65}>
          <torusGeometry args={[2.4, 0.1, 10, 64]} />
        </mesh>
        <mesh material={MAT.pearl} castShadow>
          <sphereGeometry args={[1.35, 28, 20]} />
        </mesh>
        <mesh material={MAT.coreGlow}>
          <sphereGeometry args={[1.78, 20, 16]} />
        </mesh>
        {/* five business nodes joined to the core by light spokes */}
        {CORE_NODES.map((id, i) => {
          const ang = (i / CORE_NODES.length) * Math.PI * 2;
          return (
            <group key={id} rotation-y={ang}>
              <mesh material={MAT.holo} rotation-z={Math.PI / 2} position={[1.6, 0, 0]}>
                <cylinderGeometry args={[0.03, 0.03, 2.2, 6]} />
              </mesh>
              <mesh material={nodeMats[i]} position={[2.85, 0, 0]}>
                <sphereGeometry args={[0.22, 12, 10]} />
              </mesh>
              <Html
                position={[2.85, 0.55, 0]}
                center
                distanceFactor={6}
                style={{ pointerEvents: "none", whiteSpace: "nowrap" }}
              >
                <div
                  style={{
                    background: "rgba(13,20,32,0.66)",
                    border: "1px solid rgba(150,210,240,0.3)",
                    borderRadius: 6,
                    padding: "1px 6px",
                    fontFamily: "system-ui, sans-serif",
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: "0.12em",
                    color: "#dceefb",
                    opacity: near ? 1 : 0,
                    transition: "opacity 0.6s ease",
                    backdropFilter: "blur(4px)",
                  }}
                >
                  {AREA_BY_ID[id].label}
                </div>
              </Html>
            </group>
          );
        })}
      </group>
      <TwoSidedSign
        texture={letters}
        width={8.5}
        height={1.25}
        transparent
        position={[x, 5.6, z]}
      />
      <mesh material={shaftMat} position={[x, 5.0, z]}>
        <cylinderGeometry args={[1.3, 2.2, 8.0, 24, 1, true]} />
      </mesh>
    </group>
  );
}

/* ── ring gate with proximity response ─────────────────────────────── */
export function RingGate({ sim }: { sim: LabSim }) {
  const group = useRef<THREE.Group>(null);
  const pulse = useRef<THREE.MeshBasicMaterial>(null);
  const glowBase = useRef(0.5);
  const camera = useThree((s) => s.camera);
  const xU = 880;
  const zU = 806;
  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const cam = cameraWorldUnits(camera);
    g.visible = !segmentHitsRect(
      sim.avatar.x,
      sim.avatar.y,
      cam.x,
      cam.y,
      { x: xU - 90, y: zU - 20, w: 180, h: 40 },
      12,
    );
    // the gate brightens slightly as the player approaches (§7)
    const dx = sim.avatar.x - xU;
    const dy = sim.avatar.y - zU;
    const target = dx * dx + dy * dy < 240 * 240 ? 0.8 : 0.48;
    glowBase.current += (target - glowBase.current) * 0.04;
    if (pulse.current) {
      pulse.current.opacity = glowBase.current + Math.sin(performance.now() / 1100) * 0.14;
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
      <mesh material={MAT.neonCyan} position={[x, 4.2, z]}>
        <torusGeometry args={[4.2, 0.19, 12, 72]} />
      </mesh>
      <mesh position={[x, 4.2, z]}>
        <torusGeometry args={[4.8, 0.07, 8, 72]} />
        <meshBasicMaterial ref={pulse} color="#dff4ff" transparent opacity={0.6} toneMapped={false} />
      </mesh>
      {[-4.2, 4.2].map((ox) => (
        <group key={ox} position={[x + ox, 0, z]}>
          <mesh material={MAT.pearl} position={[0, 0.65, 0]} castShadow>
            <cylinderGeometry args={[0.22, 0.32, 1.3, 14]} />
          </mesh>
          <mesh material={MAT.neonCyan} position={[0, 1.33, 0]}>
            <cylinderGeometry args={[0.17, 0.17, 0.06, 14]} />
          </mesh>
        </group>
      ))}
      <group position={[x, 9.2, z]}>
        <mesh material={MAT.holo} position={[0, 0, -0.06]}>
          <planeGeometry args={[8.2, 2.8]} />
        </mesh>
        <mesh material={signMat}>
          <planeGeometry args={[7.2, 2.06]} />
        </mesh>
        <mesh material={MAT.neonCyan} position={[0, -1.24, 0.03]}>
          <boxGeometry args={[7.2, 0.05, 0.05]} />
        </mesh>
        <mesh material={MAT.neonWhite} position={[0, 1.2, 0.03]}>
          <boxGeometry args={[4.2, 0.035, 0.035]} />
        </mesh>
      </group>
    </group>
  );
}

/* ── arrival platform with a one-shot spawn pulse ──────────────────── */
export function ArrivalPlatform() {
  const ring = useRef<THREE.MeshBasicMaterial>(null);
  const spawnRing = useRef<THREE.Mesh>(null);
  const born = useRef(performance.now());
  const pillarMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#d8ecfa",
        transparent: true,
        opacity: 0.05,
        toneMapped: false,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    [],
  );
  useFrame(() => {
    const t = performance.now();
    if (ring.current) ring.current.opacity = 0.6 + Math.sin(t / 900) * 0.2;
    // §7: the platform answers the spawn once, then settles
    const age = (t - born.current) / 1000;
    const m = spawnRing.current;
    if (m) {
      if (age < 2.4) {
        const k = age / 2.4;
        m.visible = true;
        m.scale.setScalar(1 + k * 1.5);
        (m.material as THREE.MeshBasicMaterial).opacity = (1 - k) * 0.7;
      } else {
        m.visible = false;
      }
    }
  });
  const x = u(880);
  const z = u(1100);
  return (
    <group position={[x, 0, z]}>
      <mesh material={MAT.frost} rotation-x={-Math.PI / 2} position={[0, 0.022, 0]}>
        <circleGeometry args={[3.1, 48]} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.03, 0]}>
        <ringGeometry args={[2.9, 3.14, 48]} />
        <meshBasicMaterial ref={ring} color="#5fd4ff" transparent opacity={0.8} toneMapped={false} />
      </mesh>
      <mesh material={MAT.neonWhite} rotation-x={-Math.PI / 2} position={[0, 0.028, 0]}>
        <ringGeometry args={[1.85, 1.98, 40]} />
      </mesh>
      <mesh ref={spawnRing} rotation-x={-Math.PI / 2} position={[0, 0.034, 0]}>
        <ringGeometry args={[3.0, 3.22, 48]} />
        <meshBasicMaterial color="#bfe9ff" transparent opacity={0} toneMapped={false} depthWrite={false} />
      </mesh>
      <mesh material={pillarMat} position={[0, 3.7, 0]}>
        <cylinderGeometry args={[2.5, 3.0, 7.5, 28, 1, true]} />
      </mesh>
    </group>
  );
}

/* ── directional guidance pulse along the walk lane (§6) ───────────── */
export function GuidancePulse() {
  const mat = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 256;
    const ctx = canvas.getContext("2d")!;
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, "rgba(120,215,255,0)");
    grad.addColorStop(0.5, "rgba(140,225,255,0.55)");
    grad.addColorStop(1, "rgba(120,215,255,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 32, 256);
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      opacity: 0.3,
      toneMapped: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }, []);
  useFrame(() => {
    const tex = mat.map as THREE.CanvasTexture;
    // very slow pulse travelling toward the gate
    tex.offset.y = (performance.now() / 9000) % 1;
  });
  return (
    <mesh
      material={mat}
      rotation-x={-Math.PI / 2}
      position={[u(880), 0.026, u(953)]}
    >
      <planeGeometry args={[3.0, 21.6]} />
    </mesh>
  );
}

/* ── under-floor light slits near the reception module (§8) ────────── */
export function FloorSlits() {
  return (
    <group>
      {[u(1000), u(1032)].map((zz, i) => (
        <group key={i} position={[u(760), 0, zz]}>
          <mesh material={MAT.neonWhite} rotation-x={-Math.PI / 2} position={[0, 0.016, 0]}>
            <planeGeometry args={[9.0, 0.15]} />
          </mesh>
          <mesh material={MAT.frost} rotation-x={-Math.PI / 2} position={[0, 0.022, 0]}>
            <planeGeometry args={[9.3, 0.36]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ── curved corner shells: the room stops being a box (§2) ─────────── */
export function CurvedCorners() {
  const H = 5.4;
  return (
    <group>
      {/* NW corner (680,800): interior quadrant +x/+z */}
      <mesh
        material={MAT.pearl}
        position={[u(696), H / 2, u(816)]}
      >
        <cylinderGeometry args={[3.0, 3.0, H, 18, 1, true, 0, Math.PI / 2]} />
      </mesh>
      {/* NE corner (1080,800): interior quadrant -x/+z */}
      <mesh
        material={MAT.pearl}
        position={[u(1064), H / 2, u(816)]}
      >
        <cylinderGeometry args={[3.0, 3.0, H, 18, 1, true, -Math.PI / 2, Math.PI / 2]} />
      </mesh>
    </group>
  );
}

/* ── floating fascia crown, two stepped layers (§2 architecture) ──── */
export function EntranceFascia({ sim }: { sim: LabSim }) {
  const y = 5.7;
  const t = 0.55;
  const d = 0.5;
  const west = u(680) + 0.1;
  const east = u(1080) - 0.1;
  const north = u(800) + 0.1;
  const south = u(1184) - 0.1;
  const cx = (west + east) / 2;
  const cz = (north + south) / 2;
  const wLen = east - west;
  const dLen = south - north;
  const northRef = useRef<THREE.Group>(null);
  const camera = useThree((s) => s.camera);
  useFrame(() => {
    const g = northRef.current;
    if (!g) return;
    const cam = cameraWorldUnits(camera);
    g.visible = !segmentHitsRect(
      sim.avatar.x,
      sim.avatar.y,
      cam.x,
      cam.y,
      { x: 680, y: 790, w: 400, h: 24 },
      12,
    );
  });
  const band = (
    p: readonly [number, number, number],
    s: readonly [number, number, number],
    tilt: number,
  ) => (
    <>
      <mesh material={MAT.pearl} position={[p[0], p[1], p[2]]} castShadow>
        <boxGeometry args={[s[0], t, s[2]]} />
      </mesh>
      {/* stepped second layer, slightly tilted — the "cut" crown */}
      <mesh
        material={MAT.wallPaint}
        position={[p[0], p[1] + 0.6, p[2]]}
        rotation-x={s[2] > s[0] ? 0 : tilt}
        rotation-z={s[2] > s[0] ? tilt : 0}
      >
        <boxGeometry args={[s[0] * 0.88, 0.2, s[2] * 0.88]} />
      </mesh>
      <mesh material={MAT.neonWhite} position={[p[0], p[1] - t / 2 - 0.015, p[2]]}>
        <boxGeometry args={[s[0] * 0.995, 0.035, s[2] * 0.995]} />
      </mesh>
    </>
  );
  return (
    <group>
      <group ref={northRef}>{band([cx, y, north], [wLen, t, d], 0.07)}</group>
      {band([west, y, cz], [d, t, dLen], 0.07)}
      {band([east, y, cz], [d, t, dLen], -0.07)}
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
    if (g.current) g.current.position.y = 3.2 + Math.sin(performance.now() / 1600) * 0.1;
  });
  const x = u(972);
  const z = u(1052);
  return (
    <group ref={g} position={[x, 3.2, z]} rotation-y={-0.5}>
      <mesh material={MAT.holo} position={[0, 0, -0.05]}>
        <planeGeometry args={[4.4, 2.45]} />
      </mesh>
      <mesh material={mat}>
        <planeGeometry args={[3.9, 1.95]} />
      </mesh>
      <mesh material={MAT.neonMint} position={[0, -1.1, 0.04]}>
        <boxGeometry args={[3.9, 0.04, 0.04]} />
      </mesh>
      <mesh material={MAT.brushed} position={[0, -1.9, 0]}>
        <cylinderGeometry args={[0.07, 0.12, 3.1, 8]} />
      </mesh>
    </group>
  );
}
