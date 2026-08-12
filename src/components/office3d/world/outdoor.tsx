"use client";

import { memo, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { DOORWAYS } from "@/lib/game/map";
import {
  BUILDINGS,
  campusPerimeter,
  CAMPUS_RADIUS,
  canonicalToCampus,
  CORRIDOR,
  PLAZA_CENTER,
} from "./campus";
import { MAT } from "./materials";
import { LUX, makeSignage } from "./lux";
import { u } from "./scale";

/**
 * The outdoor campus (§6, §7). Two layers:
 *
 *   GROUND   the exact walkable surface — a mesh built by pushing the
 *            canonical corridor grid through the campus transform, so
 *            paving stops precisely where collision stops you.
 *   FIGURE   plaza, ring path, radial approaches and wayfinding, laid
 *            out directly in campus space so their real-world sizes
 *            are chosen, not inherited from a warp.
 */

/** Paved heart of the campus, metres (§5). */
const PLAZA_RX = 25;
const PLAZA_RZ = 21;

function plazaCentre() {
  const c = canonicalToCampus(PLAZA_CENTER.x, PLAZA_CENTER.y);
  return new THREE.Vector2(u(c.x), u(c.y));
}

/** Entrance point of each building, in campus metres. */
function entrancePoints() {
  return BUILDINGS.map((b) => {
    const dw = DOORWAYS.find((d) => {
      const r = d.rect;
      return (
        r.x >= b.bounds.x - 1 &&
        r.x + r.w <= b.bounds.x + b.bounds.w + 1 &&
        r.y >= b.bounds.y - 1 &&
        r.y + r.h <= b.bounds.y + b.bounds.h + 1
      );
    });
    const cx = dw ? dw.rect.x + dw.rect.w / 2 : b.canon.x;
    const cy = dw ? dw.rect.y + dw.rect.h / 2 : b.canon.y;
    const p = canonicalToCampus(cx, cy);
    return { b, p: new THREE.Vector2(u(p.x), u(p.y)) };
  });
}

/** The walkable ground: image of the canonical corridor. */
function Ground() {
  const geom = useMemo(() => {
    const NX = 96;
    const NZ = 30;
    const pos = new Float32Array((NX + 1) * (NZ + 1) * 3);
    const uv = new Float32Array((NX + 1) * (NZ + 1) * 2);
    let k = 0;
    let t = 0;
    for (let j = 0; j <= NZ; j++) {
      const cy = CORRIDOR.y + 0.15 + ((CORRIDOR.h - 0.3) * j) / NZ;
      for (let i = 0; i <= NX; i++) {
        const cx = CORRIDOR.x + 0.15 + ((CORRIDOR.w - 0.3) * i) / NX;
        const p = canonicalToCampus(cx, cy);
        pos[k++] = u(p.x);
        pos[k++] = 0;
        pos[k++] = u(p.y);
        uv[t++] = i / NX;
        uv[t++] = j / NZ;
      }
    }
    const idx: number[] = [];
    for (let j = 0; j < NZ; j++) {
      for (let i = 0; i < NX; i++) {
        const a = j * (NX + 1) + i;
        const b = a + 1;
        const c = a + NX + 1;
        const d = c + 1;
        idx.push(a, c, b, b, c, d);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }, []);
  const mat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#dfe3e7", roughness: 0.9 }),
    [],
  );
  return <mesh geometry={geom} material={mat} position={[0, 0.01, 0]} receiveShadow />;
}

/** Landscape the campus sits in — read-only ground beyond the walls. */
function Backdrop() {
  const c = plazaCentre();
  const r = u(CAMPUS_RADIUS) * 2.4;
  return (
    <mesh
      material={MAT.grass}
      rotation-x={-Math.PI / 2}
      position={[c.x, -0.06, c.y]}
      receiveShadow
    >
      <circleGeometry args={[r, 48]} />
    </mesh>
  );
}

/** Central Plaza + ring circulation + radial approaches (§6, §7). */
function Circulation() {
  const c = plazaCentre();
  const doors = useMemo(() => entrancePoints(), []);
  const ringR = useMemo(() => {
    const rs = doors.map((d) => d.p.distanceTo(c));
    return Math.min(...rs) - 7;
  }, [doors, c]);
  const paving = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#eef1f4", roughness: 0.72 }),
    [],
  );
  const lane = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#e6eaee", roughness: 0.8 }),
    [],
  );
  return (
    <group>
      {/* paved heart */}
      <mesh
        material={paving}
        rotation-x={-Math.PI / 2}
        position={[c.x, 0.03, c.y]}
        scale={[PLAZA_RX, PLAZA_RZ, 1]}
        receiveShadow
      >
        <circleGeometry args={[1, 56]} />
      </mesh>
      <mesh material={lane} rotation-x={-Math.PI / 2} position={[c.x, 0.025, c.y]}>
        <ringGeometry args={[ringR - 3.2, ringR + 3.2, 72]} />
      </mesh>
      {/* radial approach from the ring to each entrance */}
      {doors.map(({ b, p }) => {
        const dir = p.clone().sub(c);
        const len = dir.length();
        const ang = Math.atan2(dir.x, dir.y);
        const mid = c.clone().add(dir.clone().multiplyScalar(0.5));
        return (
          <mesh
            key={b.id}
            material={lane}
            rotation={[-Math.PI / 2, 0, ang]}
            position={[mid.x, 0.022, mid.y]}
          >
            <planeGeometry args={[5.4, len]} />
          </mesh>
        );
      })}
      {/* lit rim: the plaza edge is drawn, not just implied */}
      <mesh material={LUX.edge} rotation-x={-Math.PI / 2} position={[c.x, 0.034, c.y]} scale={[PLAZA_RX, PLAZA_RZ, 1]}>
        <ringGeometry args={[0.985, 1.0, 64]} />
      </mesh>
      <mesh material={LUX.holoSoft} rotation-x={-Math.PI / 2} position={[c.x, 0.032, c.y]} scale={[PLAZA_RX, PLAZA_RZ, 1]}>
        <ringGeometry args={[0.62, 0.645, 64]} />
      </mesh>
      {/* entrance forecourt per building (§6 approach sequence) */}
      {doors.map(({ b, p }) => (
        <mesh
          key={b.id}
          material={paving}
          rotation-x={-Math.PI / 2}
          position={[p.x, 0.028, p.y]}
        >
          <circleGeometry args={[Math.max(6, u(b.apron) * 0.09), 24]} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Landscape islands and light bollards. These do the quiet work of
 * making a large paved space feel composed rather than empty: they
 * break the plaza into approaches, give the eye something at human
 * height, and mark the ring path after dark.
 */
function PlazaLandscape() {
  const c = plazaCentre();
  const doors = useMemo(() => entrancePoints(), []);
  const islands = useMemo(() => {
    const out: Array<{ x: number; z: number; ang: number; r: number }> = [];
    for (let i = 0; i < doors.length; i++) {
      const a = doors[i].p.clone().sub(c);
      const b = doors[(i + 1) % doors.length].p.clone().sub(c);
      const mid = a.clone().add(b).multiplyScalar(0.5).normalize();
      const r = (a.length() + b.length()) / 2;
      out.push({
        x: c.x + mid.x * r * 0.66,
        z: c.y + mid.y * r * 0.66,
        ang: Math.atan2(mid.x, mid.y),
        r,
      });
    }
    return out;
  }, [doors, c]);
  const bollards = useMemo(() => {
    const rs = doors.map((d) => d.p.distanceTo(c));
    const ring = Math.min(...rs) - 7;
    const out: Array<[number, number]> = [];
    for (let i = 0; i < 56; i++) {
      const a = (i / 56) * Math.PI * 2;
      out.push([c.x + Math.sin(a) * ring, c.y + Math.cos(a) * ring]);
    }
    return out;
  }, [doors, c]);
  const post = useRef<THREE.InstancedMesh>(null);
  const cap = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    for (const [mesh, h, w, y] of [
      [post.current, 0.95, 0.11, 0.475],
      [cap.current, 0.07, 0.2, 0.98],
    ] as const) {
      if (!mesh) continue;
      bollards.forEach(([bx, bz], i) => {
        m.compose(new THREE.Vector3(bx, y, bz), q, new THREE.Vector3(w, h, w));
        mesh.setMatrixAt(i, m);
      });
      mesh.count = bollards.length;
      mesh.instanceMatrix.needsUpdate = true;
    }
  }, [bollards]);
  return (
    <group>
      {islands.map((it, i) => (
        <group key={i} position={[it.x, 0, it.z]} rotation-y={it.ang}>
          <mesh material={LUX.ceramic} position={[0, 0.24, 0]} castShadow receiveShadow>
            <boxGeometry args={[7.0, 0.48, 3.2]} />
          </mesh>
          <mesh material={LUX.leafDeep} position={[0, 0.5, 0]} rotation-x={-Math.PI / 2}>
            <planeGeometry args={[6.7, 2.9]} />
          </mesh>
          <mesh material={LUX.leaf} position={[0, 0.72, 0]}>
            <boxGeometry args={[6.2, 0.46, 2.3]} />
          </mesh>
          {[-2.1, 2.1].map((tx) => (
            <group key={tx} position={[tx, 0, 0]}>
              <mesh material={LUX.trunk} position={[0, 2.0, 0]} castShadow>
                <cylinderGeometry args={[0.09, 0.14, 3.6, 8]} />
              </mesh>
              <mesh material={LUX.leaf} position={[0, 4.3, 0]} castShadow>
                <sphereGeometry args={[1.7, 12, 9]} />
              </mesh>
            </group>
          ))}
          {/* a bench: somewhere to be, at human scale */}
          <mesh material={LUX.wood} position={[0, 0.5, 2.05]} castShadow receiveShadow>
            <boxGeometry args={[5.0, 0.12, 0.55]} />
          </mesh>
        </group>
      ))}
      <instancedMesh ref={post} args={[undefined, undefined, bollards.length]} material={LUX.silver}>
        <boxGeometry />
      </instancedMesh>
      <instancedMesh ref={cap} args={[undefined, undefined, bollards.length]} material={LUX.cove}>
        <boxGeometry />
      </instancedMesh>
    </group>
  );
}

/**
 * Campus perimeter. Drawn along the image of the canonical corridor
 * outline, i.e. exactly where the avatar is actually stopped — the
 * wall you see IS the wall you hit, including in the slots between
 * buildings (§12).
 */
function Perimeter() {
  const segs = useMemo(() => {
    const pts = campusPerimeter(28);
    const out: Array<{ x: number; z: number; len: number; ang: number }> = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      if (a.open || b.open) continue;
      const ax = u(a.x);
      const az = u(a.y);
      const bx = u(b.x);
      const bz = u(b.y);
      const len = Math.hypot(bx - ax, bz - az);
      if (len < 0.05 || len > 60) continue;
      out.push({
        x: (ax + bx) / 2,
        z: (az + bz) / 2,
        len: len + 0.4,
        ang: Math.atan2(bx - ax, bz - az),
      });
    }
    return out;
  }, []);
  const wall = useRef<THREE.InstancedMesh>(null);
  const hedge = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    for (const [mesh, h, thick, y] of [
      [wall.current, 0.55, 0.7, 0.275],
      [hedge.current, 1.15, 0.45, 0.7],
    ] as const) {
      if (!mesh) continue;
      segs.forEach((s, i) => {
        e.set(0, s.ang, 0);
        q.setFromEuler(e);
        m.compose(
          new THREE.Vector3(s.x, y, s.z),
          q,
          new THREE.Vector3(thick, h, s.len),
        );
        mesh.setMatrixAt(i, m);
      });
      mesh.count = segs.length;
      mesh.instanceMatrix.needsUpdate = true;
    }
  }, [segs]);
  return (
    <group>
      <instancedMesh ref={wall} args={[undefined, undefined, segs.length]} material={MAT.wallWarm} castShadow receiveShadow>
        <boxGeometry />
      </instancedMesh>
      <instancedMesh ref={hedge} args={[undefined, undefined, segs.length]} material={MAT.leaf}>
        <boxGeometry />
      </instancedMesh>
    </group>
  );
}

