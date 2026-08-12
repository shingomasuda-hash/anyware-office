"use client";

import { memo, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { FURNITURE, WALLS } from "@/lib/game/map";
import type { Rect } from "@/types/office";
import type { LabSim } from "../LabSim";
import { type Building, BUILDINGS } from "./campus";
import { MAT, makeTextTexture } from "./materials";
import { ROOM_THEMES } from "./themes";
import { fu, u } from "./scale";

/**
 * M1 WHITE MASSING MODEL (§3).
 *
 * Ten buildings, ten silhouettes. No materials study, no interior
 * detail, no decoration — but footprint, height, orientation, entrance
 * position and basic massing are decided here and will not move again.
 *
 * Everything inside a BuildingFrame is authored in LOCAL metres with
 * the room centre at the origin and +Z pointing out of the entrance,
 * so a massing reads the same wherever its building sits on the ring.
 */

const SHELL = 4.6; // default enclosure height, metres

/** Canonical rects belonging to one room, in local metres. */
function localRects(b: Building, rects: readonly Rect[], furniture = false) {
  const out: Array<{ x: number; z: number; w: number; d: number }> = [];
  for (const r of rects) {
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;
    if (
      cx < b.bounds.x ||
      cx > b.bounds.x + b.bounds.w ||
      cy < b.bounds.y ||
      cy > b.bounds.y + b.bounds.h
    ) {
      continue;
    }
    out.push({
      x: u(cx - b.canon.x) * b.frontSign,
      z: u(cy - b.canon.y) * b.frontSign,
      w: furniture ? fu(r.w) : u(r.w),
      d: furniture ? fu(r.h) : u(r.h),
    });
  }
  return out;
}

/**
 * Places a building's local metre-space into the campus. The extra
 * half-turn for south-row rooms lets every massing be authored with
 * its entrance on +Z regardless of which way the canonical door faced.
 */
function BuildingFrame({
  b,
  children,
}: {
  b: Building;
  children: React.ReactNode;
}) {
  const flip = b.frontSign > 0 ? 0 : Math.PI;
  return (
    <group
      position={[u(b.center.x), 0, u(b.center.y)]}
      rotation-y={-b.phi + flip}
    >
      {children}
    </group>
  );
}

/** Roof group that dissolves while you are inside this building (§9). */
function Roof({
  b,
  sim,
  children,
}: {
  b: Building;
  sim: LabSim;
  children: React.ReactNode;
}) {
  const g = useRef<THREE.Group>(null);
  const level = useRef(1);
  const owned = useRef(false);
  const last = useRef(performance.now());
  useFrame(() => {
    const grp = g.current;
    if (!grp) return;
    // Roof materials must be this building's own, or fading one roof
    // would fade every roof that shares a palette entry.
    if (!owned.current) {
      owned.current = true;
      grp.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.isMesh && mesh.material && !Array.isArray(mesh.material)) {
          mesh.material = mesh.material.clone();
        }
      });
    }
    const now = performance.now();
    const dt = Math.min((now - last.current) / 1000, 0.3);
    last.current = now;
    const target = sim.getSnapshot().area === b.id ? 0 : 1;
    level.current += (target - level.current) * (1 - Math.exp(-5 * dt));
    const v = level.current;
    grp.visible = v > 0.02;
    grp.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.Material | undefined;
      if (m && !Array.isArray(m) && "opacity" in m) {
        (m as THREE.MeshStandardMaterial).opacity = v;
        m.transparent = v < 0.995;
      }
    });
  });
  return <group ref={g}>{children}</group>;
}

function Slab({
  x = 0,
  y,
  z = 0,
  w,
  h,
  d,
  mat,
  rotY = 0,
}: {
  x?: number;
  y: number;
  z?: number;
  w: number;
  h: number;
  d: number;
  mat: THREE.Material;
  rotY?: number;
}) {
  return (
    <mesh material={mat} position={[x, y, z]} rotation-y={rotY} castShadow receiveShadow>
      <boxGeometry args={[w, h, d]} />
    </mesh>
  );
}

/** The enclosure: exactly the canonical walls, so what blocks you is
 * what you see. Height and material vary per archetype. */
function Shell({
  b,
  height,
  mat,
}: {
  b: Building;
  height: number;
  mat: THREE.Material;
}) {
  const rects = useMemo(() => localRects(b, WALLS), [b]);
  return (
    <group>
      {rects.map((r, i) => (
        <Slab key={i} x={r.x} y={height / 2} z={r.z} w={r.w} h={height} d={r.d} mat={mat} />
      ))}
    </group>
  );
}

