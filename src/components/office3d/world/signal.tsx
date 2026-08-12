"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Box, Cove, Plate, roundedRect } from "./kit";
import { fillGradient, label, makeScreen } from "./lux";

/**
 * SIGNAL — CREATIVE MEDIA DISTRICT.
 *
 * Not a room with media furniture in it. The thesis is MEDIA FLOW:
 * information is captured, edited, assembled and broadcast, and that
 * sequence is the building. Everything is set on a diagonal ~20° off
 * the canonical grid, so nothing reads as a rectangular office; a
 * ribbon of floor line, spine wall and ceiling follows that diagonal
 * and rises until it ends at the Media Wall.
 *
 * Two constraints shape the whole design:
 *
 *  · The avatar is always at y = 0 — there is no vertical movement, so
 *    a sunken pit or a raised arena cannot be walked on. ALL verticality
 *    is therefore built overhead: work layer, media layer, the halo, a
 *    suspended bridge, then ceiling architecture.
 *  · The footprint is fixed at 26 x 30 m by the canonical collision
 *    rects. Space cannot be added, so the district is built out of
 *    density and height rather than area.
 *
 * Information deliberately lives in architecture — a table top, a floor
 * line, wall bands, glass etching, the halo's inner face — not on
 * monitors. Exactly one conventional rectangular display exists in the
 * district: the one in the Content Studio, because a studio really has
 * one.
 */