/** Wayfinding totems where each approach leaves the ring path (§6). */
function Wayfinding() {
  const c = plazaCentre();
  const doors = useMemo(() => entrancePoints(), []);
  const blades = useMemo(
    () =>
      doors.map(({ b }) => ({
        id: b.id,
        accent: b.accent,
        mat: makeSignage(b.label, b.subtitle, b.accent),
      })),
    [doors],
  );
  return (
    <group>
      {doors.map(({ b, p }, i) => {
        const dir = p.clone().sub(c).normalize();
        const at = p.clone().sub(dir.clone().multiplyScalar(11));
        const side = new THREE.Vector2(-dir.y, dir.x).multiplyScalar(5.0);
        const face = Math.atan2(-dir.x, -dir.y);
        return (
          <group key={b.id} position={[at.x + side.x, 0, at.y + side.y]} rotation-y={face}>
            {/* a pearl blade with a brushed spine, not a signpost */}
            <mesh material={LUX.pearl} position={[0, 1.9, 0]} castShadow receiveShadow>
              <boxGeometry args={[1.5, 3.2, 0.16]} />
            </mesh>
            <mesh material={LUX.silver} position={[0, 1.9, -0.11]}>
              <boxGeometry args={[0.2, 3.5, 0.1]} />
            </mesh>
            <mesh material={blades[i].mat} position={[0, 2.55, 0.09]}>
              <planeGeometry args={[1.34, 0.34]} />
            </mesh>
            <mesh
              material={new THREE.MeshBasicMaterial({ color: b.accent, toneMapped: false })}
              position={[0, 0.55, 0.09]}
            >
              <boxGeometry args={[1.34, 0.07, 0.03]} />
            </mesh>
            <mesh material={LUX.coveSoft} position={[0, 0.06, 0.3]} rotation-x={-Math.PI / 2}>
              <planeGeometry args={[2.0, 1.4]} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function OutdoorImpl() {
  return (
    <group>
      <Backdrop />
      <Ground />
      <Circulation />
      <PlazaLandscape />
      <Perimeter />
      <Wayfinding />
    </group>
  );
}

export const CampusOutdoor = memo(OutdoorImpl);
