"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { AREAS, AREA_BY_ID, WORLD } from "@/lib/game/map";
import type { AreaId } from "@/types/office";
import { MAT, makeTextTexture } from "./materials";
import { u } from "./scale";
import { TwoSidedSign } from "./effects";
import { ROOM_THEMES } from "./themes";

// ANYWARE CENTRAL SPINE (STEP 4.9.3 §15).
//
// The corridor between the two room rows is not a hallway — it is the
// boulevard the whole campus hangs off. It carries the district map,
// wayfinding pylons in each district's accent, planting, rest points
// and an overhead light truss, so walking from one district to the
// next reads as travelling through a city, not crossing a corridor.

/** The corridor band between the north and south room rows. */
const SPINE = {
  x: 0,
  y: 416,
  w: WORLD.w,
  h: 384,
} as const;

const NORTH_ROW: AreaId[] = ["STAFF", "SIGNAL", "PARTNER", "MEETING", "ADMIN"];
const SOUTH_ROW: AreaId[] = ["GREEN", "TABLE", "ENTRANCE", "LOCAL", "AI"];

/** Boulevard paving: broad bands, a center lane and lane markers. */
function useSpineFloor(): THREE.Material {
  return useMemo(() => {
    const N = 512;
    const c = document.createElement("canvas");
    c.width = N;
    c.height = N;
    const ctx = c.getContext("2d")!;
    const g = ctx.createLinearGradient(0, 0, 0, N);
    g.addColorStop(0, "#e6ebf1");
    g.addColorStop(0.5, "#eef2f6");
    g.addColorStop(1, "#e6ebf1");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, N, N);
    // paving joints
    ctx.strokeStyle = "rgba(150,168,186,0.18)";
    ctx.lineWidth = 2;
    for (let x = 0; x <= N; x += 64) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, N); ctx.stroke();
    }
    for (let y = 0; y <= N; y += 128) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(N, y); ctx.stroke();
    }
    // center travel lane
    ctx.fillStyle = "rgba(120,205,240,0.12)";
    ctx.fillRect(0, N * 0.4, N, N * 0.2);
    ctx.strokeStyle = "rgba(62,201,245,0.5)";
    ctx.lineWidth = 3;
    for (const y of [N * 0.4, N * 0.6]) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(N, y); ctx.stroke();
    }
    // directional dashes along the lane
    ctx.strokeStyle = "rgba(255,255,255,0.65)";
    ctx.lineWidth = 4;
    for (let x = 24; x < N; x += 96) {
      ctx.beginPath(); ctx.moveTo(x, N * 0.5); ctx.lineTo(x + 40, N * 0.5); ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(6, 1.4);
    tex.anisotropy = 8;
    return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.4, metalness: 0.06 });
  }, []);
}

/**
 * Wayfinding pylon standing on the spine outside each district, lit in
 * that district's accent — the campus reads as a street of addresses.
 */
function DistrictPylon({
  area,
  x,
  z,
  facing,
}: {
  area: AreaId;
  x: number;
  z: number;
  /** +1 = district lies north, -1 = south */
  facing: 1 | -1;
}) {
  const meta = AREA_BY_ID[area];
  const theme = ROOM_THEMES[area];
  const tex = useMemo(
    () =>
      makeTextTexture(
        [
          { text: meta.label, size: 92, color: "#f2fbff", weight: 800 },
          { text: facing > 0 ? "NORTH WING" : "SOUTH WING", size: 26, color: theme.accent, weight: 600 },
        ],
        { width: 512, height: 220, background: "#0c1626", backgroundTo: "#17293f", tracking: 6 },
      ),
    [meta.label, theme.accent, facing],
  );
  const accent = useMemo(
    () => new THREE.MeshBasicMaterial({ color: theme.accent, toneMapped: false }),
    [theme.accent],
  );
  return (
    <group position={[x, 0, z]}>
      <mesh material={MAT.pearl} position={[0, 2.6, 0]} castShadow>
        <boxGeometry args={[0.5, 5.2, 0.5]} />
      </mesh>
      <mesh material={accent} position={[0, 2.6, 0.27]}>
        <boxGeometry args={[0.1, 4.6, 0.02]} />
      </mesh>
      <mesh material={accent} position={[0, 2.6, -0.27]}>
        <boxGeometry args={[0.1, 4.6, 0.02]} />
      </mesh>
      <TwoSidedSign texture={tex} width={2.6} height={1.12} position={[0, 4.4, 0.3]} />
      {/* accent halo on the paving */}
      <mesh material={accent} rotation-x={-Math.PI / 2} position={[0, 0.03, 0]}>
        <ringGeometry args={[1.1, 1.28, 32]} />
      </mesh>
    </group>
  );
}

