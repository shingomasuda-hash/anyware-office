"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { LUX } from "./lux";

/**
 * LUXURY METAVERSE PASS — architectural kit.
 *
 * The parts a premium interior is actually made of: ceiling layers with
 * hidden coves, inset floors with edge light, glass partitions with
 * brushed frames, real seating at human scale, and floating information
 * panes. Every piece is authored in LOCAL METRES around a building's
 * centre, with +Z pointing out of its entrance.
 *
 * Two rules kept throughout:
 *   · a rectangular frame is ONE mesh (Shape + hole), not four boxes —
 *     coves and reveals are everywhere, so this is the difference
 *     between a rich room and a draw-call problem;
 *   · anything repeated more than a handful of times is instanced.
 */

export function roundedRect(w: number, d: number, r: number): THREE.Shape {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -d / 2;
  const rr = Math.min(r, w / 2, d / 2);
  s.moveTo(x + rr, y);
  s.lineTo(x + w - rr, y);
  s.quadraticCurveTo(x + w, y, x + w, y + rr);
  s.lineTo(x + w, y + d - rr);
  s.quadraticCurveTo(x + w, y + d, x + w - rr, y + d);
  s.lineTo(x + rr, y + d);
  s.quadraticCurveTo(x, y + d, x, y + d - rr);
  s.lineTo(x, y + rr);
  s.quadraticCurveTo(x, y, x + rr, y);
  return s;
}

function frameShape(w: number, d: number, t: number, r: number): THREE.Shape {
  const outer = roundedRect(w, d, r);
  outer.holes.push(roundedRect(w - t * 2, d - t * 2, Math.max(0.01, r - t)));
  return outer;
}

/** Horizontal rounded plate — ceiling layer, floor inlay, canopy. */
export function Plate({
  w,
  d,
  y,
  x = 0,
  z = 0,
  r = 1.2,
  mat,
  faceDown = false,
  rotY = 0,
}: {
  w: number;
  d: number;
  y: number;
  x?: number;
  z?: number;
  r?: number;
  mat: THREE.Material;
  faceDown?: boolean;
  rotY?: number;
}) {
  const geo = useMemo(() => new THREE.ShapeGeometry(roundedRect(w, d, r), 4), [w, d, r]);
  return (
    <mesh
      geometry={geo}
      material={mat}
      position={[x, y, z]}
      rotation={[faceDown ? Math.PI / 2 : -Math.PI / 2, 0, rotY]}
      receiveShadow={!faceDown}
    />
  );
}

/** Hidden cove / light reveal: a glowing rectangular ring, one mesh. */
export function Cove({
  w,
  d,
  y,
  x = 0,
  z = 0,
  t = 0.22,
  r = 1.2,
  mat = LUX.cove,
  faceDown = true,
}: {
  w: number;
  d: number;
  y: number;
  x?: number;
  z?: number;
  t?: number;
  r?: number;
  mat?: THREE.Material;
  faceDown?: boolean;
}) {
  const geo = useMemo(() => new THREE.ShapeGeometry(frameShape(w, d, t, r), 4), [w, d, t, r]);
  return (
    <mesh
      geometry={geo}
      material={mat}
      position={[x, y, z]}
      rotation={[faceDown ? Math.PI / 2 : -Math.PI / 2, 0, 0]}
    />
  );
}

/**
 * Ceiling composition: two floating layers with a lit reveal between
 * them. This single move is most of what separates "a room with a
 * ceiling" from "architecture".
 */
export function CeilingLayers({
  w,
  d,
  base,
  x = 0,
  z = 0,
  lift = 0.85,
  inset = 2.4,
  mat = LUX.pearl,
  upper = LUX.pearlDeep,
}: {
  w: number;
  d: number;
  base: number;
  x?: number;
  z?: number;
  lift?: number;
  inset?: number;
  mat?: THREE.Material;
  upper?: THREE.Material;
}) {
  return (
    <group position={[x, 0, z]}>
      <Plate w={w} d={d} y={base + lift} r={1.6} mat={upper} faceDown />
      <Plate w={w - inset * 2} d={d - inset * 2} y={base} r={1.4} mat={mat} faceDown />
      <Cove w={w - inset * 2 + 0.5} d={d - inset * 2 + 0.5} y={base + 0.06} t={0.3} r={1.4} />
    </group>
  );
}