const std = (o: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial(o);
const phys = (o: THREE.MeshPhysicalMaterialParameters) => new THREE.MeshPhysicalMaterial(o);
const emit = (color: string, opacity = 1) =>
  new THREE.MeshBasicMaterial({
    color,
    toneMapped: false,
    transparent: opacity < 1,
    opacity,
    depthWrite: opacity > 0.9,
  });

/** SIGNAL's own palette. Magenta is information, never a painted face. */
const SIG = {
  pearl: std({ color: "#f2f0ec", roughness: 0.5, metalness: 0.05 }),
  pearlDeep: std({ color: "#dedbd5", roughness: 0.6, metalness: 0.04 }),
  black: std({ color: "#22252a", roughness: 0.62, metalness: 0.12 }),
  blackSoft: std({ color: "#2d3138", roughness: 0.72, metalness: 0.08 }),
  metal: std({ color: "#aeb5bd", roughness: 0.3, metalness: 0.82 }),
  metalDark: std({ color: "#767d86", roughness: 0.38, metalness: 0.75 }),
  stone: std({ color: "#cfcbc4", roughness: 0.42, metalness: 0.04 }),
  stoneDark: std({ color: "#4a474a", roughness: 0.66 }),
  fabric: std({ color: "#4a4148", roughness: 1 }),
  smoked: phys({
    color: "#3b4048",
    roughness: 0.14,
    metalness: 0.1,
    transparent: true,
    opacity: 0.45,
    side: THREE.DoubleSide,
  }),
  clear: phys({
    color: "#dfeaf1",
    roughness: 0.05,
    transparent: true,
    opacity: 0.24,
    side: THREE.DoubleSide,
  }),
  magenta: emit("#e0479f", 0.92),
  magentaSoft: emit("#e0479f", 0.34),
  violet: emit("#b98cf0", 0.8),
  warm: emit("#ffe9d2", 0.9),
  glow: emit("#f6f2ff", 0.22),
} as const;

/** The district's diagonal. Everything important is set on this angle. */
const FLOW = -0.36; // ~20.6°

/** Campaign Arena sits under the tower, so the void has somewhere to go. */
const ARENA: [number, number] = [4.0, -4.0];

/* ── floor: material zones, not one big plane ────────────────────── */

function MediaFlowFloor({ hw, hd }: { hw: number; hd: number }) {
  const etch = useMemo(
    () =>
      makeScreen((ctx, w, h) => {
        ctx.fillStyle = "#2a2d33";
        ctx.fillRect(0, 0, w, h);
        label(ctx, "CREATIVE MEDIA DISTRICT", 30, h * 0.32, 58, "#cfd6de", 600, 22);
        ctx.fillStyle = "#e0479f";
        ctx.fillRect(30, h * 0.72, 260, 6);
      }, 1024, 128),
    [],
  );
  return (
    <group>
      {/* dark warm neutral base */}
      <Plate w={hw * 2 - 2.6} d={hd * 2 - 2.6} y={0.03} r={1.4} mat={SIG.stoneDark} />
      {/* light stone field under the production side */}
      <group rotation-y={FLOW}>
        <Plate w={9.0} d={7.4} x={-6.4} z={-5.6} y={0.042} r={0.8} mat={SIG.stone} />
        {/* the flow line: one very thin magenta thread, nothing more */}
        <mesh material={SIG.magenta} position={[0, 0.05, 0]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[0.18, 34]} />
        </mesh>
        <mesh material={SIG.magentaSoft} position={[0, 0.047, 0]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[1.5, 34]} />
        </mesh>
      </group>
      {/* the district names itself in the floor at the threshold */}
      <mesh material={etch} position={[-1.2, 0.052, hd - 6.2]} rotation-x={-Math.PI / 2} rotation-z={-FLOW}>
        <planeGeometry args={[5.2, 0.65]} />
      </mesh>
    </group>
  );
}

/* ── the angled spine: layered planes, not a wall ─────────────────── */

function AngledSpine() {
  return (
    <group rotation-y={FLOW}>
      {/* Set to the LEFT of the entrance-to-arena sightline, so it
          divides production from broadcast and frames the view instead
          of standing across it. Kept below the media layer so the halo
          and the ceiling stay visible over the top. */}
      <group position={[-2.9, 0, -3.4]}>
        <Box w={0.34} h={4.4} d={8.2} mat={SIG.black} />
        <Box w={0.42} h={2.0} d={6.0} x={0.42} y={1.3} z={-0.6} mat={SIG.pearl} />
        <mesh material={SIG.smoked} position={[0.3, 3.1, 1.4]} rotation-y={-Math.PI / 2}>
          <planeGeometry args={[5.0, 2.4]} />
        </mesh>
        {/* a 6 cm information reveal running the length of the spine */}
        <mesh material={SIG.magenta} position={[0.19, 3.35, 0]} rotation-y={-Math.PI / 2}>
          <planeGeometry args={[7.8, 0.06]} />
        </mesh>
        <mesh material={SIG.warm} position={[-0.19, 0.16, 0]} rotation-y={Math.PI / 2}>
          <planeGeometry args={[7.8, 0.09]} />
        </mesh>
      </group>
    </group>
  );
}

/* ── landmark: SIGNAL MEDIA HALO ──────────────────────────────────── */

function MediaHalo() {
  const band = useRef<THREE.Mesh>(null);
  const strip = useMemo(
    () =>
      makeScreen((ctx, w, h) => {
        fillGradient(ctx, w, h, "#242830", "#171a20");
        // only part of the ring carries content — the rest is material
        ctx.fillStyle = "#e0479f";
        ctx.fillRect(0, h * 0.46, w * 0.34, 4);
        label(ctx, "CAMPAIGN 2026", 40, h * 0.22, 62, "#f2e6f2", 600, 16);
        label(ctx, "REACH 1.24M   ENGAGE 8.7%   APPLICANTS 312", 40, h * 0.6, 40, "#9fb0c0", 500, 8);
        ctx.fillStyle = "rgba(255,255,255,0.05)";
        ctx.fillRect(w * 0.52, 0, w * 0.48, h);
      }, 2048, 128),
    [],
  );
  useFrame((_, dt) => {
    if (band.current) band.current.rotation.z += Math.min(dt, 0.2) * 0.035;
  });
  return (
    <group position={[ARENA[0], 6.3, ARENA[1]]} rotation={[Math.PI / 2 + 0.32, 0, 0]} scale={[1.28, 1, 1]}>
      {/* outer structural ribbon */}
      <mesh material={SIG.pearl} castShadow>
        <torusGeometry args={[4.4, 0.5, 10, 56]} />
      </mesh>
      <mesh material={SIG.pearlDeep}>
        <torusGeometry args={[4.85, 0.14, 8, 56]} />
      </mesh>
      {/* inner face: the information surface, ~40% of the ring */}
      <mesh ref={band} material={strip}>
        <cylinderGeometry args={[4.02, 4.02, 1.05, 56, 1, true]} />
      </mesh>
      {/* hidden cove on the underside — the landmark lights its own place */}
      <mesh material={SIG.warm}>
        <torusGeometry args={[4.4, 0.085, 6, 56]} />
      </mesh>
    </group>
  );
}

function HaloRigging() {
  return (
    <group position={[ARENA[0], 0, ARENA[1]]}>
      {[0.6, 2.0, 3.4, 4.8].map((a, i) => {
        const ang = a + 0.3;
        return (
          <mesh
            key={i}
            material={SIG.metalDark}
            position={[Math.cos(ang) * 7.4, 11.4, Math.sin(ang) * 5.0]}
          >
            <cylinderGeometry args={[0.05, 0.05, 5.6, 6]} />
          </mesh>
        );
      })}
    </group>
  );
}

/* ── metaverse-only: CAMPAIGN CONSTELLATION ───────────────────────── */

const CLUSTERS: Array<{ name: string; at: [number, number, number]; n: number }> = [
  { name: "META", at: [-3.4, 2.4, 1.6], n: 3 },
  { name: "SNS", at: [2.2, 4.3, 3.4], n: 4 },
  { name: "RECRUIT", at: [6.6, 2.0, -0.6], n: 3 },
  { name: "WEB", at: [1.0, 5.4, -3.6], n: 3 },
  { name: "CREATIVE", at: [-4.6, 3.6, -3.0], n: 3 },
];

function Constellation() {
  const group = useRef<THREE.Group>(null);
  const nodes = useMemo(() => {
    const out: Array<[number, number, number, number]> = [];
    CLUSTERS.forEach((c, ci) => {
      for (let i = 0; i < c.n; i++) {
        const s = 0.16 + ((ci * 7 + i * 13) % 9) / 42;
        out.push([
          c.at[0] + Math.cos(ci * 2.1 + i * 1.9) * (0.7 + i * 0.34),
          c.at[1] + Math.sin(ci * 1.3 + i * 2.4) * 0.55,
          c.at[2] + Math.sin(ci * 2.6 + i * 1.4) * (0.7 + i * 0.3),
          s,
        ]);
      }
    });
    return out;
  }, []);
  const shells = useRef<THREE.InstancedMesh>(null);
  const cores = useRef<THREE.InstancedMesh>(null);
  const links = useRef<THREE.InstancedMesh>(null);
  const write = () => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    nodes.forEach(([x, y, z, s], i) => {
      m.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(s, s, s));
      shells.current?.setMatrixAt(i, m);
      m.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(s * 0.4, s * 0.4, s * 0.4));
      cores.current?.setMatrixAt(i, m);
    });
    // thin filaments from each cluster head down toward the arena
    CLUSTERS.forEach((c, i) => {
      const len = c.at[1] - 1.1;
      m.compose(
        new THREE.Vector3(c.at[0], 1.1 + len / 2, c.at[2]),
        q,
        new THREE.Vector3(0.012, len, 0.012),
      );
      links.current?.setMatrixAt(i, m);
    });
    for (const mesh of [shells.current, cores.current]) {
      if (mesh) {
        mesh.count = nodes.length;
        mesh.instanceMatrix.needsUpdate = true;
      }
    }
    if (links.current) {
      links.current.count = CLUSTERS.length;
      links.current.instanceMatrix.needsUpdate = true;
    }
  };
  const written = useRef(false);
  useFrame((_, dt) => {
    if (!written.current) {
      written.current = true;
      write();
    }
    if (group.current) group.current.rotation.y += Math.min(dt, 0.2) * 0.028;
  });
  const plate = useMemo(
    () =>
      CLUSTERS.map((c) =>
        makeScreen((ctx, w, h) => {
          ctx.fillStyle = "rgba(24,27,33,0.92)";
          ctx.fillRect(0, 0, w, h);
          ctx.fillStyle = "#b98cf0";
          ctx.fillRect(0, h - 5, w, 5);
          label(ctx, c.name, 22, h * 0.26, 46, "#e8eef5", 600, 8);
        }, 512, 96),
      ),
    [],
  );
  return (
    <group ref={group} position={[ARENA[0], 0, ARENA[1]]}>
      <instancedMesh ref={shells} args={[undefined, undefined, nodes.length]} material={SIG.smoked}>
        <octahedronGeometry args={[1]} />
      </instancedMesh>
      <instancedMesh ref={cores} args={[undefined, undefined, nodes.length]} material={SIG.violet}>
        <octahedronGeometry args={[1]} />
      </instancedMesh>
      <instancedMesh ref={links} args={[undefined, undefined, CLUSTERS.length]} material={SIG.glow}>
        <boxGeometry />
      </instancedMesh>
      {CLUSTERS.map((c, i) => (
        <mesh key={c.name} material={plate[i]} position={[c.at[0], c.at[1] + 1.05, c.at[2]]}>
          <planeGeometry args={[1.5, 0.28]} />
        </mesh>
      ))}
    </group>
  );
}

