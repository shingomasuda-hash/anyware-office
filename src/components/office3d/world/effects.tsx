"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { MAT, makeTextTexture } from "./materials";

// World-scale layer (STEP 4.9.2): sky, metaverse district skyline,
// greenery and ambient motion. Heavy repetition is instanced — trees,
// towers and orbs cost a handful of draw calls in total instead of
// one call per object.

/* ── gradient sky dome ─────────────────────────────────────────────── */
export function SkyDome() {
  const mat = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 512;
    const ctx = canvas.getContext("2d")!;
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, "#5fb4f2");
    grad.addColorStop(0.45, "#a8d2f7");
    grad.addColorStop(0.72, "#dfd8f7");
    grad.addColorStop(1, "#f7dcef");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 512);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshBasicMaterial({
      map: tex,
      side: THREE.BackSide,
      toneMapped: false,
      fog: false,
      depthWrite: false,
    });
  }, []);
  return (
    <mesh material={mat} position={[22, 0, 15]}>
      <sphereGeometry args={[95, 24, 12]} />
    </mesh>
  );
}

/* ── instancing helper ─────────────────────────────────────────────── */
export interface InstanceSpec {
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
  ry?: number;
}

export function writeInstances(
  mesh: THREE.InstancedMesh | null,
  specs: InstanceSpec[],
  hidden?: (i: number) => boolean,
) {
  if (!mesh) return;
  const dummy = new THREE.Object3D();
  for (let i = 0; i < specs.length; i++) {
    const s = specs[i];
    if (hidden?.(i)) {
      dummy.position.set(0, -50, 0);
      dummy.scale.setScalar(0.0001);
      dummy.rotation.set(0, 0, 0);
    } else {
      dummy.position.set(s.x, s.y, s.z);
      dummy.scale.set(s.sx, s.sy, s.sz);
      dummy.rotation.set(0, s.ry ?? 0, 0);
    }
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
}

export function StaticBoxes({
  material,
  specs,
  shadow = false,
}: {
  material: THREE.Material;
  specs: InstanceSpec[];
  shadow?: boolean;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    writeInstances(ref.current, specs);
  }, [specs]);
  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, specs.length]}
      material={material}
      castShadow={shadow}
      receiveShadow={shadow}
    >
      <boxGeometry />
    </instancedMesh>
  );
}

/* ── metaverse district skyline ────────────────────────────────────── */
function towerTexture(base: string, win1: string, win2: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 64, 128);
  for (let y = 6; y < 122; y += 10) {
    for (let x = 6; x < 58; x += 12) {
      const r = (x * 31 + y * 17) % 10;
      if (r < 4) continue;
      ctx.fillStyle = r > 7 ? win2 : win1;
      ctx.fillRect(x, y, 7, 5);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });
}