/** Floor composition: inset material change plus a lit edge. */
export function FloorInlay({
  w,
  d,
  x = 0,
  z = 0,
  mat = LUX.stoneDark,
  r = 1.0,
  edge = true,
}: {
  w: number;
  d: number;
  x?: number;
  z?: number;
  mat?: THREE.Material;
  r?: number;
  edge?: boolean;
}) {
  return (
    <group position={[x, 0, z]}>
      <Plate w={w} d={d} y={0.045} r={r} mat={mat} />
      {edge ? <Cove w={w + 0.34} d={d + 0.34} y={0.05} t={0.14} r={r} mat={LUX.edge} faceDown={false} /> : null}
    </group>
  );
}

export function Box({
  w,
  h,
  d,
  x = 0,
  y = 0,
  z = 0,
  mat,
  rotY = 0,
  shadow = true,
}: {
  w: number;
  h: number;
  d: number;
  x?: number;
  y?: number;
  z?: number;
  mat: THREE.Material;
  rotY?: number;
  shadow?: boolean;
}) {
  return (
    <mesh
      material={mat}
      position={[x, y + h / 2, z]}
      rotation-y={rotY}
      castShadow={shadow}
      receiveShadow={shadow}
    >
      <boxGeometry args={[w, h, d]} />
    </mesh>
  );
}

/** Glass partition run with a brushed sill and head — one wall plane. */
export function GlassWall({
  w,
  h = 3.0,
  x = 0,
  y = 0,
  z = 0,
  rotY = 0,
  mat = LUX.clearGlass,
}: {
  w: number;
  h?: number;
  x?: number;
  y?: number;
  z?: number;
  rotY?: number;
  mat?: THREE.Material;
}) {
  return (
    <group position={[x, y, z]} rotation-y={rotY}>
      <mesh material={mat} position={[0, h / 2, 0]}>
        <planeGeometry args={[w, h]} />
      </mesh>
      <Box w={w} h={0.07} d={0.16} y={0} mat={LUX.silver} shadow={false} />
      <Box w={w} h={0.09} d={0.16} y={h - 0.09} mat={LUX.silver} shadow={false} />
    </group>
  );
}

/** Floating information pane — the digital layer, held quietly. */
export function HoloPane({
  w,
  h,
  x = 0,
  y,
  z = 0,
  rotY = 0,
  mat,
  glow = true,
}: {
  w: number;
  h: number;
  x?: number;
  y: number;
  z?: number;
  rotY?: number;
  mat: THREE.Material;
  glow?: boolean;
}) {
  return (
    <group position={[x, y, z]} rotation-y={rotY}>
      <mesh material={mat}>
        <planeGeometry args={[w, h]} />
      </mesh>
      {glow ? (
        <mesh material={LUX.holoSoft} position={[0, 0, -0.02]}>
          <planeGeometry args={[w + 0.5, h + 0.4]} />
        </mesh>
      ) : null}
      <mesh material={LUX.holo} position={[0, -h / 2 - 0.05, 0.01]}>
        <planeGeometry args={[w, 0.035]} />
      </mesh>
    </group>
  );
}

/** Wall-mounted display with a recessed brushed reveal. */
export function WallScreen({
  w,
  h,
  x = 0,
  y,
  z = 0,
  rotY = 0,
  mat,
}: {
  w: number;
  h: number;
  x?: number;
  y: number;
  z?: number;
  rotY?: number;
  mat: THREE.Material;
}) {
  return (
    <group position={[x, y, z]} rotation-y={rotY}>
      <Box w={w + 0.4} h={h + 0.4} d={0.14} y={-(h + 0.4) / 2} mat={LUX.graphite} shadow={false} />
      <mesh material={mat} position={[0, 0, 0.09]}>
        <planeGeometry args={[w, h]} />
      </mesh>
      <mesh material={LUX.holoSoft} position={[0, -h / 2 - 0.14, 0.09]}>
        <planeGeometry args={[w + 0.4, 0.2]} />
      </mesh>
    </group>
  );
}