/* ── A. CAMPAIGN ARENA ────────────────────────────────────────────── */

function CampaignArena() {
  const top = useMemo(
    () =>
      makeScreen((ctx, w, h) => {
        fillGradient(ctx, w, h, "#1e222a", "#141820");
        ctx.strokeStyle = "rgba(224,71,159,0.5)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(w * 0.1, h * 0.72);
        ctx.bezierCurveTo(w * 0.35, h * 0.3, w * 0.6, h * 0.8, w * 0.9, h * 0.28);
        ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,0.05)";
        for (let i = 0; i < 5; i++) ctx.fillRect(w * 0.08, h * 0.12 + i * 26, w * 0.2, 2);
        label(ctx, "CAMPAIGN PLANNING SURFACE", w * 0.08, h * 0.04, 26, "#7f8ea0", 600, 8);
        ["META", "SNS", "RECRUIT", "WEB", "CREATIVE"].forEach((t, i) =>
          label(ctx, t, w * 0.62, h * 0.14 + i * 34, 22, "#cbd6e2", 500, 4),
        );
      }, 1024, 512),
    [],
  );
  // a parallelogram top, so nothing here reads as a meeting table
  const geo = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-3.25, -1.7);
    s.lineTo(3.25, -1.1);
    s.lineTo(3.25, 1.7);
    s.lineTo(-3.25, 1.1);
    s.closePath();
    return new THREE.ExtrudeGeometry(s, { depth: 0.11, bevelEnabled: false });
  }, []);
  return (
    <group position={[ARENA[0], 0, ARENA[1]]} rotation-y={FLOW}>
      <mesh geometry={geo} material={SIG.black} position={[0, 0.86, 0]} rotation-x={Math.PI / 2} castShadow receiveShadow />
      <mesh material={top} position={[0, 0.875, 0]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[6.1, 2.6]} />
      </mesh>
      <mesh material={SIG.magenta} position={[0, 0.878, 1.28]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[6.3, 0.05]} />
      </mesh>
      <Box w={5.0} h={0.75} d={1.5} mat={SIG.metalDark} shadow={false} />
      {/* low stools, not office chairs */}
      {[-2.3, -1.15, 0, 1.15, 2.3].map((x, i) => (
        <group key={x} position={[x, 0, i % 2 ? 2.35 : -2.35]}>
          <mesh material={SIG.fabric} position={[0, 0.47, 0]} castShadow>
            <cylinderGeometry args={[0.28, 0.26, 0.14, 14]} />
          </mesh>
          <mesh material={SIG.metal} position={[0, 0.2, 0]}>
            <cylinderGeometry args={[0.05, 0.16, 0.4, 10]} />
          </mesh>
        </group>
      ))}
      {/* lean rails: you stand at a campaign table */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 4.4, 0, 0]}>
          <Box w={0.09} h={1.05} d={0.09} mat={SIG.metal} shadow={false} />
          <Box w={0.09} h={0.08} d={2.4} y={1.02} mat={SIG.metal} shadow={false} />
        </group>
      ))}
    </group>
  );
}