/** The floating campus map at the spine's midpoint. */
function DistrictMap() {
  const group = useRef<THREE.Group>(null);
  const plateMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#7fd7ff",
        transparent: true,
        opacity: 0.15,
        toneMapped: false,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    [],
  );
  const tex = useMemo(
    () =>
      makeTextTexture(
        [
          { text: "ANYWARE DISTRICT MAP", size: 54, color: "#eaf7ff", weight: 800 },
          { text: "10 DISTRICTS · ONE CAMPUS", size: 26, color: "#8fc6e8", weight: 600 },
        ],
        { width: 768, height: 200, background: "#0b1524", backgroundTo: "#173252", tracking: 6 },
      ),
    [],
  );
  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const t = performance.now() / 1000;
    g.rotation.y = t * 0.16;
    g.position.y = 5.2 + Math.sin(t * 0.45) * 0.12;
  });
  // Each district as a small tile floating in plan formation.
  const tiles = useMemo(
    () =>
      AREAS.map((a) => ({
        id: a.id,
        // plan position normalised into a 7m x 4m holo plate
        px: ((a.bounds.x + a.bounds.w / 2) / WORLD.w - 0.5) * 7,
        pz: ((a.bounds.y + a.bounds.h / 2) / WORLD.h - 0.5) * 4,
        color: ROOM_THEMES[a.id].accent,
      })),
    [],
  );
  const cx = u(SPINE.x + SPINE.w / 2);
  const cz = u(SPINE.y + SPINE.h / 2);
  return (
    <group position={[cx, 0, cz]}>
      {/* podium */}
      <mesh material={MAT.pearl} position={[0, 0.35, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[2.6, 3.0, 0.7, 28]} />
      </mesh>
      <mesh material={MAT.neonCyan} position={[0, 0.72, 0]}>
        <cylinderGeometry args={[2.62, 2.62, 0.05, 28]} />
      </mesh>
      <group ref={group} position={[0, 5.2, 0]}>
        <mesh material={plateMat} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[7.6, 4.6]} />
        </mesh>
        {tiles.map((t) => (
          <mesh key={t.id} position={[t.px, 0.12, t.pz]} rotation-x={-Math.PI / 2}>
            <planeGeometry args={[1.1, 0.75]} />
            <meshBasicMaterial color={t.color} transparent opacity={0.75} toneMapped={false} />
          </mesh>
        ))}
      </group>
      <TwoSidedSign texture={tex} width={4.6} height={1.2} position={[0, 3.3, 0]} />
    </group>
  );
}

/** Overhead light truss spanning the boulevard. */
function SpineTruss() {
  const specs = useMemo(() => {
    const out: Array<{ x: number }> = [];
    for (let x = 120; x < WORLD.w; x += 220) out.push({ x });
    return out;
  }, []);
  const z0 = u(SPINE.y) + 1.2;
  const z1 = u(SPINE.y + SPINE.h) - 1.2;
  return (
    <group>
      {specs.map((s, i) => (
        <group key={i} position={[u(s.x), 0, 0]}>
          <mesh material={MAT.brushed} position={[0, 7.4, (z0 + z1) / 2]}>
            <boxGeometry args={[0.22, 0.22, z1 - z0]} />
          </mesh>
          <mesh material={MAT.neonWhite} position={[0, 7.24, (z0 + z1) / 2]}>
            <boxGeometry args={[0.1, 0.05, (z1 - z0) * 0.9]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Planting islands and rest points scattered along the boulevard. */
function SpineRest() {
  const spots = useMemo(
    () => [
      { x: 250, y: 620 }, { x: 560, y: 560 }, { x: 880, y: 640 },
      { x: 1200, y: 560 }, { x: 1520, y: 620 },
    ],
    [],
  );
  return (
    <group>
      {spots.map((s, i) => (
        <group key={i} position={[u(s.x), 0, u(s.y)]}>
          {/* planter ring */}
          <mesh material={MAT.pearl} position={[0, 0.3, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[1.5, 1.65, 0.6, 20]} />
          </mesh>
          <mesh material={MAT.leaf} position={[0, 0.75, 0]}>
            <sphereGeometry args={[1.25, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
          </mesh>
          {/* bench pair facing the lane */}
          {[-2.5, 2.5].map((dz) => (
            <mesh key={dz} material={MAT.resinWhite} position={[0, 0.42, dz]} castShadow>
              <boxGeometry args={[2.6, 0.16, 0.6]} />
            </mesh>
          ))}
          {[-2.5, 2.5].map((dz) => (
            <mesh key={`l${dz}`} material={MAT.matteSilver} position={[0, 0.17, dz]}>
              <boxGeometry args={[2.2, 0.34, 0.12]} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

/** The whole boulevard. */
export function CentralSpine() {
  const floor = useSpineFloor();
  const cx = u(SPINE.x + SPINE.w / 2);
  const cz = u(SPINE.y + SPINE.h / 2);
  const pylons = useMemo(() => {
    const out: Array<{ area: AreaId; x: number; z: number; facing: 1 | -1 }> = [];
    for (const id of NORTH_ROW) {
      const b = AREA_BY_ID[id].bounds;
      out.push({ area: id, x: u(b.x + b.w / 2) - 3.6, z: u(SPINE.y) + 2.6, facing: 1 });
    }
    for (const id of SOUTH_ROW) {
      const b = AREA_BY_ID[id].bounds;
      out.push({ area: id, x: u(b.x + b.w / 2) + 3.6, z: u(SPINE.y + SPINE.h) - 2.6, facing: -1 });
    }
    return out;
  }, []);
  return (
    <group>
      <mesh
        material={floor}
        rotation-x={-Math.PI / 2}
        position={[cx, 0.014, cz]}
        receiveShadow
      >
        <planeGeometry args={[u(SPINE.w), u(SPINE.h)]} />
      </mesh>
      {pylons.map((p) => (
        <DistrictPylon key={`${p.area}${p.facing}`} area={p.area} x={p.x} z={p.z} facing={p.facing} />
      ))}
      <DistrictMap />
      <SpineTruss />
      <SpineRest />
    </group>
  );
}