// ── furniture, at human scale ────────────────────────────────────────

export function Sofa({
  w = 2.2,
  x = 0,
  z = 0,
  rotY = 0,
  mat = LUX.fabric,
}: {
  w?: number;
  x?: number;
  z?: number;
  rotY?: number;
  mat?: THREE.Material;
}) {
  return (
    <group position={[x, 0, z]} rotation-y={rotY}>
      <Box w={w} h={0.34} d={0.86} y={0.16} mat={mat} />
      <Box w={w} h={0.5} d={0.18} y={0.5} z={-0.34} mat={mat} />
      {[-1, 1].map((s) => (
        <Box key={s} w={0.16} h={0.24} d={0.86} x={(s * (w - 0.16)) / 2} y={0.5} mat={mat} />
      ))}
      <Box w={w - 0.3} h={0.16} d={0.7} y={0} mat={LUX.silverDark} shadow={false} />
    </group>
  );
}

export function Armchair({
  x = 0,
  z = 0,
  rotY = 0,
  mat = LUX.fabricWarm,
}: {
  x?: number;
  z?: number;
  rotY?: number;
  mat?: THREE.Material;
}) {
  return (
    <group position={[x, 0, z]} rotation-y={rotY}>
      <Box w={0.82} h={0.3} d={0.78} y={0.2} mat={mat} />
      <Box w={0.82} h={0.46} d={0.16} y={0.5} z={-0.31} mat={mat} />
      <Box w={0.6} h={0.2} d={0.6} y={0} mat={LUX.silverDark} shadow={false} />
    </group>
  );
}

export function LowTable({
  w = 1.1,
  d = 0.7,
  x = 0,
  z = 0,
  mat = LUX.wood,
}: {
  w?: number;
  d?: number;
  x?: number;
  z?: number;
  mat?: THREE.Material;
}) {
  return (
    <group position={[x, 0, z]}>
      <Box w={w} h={0.07} d={d} y={0.42} mat={mat} />
      <Box w={w * 0.5} h={0.42} d={d * 0.5} y={0} mat={LUX.silver} shadow={false} />
    </group>
  );
}

export function Rug({
  w = 3.4,
  d = 2.6,
  x = 0,
  z = 0,
  mat = LUX.rug,
}: {
  w?: number;
  d?: number;
  x?: number;
  z?: number;
  mat?: THREE.Material;
}) {
  return <Plate w={w} d={d} y={0.035} x={x} z={z} r={0.5} mat={mat} />;
}

export function Desk({
  w = 1.6,
  d = 0.75,
  x = 0,
  z = 0,
  rotY = 0,
  screen,
}: {
  w?: number;
  d?: number;
  x?: number;
  z?: number;
  rotY?: number;
  screen?: THREE.Material;
}) {
  return (
    <group position={[x, 0, z]} rotation-y={rotY}>
      <Box w={w} h={0.05} d={d} y={0.72} mat={LUX.pearl} />
      {[-1, 1].map((s) => (
        <Box key={s} w={0.06} h={0.72} d={d - 0.14} x={(s * (w - 0.12)) / 2} y={0} mat={LUX.silver} shadow={false} />
      ))}
      {screen ? (
        <group position={[0, 0.77, -0.12]}>
          <Box w={0.05} h={0.26} d={0.05} mat={LUX.silverDark} shadow={false} />
          <mesh material={screen} position={[0, 0.52, 0.02]}>
            <planeGeometry args={[0.94, 0.53]} />
          </mesh>
          <Box w={1.0} h={0.59} d={0.03} y={0.225} z={-0.01} mat={LUX.graphite} shadow={false} />
        </group>
      ) : null}
      {/* task light: the small warm note on every desk */}
      <mesh material={LUX.coveSoft} position={[w / 2 - 0.22, 0.775, -d / 2 + 0.16]}>
        <boxGeometry args={[0.34, 0.012, 0.1]} />
      </mesh>
    </group>
  );
}