export function MetaCity() {
  const mats = useMemo(
    () => [
      towerTexture("#8ea6d8", "#eaf6ff", "#7fdcff"),
      towerTexture("#a08fd8", "#f3ecff", "#f78ade"),
      towerTexture("#7f9ccc", "#e8f6ff", "#7deccb"),
    ],
    [],
  );
  const adTex = useMemo(
    () =>
      makeTextTexture(
        [
          { text: "AnyWare", size: 120, color: "#eaf6ff", weight: 800 },
          { text: "METAVERSE DISTRICT", size: 42, color: "#7fdcff", weight: 600 },
        ],
        { width: 768, height: 384, background: "#131c34", backgroundTo: "#31255e", tracking: 5 },
      ),
    [],
  );
  const adMat = useMemo(
    () => new THREE.MeshBasicMaterial({ map: adTex, toneMapped: false, side: THREE.DoubleSide }),
    [adTex],
  );
  const { groups, crowns, bridges } = useMemo(() => {
    const spots = [
      { x: -14, z: -12 }, { x: 0, z: -16 }, { x: 14, z: -14 }, { x: 30, z: -17 },
      { x: 44, z: -13 }, { x: 58, z: -8 }, { x: 60, z: 8 }, { x: 58, z: 24 },
      { x: 52, z: 38 }, { x: 30, z: 44 }, { x: 8, z: 44 }, { x: -12, z: 40 },
      { x: -18, z: 20 }, { x: -18, z: 4 }, { x: -10, z: -18 }, { x: 40, z: 48 },
    ];
    const groups: InstanceSpec[][] = [[], [], []];
    const crowns: InstanceSpec[][] = [[], [], []];
    spots.forEach((p, i) => {
      const w = 3.5 + ((i * 29) % 5);
      const h = 6 + ((i * 47) % 17);
      const m = i % 3;
      groups[m].push({ x: p.x, y: h / 2 - 0.1, z: p.z, sx: w, sy: h, sz: w });
      // setbacks give the skyline silhouette variety
      if (i % 2 === 0) {
        const cw = w * 0.55;
        const ch = 2 + ((i * 13) % 4);
        crowns[(m + 1) % 3].push({ x: p.x, y: h + ch / 2 - 0.1, z: p.z, sx: cw, sy: ch, sz: cw });
      }
    });
    const bridges: InstanceSpec[] = [
      { x: 7, y: 9.4, z: -15, sx: 14, sy: 0.5, sz: 1.4 },
      { x: 55, y: 12.2, z: 16, sx: 1.4, sy: 0.5, sz: 16 },
      { x: 19, y: 14.5, z: 45.5, sx: 22, sy: 0.5, sz: 1.4 },
    ];
    return { groups, crowns, bridges };
  }, []);
  return (
    <group>
      {mats.map((m, i) => (
        <group key={i}>
          <StaticBoxes material={m} specs={groups[i]} />
          <StaticBoxes material={m} specs={crowns[i]} />
        </group>
      ))}
      <StaticBoxes material={MAT.brushed} specs={bridges} />
      {/* elevated walkway with a glass parapet (district circulation) */}
      <StaticBoxes
        material={MAT.brushed}
        specs={[{ x: 20, y: 5.6, z: -13.5, sx: 19, sy: 0.35, sz: 1.5 }]}
      />
      <mesh material={MAT.glass} position={[20, 6.25, -12.8]}>
        <planeGeometry args={[19, 0.9]} />
      </mesh>
      {/* lit facade stripes on two towers */}
      <StaticBoxes
        material={MAT.neonWhite}
        specs={[
          { x: 12.2, y: 5.5, z: -13.9, sx: 0.18, sy: 11, sz: 0.18 },
          { x: 57.9, y: 7.5, z: 24.2, sx: 0.18, sy: 15, sz: 0.18 },
        ]}
      />
      {/* green terraces on tower setbacks */}
      <StaticBoxes
        material={MAT.leaf}
        specs={[
          { x: 13, y: 12.6, z: -14, sx: 1.6, sy: 0.9, sz: 1.6 },
          { x: 15.6, y: 12.4, z: -13.4, sx: 1.1, sy: 0.7, sz: 1.1 },
          { x: 58.6, y: 13.3, z: 8.6, sx: 1.4, sy: 0.8, sz: 1.4 },
          { x: 30.8, y: 15.2, z: -16.6, sx: 1.5, sy: 0.9, sz: 1.5 },
        ]}
      />
      {/* giant district billboard facing the campus */}
      <group position={[0, 12.4, -15.8]} rotation-y={0.25}>
        <mesh material={adMat}>
          <planeGeometry args={[7.2, 3.6]} />
        </mesh>
        <mesh material={MAT.neonMagenta} position={[0, -1.86, 0.02]}>
          <boxGeometry args={[7.2, 0.05, 0.05]} />
        </mesh>
      </group>
    </group>
  );
}