/* ── B. CONTENT STUDIO ────────────────────────────────────────────── */

function ContentStudio() {
  const feed = useMemo(
    () =>
      makeScreen((ctx, w, h) => {
        fillGradient(ctx, w, h, "#171b22", "#101419");
        ctx.fillStyle = "#e0479f";
        ctx.fillRect(34, 34, 4, 30);
        label(ctx, "REC  ·  TAKE 04", 52, 30, 30, "#f0dce9", 600, 4);
        ctx.fillStyle = "rgba(255,255,255,0.07)";
        ctx.fillRect(34, 92, w - 68, h - 150);
        label(ctx, "BRAND FILM 2026", 60, h - 48, 26, "#8ea0b2", 500, 6);
      }, 640, 400),
    [],
  );
  const etch = useMemo(
    () =>
      makeScreen((ctx, w, h) => {
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = "rgba(255,255,255,0.55)";
        label(ctx, "CONTENT STUDIO", 12, h * 0.3, 42, "rgba(240,246,250,0.75)", 600, 14);
      }, 512, 96),
    [],
  );
  return (
    <group position={[-7.0, 0, -9.2]} rotation-y={FLOW + 0.22}>
      {/* seamless cyclorama — the studio's defining curve */}
      <mesh material={SIG.pearl} position={[0, 2.1, -2.6]} receiveShadow>
        <cylinderGeometry args={[4.2, 4.2, 4.2, 24, 1, true, Math.PI * 0.12, Math.PI * 0.76]} />
      </mesh>
      <mesh material={SIG.pearlDeep} position={[0, 0.05, -2.6]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0, 4.2, 24, 1, Math.PI * 0.12, Math.PI * 0.76]} />
      </mesh>
      {/* lighting frame: the studio's structure IS its equipment */}
      <group position={[0, 0, -1.2]}>
        {[-1, 1].map((s) => (
          <Box key={s} w={0.12} h={4.1} d={0.12} x={s * 3.4} mat={SIG.metal} shadow={false} />
        ))}
        <Box w={7.0} h={0.12} d={0.12} y={4.05} mat={SIG.metal} shadow={false} />
        {[-2.1, 0, 2.1].map((x) => (
          <group key={x} position={[x, 3.72, 0]}>
            <Box w={0.7} h={0.16} d={0.5} mat={SIG.blackSoft} shadow={false} />
            <mesh material={SIG.warm} position={[0, -0.09, 0]} rotation-x={Math.PI / 2}>
              <planeGeometry args={[0.62, 0.42]} />
            </mesh>
          </group>
        ))}
      </group>
      {/* production bench + the district's ONE conventional display */}
      <Box w={4.2} h={0.06} d={0.72} y={0.9} z={2.0} mat={SIG.pearl} />
      <Box w={3.6} h={0.86} d={0.5} z={2.0} mat={SIG.blackSoft} shadow={false} />
      <group position={[0, 1.62, 1.72]}>
        <Box w={1.5} h={0.94} d={0.05} y={-0.47} mat={SIG.black} shadow={false} />
        <mesh material={feed} position={[0, 0, 0.04]}>
          <planeGeometry args={[1.4, 0.87]} />
        </mesh>
      </group>
      {/* camera mark on the floor */}
      <mesh material={SIG.magentaSoft} position={[0, 0.055, 2.9]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.42, 0.5, 24]} />
      </mesh>
      {/* two smoked-glass sides: a room inside the district */}
      <group position={[4.0, 0, 0.6]}>
        <mesh material={SIG.smoked} position={[0, 1.9, 0]} rotation-y={Math.PI / 2}>
          <planeGeometry args={[7.0, 3.8]} />
        </mesh>
        <Box w={0.1} h={0.1} d={7.0} y={3.8} mat={SIG.metal} shadow={false} />
        <mesh material={etch} position={[0.02, 2.3, 1.6]} rotation-y={Math.PI / 2}>
          <planeGeometry args={[2.6, 0.49]} />
        </mesh>
      </group>
    </group>
  );
}