/** Interior placeholder: floor plate plus the map's furniture as blocks. */
function InteriorMassing({ b }: { b: Building }) {
  const floorMat = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({
      color: ROOM_THEMES[b.id].floor,
      roughness: 0.72,
    });
    return m;
  }, [b.id]);
  const props = useMemo(() => localRects(b, FURNITURE.map((f) => f.rect), true), [b]);
  return (
    <group>
      <mesh material={floorMat} rotation-x={-Math.PI / 2} position={[0, 0.03, 0]} receiveShadow>
        <planeGeometry args={[u(b.size.w) - 0.4, u(b.size.h) - 0.4]} />
      </mesh>
      {props.map((p, i) => (
        <Slab key={i} x={p.x} y={0.4} z={p.z} w={p.w} h={0.8} d={p.d} mat={MAT.floorMassing} />
      ))}
    </group>
  );
}

/** Entrance marker: canopy + name board, always on the +Z face (§6). */
function EntranceMark({ b, canopyY }: { b: Building; canopyY: number }) {
  const hd = u(b.size.h) / 2;
  const tex = useMemo(
    () =>
      makeTextTexture(
        [
          { text: b.label, size: 96, color: "#20303f", weight: 800 },
          { text: b.subtitle, size: 28, color: "#5f7183", weight: 500 },
        ],
        { width: 768, height: 224, background: "#f2f5f8", backgroundTo: "#dfe6ee", tracking: 5 },
      ),
    [b.label, b.subtitle],
  );
  const signMat = useMemo(
    () => new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }),
    [tex],
  );
  const accent = useMemo(
    () => new THREE.MeshBasicMaterial({ color: b.accent, toneMapped: false }),
    [b.accent],
  );
  return (
    <group>
      {/* canopy over the opening */}
      <Slab y={canopyY} z={hd + 1.1} w={9.4} h={0.28} d={3.4} mat={MAT.resinWhite} />
      {[-4.4, 4.4].map((x) => (
        <Slab key={x} x={x} y={canopyY / 2} z={hd + 2.5} w={0.22} h={canopyY} d={0.22} mat={MAT.matteSilver} />
      ))}
      {/* name board */}
      <mesh material={signMat} position={[0, canopyY + 1.15, hd + 0.16]}>
        <planeGeometry args={[6.4, 1.87]} />
      </mesh>
      <mesh material={accent} position={[0, canopyY + 0.16, hd + 0.17]}>
        <boxGeometry args={[6.4, 0.09, 0.06]} />
      </mesh>
      {/* threshold band on the ground */}
      <mesh material={accent} rotation-x={-Math.PI / 2} position={[0, 0.05, hd + 1.6]}>
        <planeGeometry args={[7.5, 0.5]} />
      </mesh>
    </group>
  );
}

// ── the ten silhouettes ──────────────────────────────────────────────