export function TaskChair({
  x = 0,
  z = 0,
  rotY = 0,
  mat = LUX.fabric,
}: {
  x?: number;
  z?: number;
  rotY?: number;
  mat?: THREE.Material;
}) {
  return (
    <group position={[x, 0, z]} rotation-y={rotY}>
      <Box w={0.5} h={0.08} d={0.48} y={0.44} mat={mat} />
      <Box w={0.46} h={0.5} d={0.07} y={0.52} z={-0.22} mat={mat} />
      <Box w={0.07} h={0.44} d={0.07} y={0} mat={LUX.silverDark} shadow={false} />
      <mesh material={LUX.silverDark} position={[0, 0.04, 0]}>
        <cylinderGeometry args={[0.28, 0.3, 0.05, 12]} />
      </mesh>
    </group>
  );
}

export function Planter({
  r = 0.55,
  x = 0,
  z = 0,
  scale = 1,
}: {
  r?: number;
  x?: number;
  z?: number;
  scale?: number;
}) {
  return (
    <group position={[x, 0, z]} scale={scale}>
      <mesh material={LUX.ceramic} position={[0, 0.32, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[r, r * 0.86, 0.64, 18]} />
      </mesh>
      <mesh material={LUX.soil} position={[0, 0.63, 0]}>
        <cylinderGeometry args={[r - 0.05, r - 0.05, 0.06, 16]} />
      </mesh>
      <mesh material={LUX.trunk} position={[0, 1.35, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.075, 1.5, 8]} />
      </mesh>
      <mesh material={LUX.leaf} position={[0, 2.35, 0]} castShadow>
        <sphereGeometry args={[0.86, 12, 9]} />
      </mesh>
      <mesh material={LUX.leafDeep} position={[0.32, 1.95, 0.2]} castShadow>
        <sphereGeometry args={[0.52, 10, 8]} />
      </mesh>
    </group>
  );
}

/** Low planted bed — used to shape circulation without walls. */
export function GreenBed({
  w,
  d,
  x = 0,
  z = 0,
  rotY = 0,
}: {
  w: number;
  d: number;
  x?: number;
  z?: number;
  rotY?: number;
}) {
  return (
    <group position={[x, 0, z]} rotation-y={rotY}>
      <Box w={w} h={0.42} d={d} mat={LUX.ceramic} />
      <Plate w={w - 0.16} d={d - 0.16} y={0.44} r={0.1} mat={LUX.leafDeep} />
      <Box w={w - 0.5} h={0.34} d={d - 0.35} y={0.44} mat={LUX.leaf} shadow={false} />
    </group>
  );
}

/** Suspended acoustic / architectural slats, instanced. */
export function Slats({
  count,
  span,
  len,
  y,
  x = 0,
  z = 0,
  rotY = 0,
  mat = LUX.pearlDeep,
}: {
  count: number;
  span: number;
  len: number;
  y: number;
  x?: number;
  z?: number;
  rotY?: number;
  mat?: THREE.Material;
}) {
  const ref = (mesh: THREE.InstancedMesh | null) => {
    if (!mesh) return;
    const m = new THREE.Matrix4();
    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0 : -span / 2 + (span * i) / (count - 1);
      m.compose(
        new THREE.Vector3(t, 0, 0),
        new THREE.Quaternion(),
        new THREE.Vector3(0.1, 0.34, len),
      );
      mesh.setMatrixAt(i, m);
    }
    mesh.count = count;
    mesh.instanceMatrix.needsUpdate = true;
  };
  return (
    <group position={[x, y, z]} rotation-y={rotY}>
      <instancedMesh ref={ref} args={[undefined, undefined, count]} material={mat} castShadow>
        <boxGeometry />
      </instancedMesh>
    </group>
  );
}

/** Slim pendant / downlight bar. */
export function LightBar({
  w,
  x = 0,
  y,
  z = 0,
  rotY = 0,
}: {
  w: number;
  x?: number;
  y: number;
  z?: number;
  rotY?: number;
}) {
  return (
    <group position={[x, y, z]} rotation-y={rotY}>
      <Box w={w} h={0.08} d={0.14} mat={LUX.silver} shadow={false} />
      <mesh material={LUX.cove} position={[0, -0.045, 0]} rotation-x={Math.PI / 2}>
        <planeGeometry args={[w - 0.1, 0.1]} />
      </mesh>
    </group>
  );
}