/* ── C. EDITING DECK ──────────────────────────────────────────────── */

function EditingPod({ x, z, rot, i }: { x: number; z: number; rot: number; i: number }) {
  const surface = useMemo(
    () =>
      makeScreen((ctx, w, h) => {
        fillGradient(ctx, w, h, "#1b1420", "#120e18");
        ctx.fillStyle = "#e0479f";
        ctx.fillRect(26, 24, 3, 22);
        label(ctx, ["TIMELINE", "COLOR", "COPY", "LAYOUT"][i % 4], 40, 20, 26, "#e7d4ea", 600, 4);
        for (let k = 0; k < 6; k++) {
          ctx.fillStyle = k % 2 ? "#3a2b52" : "#4c3168";
          ctx.fillRect(26, 66 + k * 28, (w - 52) * (0.3 + ((k * 41 + i * 17) % 60) / 100), 16);
        }
      }, 640, 300),
    [i],
  );
  return (
    <group position={[x, 0, z]} rotation-y={rot}>
      {/* curved back shell + side fin — a pod, not a box */}
      <mesh material={SIG.pearl} position={[0, 1.35, -1.15]} castShadow receiveShadow>
        <cylinderGeometry args={[1.85, 1.85, 2.7, 18, 1, true, Math.PI * 0.16, Math.PI * 0.68]} />
      </mesh>
      <Box w={0.14} h={2.7} d={2.3} x={1.5} z={-0.2} mat={SIG.pearlDeep} />
      {/* overhead hood with a warm pool of light */}
      <Plate w={3.4} d={2.6} y={2.72} x={-0.1} z={-0.5} r={0.7} mat={SIG.pearlDeep} faceDown />
      <Cove w={2.6} d={1.9} y={2.6} x={-0.1} z={-0.5} t={0.1} r={0.5} mat={SIG.warm} />
      {/* one wide desk, display recessed FLUSH into the back panel */}
      <Box w={2.5} h={0.05} d={0.78} y={0.74} mat={SIG.blackSoft} />
      <Box w={0.08} h={0.74} d={0.6} x={-1.15} mat={SIG.metal} shadow={false} />
      <Box w={0.08} h={0.74} d={0.6} x={1.15} mat={SIG.metal} shadow={false} />
      <Box w={2.5} h={1.2} d={0.08} y={0.79} z={-0.42} mat={SIG.black} shadow={false} />
      <mesh material={surface} position={[0, 1.4, -0.37]}>
        <planeGeometry args={[2.24, 1.05]} />
      </mesh>
      <mesh material={SIG.magenta} position={[0, 0.8, -0.37]}>
        <planeGeometry args={[2.24, 0.03]} />
      </mesh>
      {/* stool */}
      <group position={[0, 0, 0.85]}>
        <mesh material={SIG.fabric} position={[0, 0.48, 0]} castShadow>
          <cylinderGeometry args={[0.27, 0.25, 0.14, 14]} />
        </mesh>
        <mesh material={SIG.metal} position={[0, 0.2, 0]}>
          <cylinderGeometry args={[0.05, 0.17, 0.4, 10]} />
        </mesh>
      </group>
    </group>
  );
}