/* ── instanced greenery ring ───────────────────────────────────────── */
export function Nature() {
  const { trunks, leafA, leafB } = useMemo(() => {
    const ring = [
      ...Array.from({ length: 7 }, (_, i) => ({ x: -5 + i * 8.5, z: -5.5 })),
      ...Array.from({ length: 7 }, (_, i) => ({ x: -5 + i * 8.5, z: 35.5 })),
      ...Array.from({ length: 3 }, (_, i) => ({ x: -6, z: 3 + i * 10 })),
      ...Array.from({ length: 3 }, (_, i) => ({ x: 50, z: 3 + i * 10 })),
    ];
    const trunks: InstanceSpec[] = [];
    const leafA: InstanceSpec[] = [];
    const leafB: InstanceSpec[] = [];
    ring.forEach((p, i) => {
      const s = 0.8 + ((i * 37) % 10) / 14;
      trunks.push({ x: p.x, y: 0.6 * s, z: p.z, sx: s * 0.28, sy: s * 1.2, sz: s * 0.28 });
      (i % 3 === 0 ? leafB : leafA).push({
        x: p.x, y: 1.8 * s, z: p.z, sx: s * 2.2, sy: s * 2.2, sz: s * 2.2,
      });
    });
    return { trunks, leafA, leafB };
  }, []);
  const leafGeo = useMemo(() => new THREE.IcosahedronGeometry(0.5, 1), []);
  const trunkGeo = useMemo(() => new THREE.CylinderGeometry(0.5, 0.6, 1, 6), []);
  const refs = [useRef<THREE.InstancedMesh>(null), useRef<THREE.InstancedMesh>(null), useRef<THREE.InstancedMesh>(null)];
  useLayoutEffect(() => {
    writeInstances(refs[0].current, trunks);
    writeInstances(refs[1].current, leafA);
    writeInstances(refs[2].current, leafB);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trunks, leafA, leafB]);
  return (
    <group>
      <mesh material={MAT.grass} rotation-x={-Math.PI / 2} position={[22, -0.03, 15]} receiveShadow>
        <planeGeometry args={[140, 120]} />
      </mesh>
      <instancedMesh ref={refs[0]} args={[trunkGeo, undefined, trunks.length]} material={MAT.trunk} />
      <instancedMesh ref={refs[1]} args={[leafGeo, undefined, leafA.length]} material={MAT.leaf} castShadow />
      <instancedMesh ref={refs[2]} args={[leafGeo, undefined, leafB.length]} material={MAT.leafDark} />
    </group>
  );
}

/* ── drifting glow orbs (one draw call) ────────────────────────────── */
export function FloatingOrbs() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const orbs = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        x: [21, 24.5, 18.5, 27, 15, 31, 9, 36, 5, 40, 12.5, 33.5][i],
        z: [26.5, 24, 22.5, 27.5, 14, 13, 17, 16, 9, 22, 27.9, 25][i],
        y: 3 + ((i * 23) % 30) / 10,
        r: 0.16 + ((i * 17) % 12) / 60,
        speed: 0.35 + ((i * 13) % 10) / 22,
        phase: i * 1.7,
        color: ["#7fdcff", "#f78ade", "#c0a6ff", "#7deccb"][i % 4],
      })),
    [],
  );
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useLayoutEffect(() => {
    const inst = ref.current;
    if (!inst) return;
    for (let i = 0; i < orbs.length; i++) inst.setColorAt(i, new THREE.Color(orbs[i].color));
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
  }, [orbs]);
  useFrame(() => {
    const inst = ref.current;
    if (!inst) return;
    const t = performance.now() / 1000;
    for (let i = 0; i < orbs.length; i++) {
      const o = orbs[i];
      dummy.position.set(o.x, o.y + Math.sin(t * o.speed + o.phase) * 0.35, o.z);
      dummy.scale.setScalar(o.r);
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);
    }
    inst.instanceMatrix.needsUpdate = true;
  });
  const mat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#ffffff",
        transparent: true,
        opacity: 0.85,
        toneMapped: false,
      }),
    [],
  );
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, orbs.length]} material={mat}>
      <sphereGeometry args={[1, 12, 10]} />
    </instancedMesh>
  );
}

/* ── distant floating vehicles ─────────────────────────────────────── */
export function Vehicles() {
  const a = useRef<THREE.Group>(null);
  const b = useRef<THREE.Group>(null);
  useFrame(() => {
    const t = performance.now() / 1000;
    if (a.current) {
      const ang = t * 0.045;
      a.current.position.set(22 + Math.cos(ang) * 42, 16, 15 + Math.sin(ang) * 36);
      a.current.rotation.y = -ang;
    }
    if (b.current) {
      const ang = -t * 0.06 + 2.1;
      b.current.position.set(22 + Math.cos(ang) * 47, 19, 15 + Math.sin(ang) * 40);
      b.current.rotation.y = -ang + Math.PI;
    }
  });
  const body = (
    <>
      <mesh material={MAT.pearl}>
        <capsuleGeometry args={[0.35, 1.3, 6, 12]} />
      </mesh>
      <mesh material={MAT.neonCyan} position={[0, -0.12, 0]}>
        <boxGeometry args={[0.1, 0.06, 1.6]} />
      </mesh>
    </>
  );
  return (
    <group>
      <group ref={a} rotation-z={Math.PI / 2}>{body}</group>
      <group ref={b} rotation-z={Math.PI / 2}>{body}</group>
    </group>
  );
}