function Massing({ b, sim }: { b: Building; sim: LabSim }) {
  const hw = u(b.size.w) / 2;
  const hd = u(b.size.h) / 2;
  const H = b.height;
  const roofMat = MAT.wallWarm;
  const deck = MAT.resinWhite;

  switch (b.kind) {
    // ENTRANCE — Monumental Gateway Pavilion
    case "gateway":
      return (
        <>
          <Shell b={b} height={5.0} mat={MAT.wallPaint} />
          <InteriorMassing b={b} />
          {[-hw + 1.6, hw - 1.6].map((x) => (
            <Slab key={x} x={x} y={H / 2} z={hd - 2.2} w={2.4} h={H} d={2.4} mat={MAT.wallPaint} />
          ))}
          <Roof b={b} sim={sim}>
            {/* deep floating canopy reaching past the front */}
            <Slab y={H - 1.6} z={2.2} w={hw * 2 + 5.0} h={0.55} d={hd * 2 + 3.2} mat={deck} />
            <Slab y={H - 1.05} z={2.2} w={hw * 2 + 2.2} h={0.5} d={hd * 2 + 0.8} mat={roofMat} />
          </Roof>
          {/* arrival ring on the campus axis */}
          <mesh material={MAT.matteSilver} position={[0, 5.4, hd + 4.2]} rotation-x={Math.PI / 2}>
            <torusGeometry args={[5.2, 0.26, 8, 28]} />
          </mesh>
          <EntranceMark b={b} canopyY={4.2} />
        </>
      );

    // STAFF — low-rise, wide, curved mass
    case "lowCurve":
      return (
        <>
          <Shell b={b} height={4.4} mat={MAT.wallWarm} />
          <InteriorMassing b={b} />
          <Roof b={b} sim={sim}>
            <Slab y={4.6} w={hw * 2 + 0.8} h={0.4} d={hd * 2 + 0.8} mat={deck} />
            {/* two barrel shells across the width */}
            {[-hd * 0.42, hd * 0.42].map((z) => (
              <mesh
                key={z}
                material={roofMat}
                position={[0, 5.0, z]}
                rotation={[0, 0, Math.PI / 2]}
                castShadow
              >
                <cylinderGeometry args={[hd * 0.42, hd * 0.42, hw * 2 - 1.2, 18, 1, false, 0, Math.PI]} />
              </mesh>
            ))}
            {/* setback upper tier */}
            <Slab y={H - 1.1} z={-hd * 0.3} w={hw * 1.1} h={2.2} d={hd * 0.9} mat={MAT.wallPaint} />
          </Roof>
          <EntranceMark b={b} canopyY={3.6} />
        </>
      );

    // SIGNAL — angled media building
    case "angled":
      return (
        <>
          <Shell b={b} height={5.4} mat={MAT.wallPaint} />
          <InteriorMassing b={b} />
          <Roof b={b} sim={sim}>
            <Slab y={5.7} w={hw * 2 + 0.6} h={0.5} d={hd * 2 + 0.6} mat={deck} />
          </Roof>
          {/* tower: leaning slab + crown, the campus landmark */}
          <group position={[hw * 0.32, 0, -hd * 0.28]} rotation-y={0.33}>
            <mesh material={MAT.wallPaint} position={[0, H / 2 + 2, 0]} rotation-z={0.045} castShadow>
              <boxGeometry args={[7.6, H - 4, 7.0]} />
            </mesh>
            <Slab y={H + 0.4} w={9.2} h={0.7} d={8.6} mat={deck} />
            <mesh material={MAT.matteSilver} position={[0, H + 1.9, 0]} rotation-x={Math.PI / 2}>
              <torusGeometry args={[4.6, 0.2, 6, 22]} />
            </mesh>
          </group>
          {/* media plane facing the plaza */}
          <Slab y={7.6} z={hd + 0.25} w={hw * 1.5} h={4.4} d={0.3} mat={MAT.screenDark} />
          <EntranceMark b={b} canopyY={4.2} />
        </>
      );

    // PARTNER — pavilion under a large overhang
    case "overhang":
      return (
        <>
          <Shell b={b} height={4.8} mat={MAT.wallWarm} />
          <InteriorMassing b={b} />
          <Roof b={b} sim={sim}>
            <Slab y={7.4} w={hw * 2 + 9.0} h={0.62} d={hd * 2 + 7.0} mat={deck} />
            <Slab y={H - 1.2} w={hw * 1.2} h={2.4} d={hd * 1.0} mat={MAT.wallPaint} />
          </Roof>
          {[-1, 1].flatMap((sx) =>
            [-1, 1].map((sz) => (
              <Slab
                key={`${sx}${sz}`}
                x={sx * (hw + 3.4)}
                y={3.7}
                z={sz * (hd + 2.6)}
                w={0.5}
                h={7.4}
                d={0.5}
                mat={MAT.matteSilver}
              />
            )),
          )}
          <EntranceMark b={b} canopyY={4.2} />
        </>
      );

    // TABLE — open terrace mass (roof, almost no walls)
    case "terrace":
      return (
        <>
          <Shell b={b} height={1.15} mat={MAT.wallWarm} />
          <InteriorMassing b={b} />
          <Roof b={b} sim={sim}>
            <Slab y={H - 0.7} w={hw * 2 + 3.6} h={0.45} d={hd * 2 + 3.0} mat={deck} />
            {[-hw * 0.5, 0, hw * 0.5].map((x) => (
              <Slab key={x} x={x} y={H - 0.25} w={2.4} h={0.4} d={hd * 2 + 2.4} mat={MAT.wallWarm} />
            ))}
          </Roof>
          {[-1, 1].flatMap((sx) =>
            [-1, 0, 1].map((sz) => (
              <Slab
                key={`${sx}${sz}`}
                x={sx * (hw - 0.8)}
                y={(H - 0.9) / 2}
                z={sz * (hd - 1.0)}
                w={0.32}
                h={H - 0.9}
                d={0.32}
                mat={MAT.matteSilver}
              />
            )),
          )}
          <EntranceMark b={b} canopyY={3.0} />
        </>
      );

    // GREEN — greenhouse domes
    case "dome":
      return (
        <>
          <Shell b={b} height={2.6} mat={MAT.wallWarm} />
          <InteriorMassing b={b} />
          <Roof b={b} sim={sim}>
            {[-1, 0, 1].map((i) => (
              <mesh
                key={i}
                material={MAT.frost}
                position={[i * (hw * 0.62), 2.4, 0]}
                castShadow
              >
                <sphereGeometry args={[Math.min(hw * 0.34, hd * 0.72), 18, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
              </mesh>
            ))}
            <Slab y={2.5} w={hw * 2 + 0.4} h={0.3} d={hd * 2 + 0.4} mat={deck} />
          </Roof>
          <EntranceMark b={b} canopyY={2.4} />
        </>
      );

    // LOCAL — layered gallery
    case "layered":
      return (
        <>
          <Shell b={b} height={3.4} mat={MAT.wallWarm} />
          <InteriorMassing b={b} />
          <Roof b={b} sim={sim}>
            {[0, 1, 2].map((i) => (
              <Slab
                key={i}
                x={(i - 1) * 1.6}
                y={3.6 + i * 1.15}
                z={-i * 0.9}
                w={hw * 2 + 1.6 - i * 3.2}
                h={0.42}
                d={hd * 2 + 1.2 - i * 2.6}
                mat={i % 2 ? MAT.wallPaint : deck}
              />
            ))}
          </Roof>
          <EntranceMark b={b} canopyY={2.9} />
        </>
      );

    // MEETING — transparent pavilion
    case "transparent":
      return (
        <>
          <Shell b={b} height={5.2} mat={MAT.glassMeeting} />
          <InteriorMassing b={b} />
          <Roof b={b} sim={sim}>
            <Slab y={5.5} w={hw * 2 + 1.8} h={0.36} d={hd * 2 + 1.8} mat={deck} />
            <mesh material={MAT.frost} position={[0, 6.6, 0]} castShadow>
              <sphereGeometry args={[Math.min(hw, hd) * 0.95, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2.6]} />
            </mesh>
            <Slab y={H - 0.3} w={hw * 0.5} h={0.3} d={hd * 0.5} mat={MAT.matteSilver} />
          </Roof>
          <EntranceMark b={b} canopyY={4.0} />
        </>
      );

    // AI — cantilevered volume over the entrance
    case "cantilever":
      return (
        <>
          <Shell b={b} height={5.0} mat={MAT.wallPaint} />
          <InteriorMassing b={b} />
          <Roof b={b} sim={sim}>
            <Slab y={5.3} w={hw * 2 + 0.6} h={0.4} d={hd * 2 + 0.6} mat={deck} />
            <Slab
              y={(H + 6.4) / 2}
              z={hd * 0.45}
              w={hw * 1.7}
              h={H - 6.4}
              d={hd * 1.5}
              mat={MAT.wallWarm}
            />
            <Slab y={H + 0.2} z={hd * 0.45} w={hw * 1.8} h={0.45} d={hd * 1.6} mat={deck} />
          </Roof>
          {[-hw * 0.62, hw * 0.62].map((x) => (
            <Slab key={x} x={x} y={3.2} z={hd + 1.9} w={0.6} h={6.4} d={0.6} mat={MAT.matteSilver} />
          ))}
          <EntranceMark b={b} canopyY={4.2} />
        </>
      );

    // ADMIN — quiet monolithic block
    default:
      return (
        <>
          <Shell b={b} height={2.6} mat={MAT.wallWarm} />
          <InteriorMassing b={b} />
          <Roof b={b} sim={sim}>
            <Slab y={(H + 2.9) / 2} w={hw * 2 + 1.0} h={H - 2.9} d={hd * 2 + 1.0} mat={MAT.wallPaint} />
            <Slab y={H + 0.25} w={hw * 2 + 1.6} h={0.4} d={hd * 2 + 1.6} mat={deck} />
          </Roof>
          {[-1, 1].flatMap((sx) =>
            [-1, 1].map((sz) => (
              <Slab
                key={`${sx}${sz}`}
                x={sx * (hw - 0.6)}
                y={1.45}
                z={sz * (hd - 0.6)}
                w={0.7}
                h={2.9}
                d={0.7}
                mat={MAT.matteSilver}
              />
            )),
          )}
          <EntranceMark b={b} canopyY={2.3} />
        </>
      );
  }
}

function BuildingsImpl({ sim }: { sim: LabSim }) {
  return (
    <group>
      {BUILDINGS.map((b) => (
        <BuildingFrame key={b.id} b={b}>
          <Massing b={b} sim={sim} />
        </BuildingFrame>
      ))}
    </group>
  );
}

export const CampusBuildings = memo(BuildingsImpl);