function EditingDeck() {
  return (
    <group>
      {[0, 1, 2, 3].map((i) => (
        <EditingPod
          key={i}
          i={i}
          x={-8.6 + i * 0.55}
          z={-2.4 + i * 3.3}
          rot={Math.PI / 2 + FLOW + i * 0.05}
        />
      ))}
    </group>
  );
}

/* ── D. MEDIA WALL: architecture that carries content ─────────────── */

function MediaWall({ hw, hd }: { hw: number; hd: number }) {
  const bands = useMemo(
    () =>
      makeScreen((ctx, w, h) => {
        // the wall is mostly material; content occupies about a third
        const rows: Array<[number, string]> = [
          [0.1, "#cfcbc4"],
          [0.06, "#22252a"],
          [0.2, "content"],
          [0.05, "#aeb5bd"],
          [0.14, "#3b4048"],
          [0.13, "content2"],
          [0.08, "#22252a"],
          [0.24, "#e6e3dd"],
        ];
        let y = 0;
        for (const [f, c] of rows) {
          const bh = h * f;
          if (c === "content") {
            const g = ctx.createLinearGradient(0, y, w, y + bh);
            g.addColorStop(0, "#3b1f45");
            g.addColorStop(1, "#6d2a72");
            ctx.fillStyle = g;
            ctx.fillRect(0, y, w, bh);
            label(ctx, "SIGNAL  ·  CREATIVE MEDIA DISTRICT", 60, y + bh * 0.28, 46, "#f4dcef", 600, 14);
          } else if (c === "content2") {
            ctx.fillStyle = "#171b22";
            ctx.fillRect(0, y, w, bh);
            label(ctx, "LIVE  1.24M IMPRESSIONS   8.7% ENGAGE   312 APPLICANTS", 60, y + bh * 0.3, 30, "#9fb4c6", 500, 6);
            ctx.fillStyle = "#e0479f";
            ctx.fillRect(60, y + bh * 0.78, 300, 4);
          } else {
            ctx.fillStyle = c;
            ctx.fillRect(0, y, w, bh);
          }
          y += bh;
        }
      }, 2048, 1024),
    [],
  );
  const z = -hd + 1.35;
  return (
    <group position={[0, 0, z]}>
      <mesh material={bands} position={[0, 2.8, 0.06]}>
        <planeGeometry args={[hw * 2 - 2.6, 5.6]} />
      </mesh>
      {/* clear bands: the district is not a sealed box (§14) */}
      {[1.55, 4.35].map((y) => (
        <mesh key={y} material={SIG.clear} position={[0, y, 0.09]}>
          <planeGeometry args={[hw * 2 - 3.2, 0.62]} />
        </mesh>
      ))}
      {/* deep reveal + cove at the head of the wall */}
      <Box w={hw * 2 - 2.6} h={0.5} d={1.3} y={5.6} z={0.62} mat={SIG.pearl} />
      <mesh material={SIG.warm} position={[0, 5.58, 0.9]} rotation-x={Math.PI / 2}>
        <planeGeometry args={[hw * 2 - 3.4, 0.9]} />
      </mesh>
      <mesh material={SIG.magenta} position={[0, 0.28, 0.1]}>
        <planeGeometry args={[hw * 2 - 3.2, 0.06]} />
      </mesh>
    </group>
  );
}

/* ── E. IDEA / SOCIAL ZONE ────────────────────────────────────────── */

function IdeaZone() {
  const board = useMemo(
    () =>
      makeScreen((ctx, w, h) => {
        fillGradient(ctx, w, h, "#f4f2ee", "#e4e0da");
        ctx.fillStyle = "#e0479f";
        ctx.fillRect(0, 0, w, 8);
        label(ctx, "IDEA SURFACE", 40, 40, 40, "#4a4148", 600, 10);
        const c = ["#e0479f", "#b98cf0", "#5fa8d3", "#f2b45f"];
        for (let i = 0; i < 10; i++) {
          ctx.fillStyle = c[i % 4];
          ctx.globalAlpha = 0.22;
          ctx.fillRect(50 + (i % 5) * 190, 130 + Math.floor(i / 5) * 170, 150, 130);
          ctx.globalAlpha = 1;
          ctx.fillStyle = "#8d8792";
          for (let k = 0; k < 3; k++) ctx.fillRect(66 + (i % 5) * 190, 158 + Math.floor(i / 5) * 170 + k * 24, 110 - k * 22, 8);
        }
      }, 1024, 512),
    [],
  );
  return (
    <group position={[6.4, 0, 9.3]} rotation-y={FLOW - 0.5}>
      {/* stepped seating — energy, and somewhere to sit and argue */}
      {[0, 1, 2].map((i) => (
        <Box key={i} w={5.4 - i * 0.5} h={0.42 + i * 0.42} d={0.7} z={-i * 0.7} mat={i === 1 ? SIG.fabric : SIG.pearlDeep} />
      ))}
      <mesh material={SIG.warm} position={[0, 0.44, 0.36]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[5.3, 0.06]} />
      </mesh>
      <group position={[0, 0, -2.4]}>
        <Box w={5.0} h={2.8} d={0.14} mat={SIG.pearl} />
        <mesh material={board} position={[0, 1.62, 0.09]}>
          <planeGeometry args={[4.5, 2.25]} />
        </mesh>
      </group>
      {/* standing rail + coffee point */}
      <group position={[3.9, 0, 1.6]} rotation-y={0.6}>
        <Box w={2.4} h={0.07} d={0.5} y={1.03} mat={SIG.pearl} />
        <Box w={0.09} h={1.03} d={0.4} x={-1.05} mat={SIG.metal} shadow={false} />
        <Box w={0.09} h={1.03} d={0.4} x={1.05} mat={SIG.metal} shadow={false} />
        <mesh material={SIG.magenta} position={[0, 1.07, 0]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[2.3, 0.03]} />
        </mesh>
      </group>
    </group>
  );
}

/* ── ceiling architecture + the tower void ────────────────────────── */

function SignalCeiling({ hw, hd }: { hw: number; hd: number }) {
  // one plate with a hole punched over the arena, so the void is real
  const geo = useMemo(() => {
    const outer = roundedRect(hw * 2 - 2.4, hd * 2 - 2.4, 1.4);
    const hole = roundedRect(12.6, 9.8, 1.0);
    hole.getPoints().forEach(() => undefined);
    const shifted = new THREE.Path();
    const pts = hole.getPoints(24).map((p) => new THREE.Vector2(p.x + ARENA[0], p.y + ARENA[1]));
    shifted.setFromPoints(pts);
    outer.holes.push(shifted);
    return new THREE.ShapeGeometry(outer, 6);
  }, [hw, hd]);
  const fins = useRef<THREE.InstancedMesh>(null);
  const finCount = 7;
  const wrote = useRef(false);
  useFrame(() => {
    if (wrote.current || !fins.current) return;
    wrote.current = true;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    q.setFromEuler(new THREE.Euler(0, FLOW, 0));
    for (let i = 0; i < finCount; i++) {
      const t = -3.2 + (6.4 * i) / (finCount - 1);
      m.compose(new THREE.Vector3(t, 0, 2.0), q, new THREE.Vector3(0.06, 0.22, 7.0));
      fins.current.setMatrixAt(i, m);
    }
    fins.current.count = finCount;
    fins.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <group>
      {/* the ceiling slopes with the flow: 4.9 m at the entrance side */}
      <mesh
        geometry={geo}
        material={SIG.blackSoft}
        position={[0, 5.15, 0]}
        rotation={[Math.PI / 2, 0, 0]}
      />
      <mesh material={SIG.black} position={[0, 5.3, hd - 6.0]} rotation-x={Math.PI / 2}>
        <planeGeometry args={[hw * 2 - 3.0, 6.0]} />
      </mesh>
      <Cove w={13.0} d={10.2} y={5.12} x={ARENA[0]} z={ARENA[1]} t={0.34} r={1.0} mat={SIG.warm} />
      {/* acoustic fins on the diagonal, over the production side */}
      <group position={[-7.6, 4.78, 1.0]}>
        <instancedMesh ref={fins} args={[undefined, undefined, finCount]} material={SIG.pearl}>
          <boxGeometry />
        </instancedMesh>
      </group>
      {/* the void: a lit well rising into the tower */}
      <group position={[ARENA[0], 0, ARENA[1]]}>
        {[
          [0, -4.9, 0],
          [0, 4.9, Math.PI],
          [-6.3, 0, Math.PI / 2],
          [6.3, 0, -Math.PI / 2],
        ].map(([x, z, r], i) => (
          <mesh
            key={i}
            material={SIG.pearl}
            position={[x, 9.9, z]}
            rotation-y={r}
            receiveShadow
          >
            <planeGeometry args={[i < 2 ? 12.6 : 9.8, 9.5]} />
          </mesh>
        ))}
        <mesh material={SIG.smoked} position={[0, 14.6, 0]} rotation-x={Math.PI / 2}>
          <planeGeometry args={[12.6, 9.8]} />
        </mesh>
        <Cove w={13.0} d={10.2} y={14.5} t={0.3} r={1.0} mat={SIG.warm} />
      </group>
      {/* suspended bridge: an upper media level you can see but not walk */}
      <group position={[ARENA[0], 0, ARENA[1]]} rotation-y={FLOW + 0.5}>
        <Box w={16.0} h={0.34} d={2.2} y={7.4} mat={SIG.pearl} />
        <mesh material={SIG.smoked} position={[0, 8.15, 1.1]}>
          <planeGeometry args={[16.0, 1.1]} />
        </mesh>
        <mesh material={SIG.smoked} position={[0, 8.15, -1.1]}>
          <planeGeometry args={[16.0, 1.1]} />
        </mesh>
        <mesh material={SIG.warm} position={[0, 7.38, 0]} rotation-x={Math.PI / 2}>
          <planeGeometry args={[15.4, 1.9]} />
        </mesh>
      </group>
    </group>
  );
}

/* ── lighting: four layers, so figures separate from background ──── */

function SignalLights() {
  return (
    <>
      {/* warm pools at the work surfaces */}
      {[
        [-8.4, -2.4],
        [-7.9, 0.9],
        [-7.3, 4.2],
        [-6.8, 7.5],
      ].map(([x, z], i) => (
        <pointLight key={i} position={[x, 2.5, z]} intensity={26} color="#ffdcb4" distance={7} decay={2} />
      ))}
      {/* the campaign table */}
      <pointLight position={[ARENA[0], 3.4, ARENA[1]]} intensity={110} color="#fff0e2" distance={16} decay={2} />
      {/* studio key, directional-feeling */}
      <spotLight
        position={[-7.0, 4.0, -5.6]}
        target-position={[-7.0, 1.2, -11.6]}
        angle={0.7}
        penumbra={0.7}
        intensity={140}
        color="#fff6ea"
        distance={20}
        decay={2}
      />
      {/* daylight wash from the media wall's clear bands */}
      <pointLight position={[0, 3.6, -12.0]} intensity={70} color="#e8f1fb" distance={20} decay={2} />
      {/* idea zone, a touch warmer */}
      <pointLight position={[6.4, 2.6, 8.4]} intensity={55} color="#ffe4cc" distance={12} decay={2} />
    </>
  );
}

/* ── the district ─────────────────────────────────────────────────── */

export function SignalDistrict({ hw, hd }: { hw: number; hd: number }) {
  return (
    <group>
      <MediaFlowFloor hw={hw} hd={hd} />
      <SignalCeiling hw={hw} hd={hd} />
      <AngledSpine />
      <MediaWall hw={hw} hd={hd} />
      <CampaignArena />
      <Constellation />
      <MediaHalo />
      <HaloRigging />
      <EditingDeck />
      <ContentStudio />
      <IdeaZone />
      <SignalLights />
    </group>
  );
}

/** Mid-distance read: the district's silhouette from across the campus. */
export function SignalDistant({ hw, hd }: { hw: number; hd: number }) {
  return (
    <group>
      <Plate w={hw * 2 - 2.6} d={hd * 2 - 2.6} y={0.03} r={1.4} mat={SIG.stoneDark} />
      <MediaWall hw={hw} hd={hd} />
      <MediaHalo />
      <AngledSpine />
    </group>
  );
}
