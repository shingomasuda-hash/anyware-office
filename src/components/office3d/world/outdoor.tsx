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

/** One texture tile is PAVING_SLABS x PAVING_SLABS slabs over PAVING_TILE metres. */
const PAVING_TILE = 16;
const PAVING_SLABS = 4;

/**
 * The plaza's stone. A campus this size read as a grey void from any
 * distance — nothing gives the eye a scale between the buildings and
 * the horizon. Slabs do: they are the one thing outdoors that tells
 * you how big a stride is. Built once into a repeating tile, so the
 * whole ground stays a single draw call.
 */
function pavingTexture(): THREE.Texture {
  const S = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext("2d")!;
  const cell = S / PAVING_SLABS;
  ctx.fillStyle = "#e3e6ea";
  ctx.fillRect(0, 0, S, S);
  for (let j = 0; j < PAVING_SLABS; j++) {
    for (let i = 0; i < PAVING_SLABS; i++) {
      // a deterministic drift, so no two neighbouring slabs match and
      // the tile does not announce itself when it repeats
      const n = ((i * 7 + j * 13) % 5) / 5;
      const v = 218 + Math.round(n * 18);
      ctx.fillStyle = `rgb(${v},${v + 2},${v + 5})`;
      ctx.fillRect(i * cell + 1.5, j * cell + 1.5, cell - 3, cell - 3);
    }
  }
  // joints, then a finer scored line down the middle of each slab
  ctx.strokeStyle = "rgba(112,124,138,0.48)";
  ctx.lineWidth = 3;
  for (let i = 0; i <= PAVING_SLABS; i++) {
    const p = i * cell;
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, S);
    ctx.moveTo(0, p);
    ctx.lineTo(S, p);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(134,146,158,0.16)";
  ctx.lineWidth = 1;
  for (let i = 0; i < PAVING_SLABS; i++) {
    const p = i * cell + cell / 2;
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, S);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  return tex;
}

let pavingCache: THREE.Texture | null = null;
function paving(): THREE.Texture {
  pavingCache ??= pavingTexture();
  return pavingCache;
}

/**
 * Planting palettes. One green over a whole campus reads as a texture,
 * not as landscape; four, rotated around the ring, read as planting
 * that somebody chose. The blooms are the one place outdoors where a
 * colour is allowed to be fully saturated.
 */
const planting = [
  { bed: "#6f9a6a", canopy: "#77a271", bloom: "#e8a0b8" },
  { bed: "#7fa86b", canopy: "#8fb573", bloom: "#f0c46a" },
  { bed: "#5f9483", canopy: "#6ba392", bloom: "#c48ce0" },
  { bed: "#88a45f", canopy: "#6d9668", bloom: "#e88f6a" },
].map((p) => ({
  bed: new THREE.MeshStandardMaterial({ color: p.bed, roughness: 0.95 }),
  canopy: new THREE.MeshStandardMaterial({ color: p.canopy, roughness: 0.95 }),
  bloom: new THREE.MeshStandardMaterial({ color: p.bloom, roughness: 0.8 }),
}));

/** A district colour washed toward white — colour you notice second. */
function pale(hex: string, toward: number): string {
  return `#${new THREE.Color(hex).lerp(new THREE.Color("#ffffff"), toward).getHexString()}`;
}

/**
 * A stone material for a surface of a known size, so the slabs keep
 * the same pitch whatever shape they are laid on. The figure surfaces
 * — plaza disc, ring, approaches — carry their own UVs from 0 to 1,
 * so each needs the repeat worked out from its real extent.
 */
function stone(color: string, roughness: number, wx: number, wz: number) {
  const tex = paving().clone();
  tex.needsUpdate = true;
  tex.repeat.set(wx / PAVING_TILE, wz / PAVING_TILE);
  return new THREE.MeshStandardMaterial({ color, map: tex, roughness });
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
        // UVs are taken in CAMPUS metres, not along the corridor. Down
        // the corridor's own axes the transform stretches by a factor
        // of several, so a paving grid laid out that way arrives as
        // smeared ribbons; in world space the slabs stay square.
        uv[t++] = u(p.x) / PAVING_TILE;
        uv[t++] = u(p.y) / PAVING_TILE;
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
    () =>
      new THREE.MeshStandardMaterial({
        color: "#ffffff",
        map: paving(),
        roughness: 0.86,
      }),
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
  const plazaMat = useMemo(() => stone("#f4f6f8", 0.72, PLAZA_RX * 2, PLAZA_RZ * 2), []);
  // Each approach carries its district's colour, washed almost to white.
  // Wayfinding you read with your feet: from the middle of the plaza you
  // can see which path goes where before any sign is legible.
  const doorMats = useMemo(
    () =>
      new Map(
        doors.map(({ b }) => [
          b.id,
          {
            lane: stone(pale(b.accent, 0.56), 0.8, 5.4, 5.4),
            court: stone(pale(b.accent, 0.7), 0.74, 18, 18),
          },
        ]),
      ),
    [doors],
  );
  const ringMat = useMemo(
    () => stone("#eceff3", 0.8, (ringR + 3.2) * 2, (ringR + 3.2) * 2),
    [ringR],
  );

  return (
    <group>
      {/* paved heart */}
      <mesh
        material={plazaMat}
        rotation-x={-Math.PI / 2}
        position={[c.x, 0.03, c.y]}
        scale={[PLAZA_RX, PLAZA_RZ, 1]}
        receiveShadow
      >
        <circleGeometry args={[1, 56]} />
      </mesh>
      <mesh material={ringMat} rotation-x={-Math.PI / 2} position={[c.x, 0.025, c.y]}>
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
            material={doorMats.get(b.id)!.lane}
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
          material={doorMats.get(b.id)!.court}
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
  /**
   * Light masts, at every fourth bollard. Between knee-high bollards
   * and a nine-storey tower the campus had nothing at all, and a space
   * with no middle register reads flat however big it is. Seven metres
   * is the height that puts something human-made above head height
   * without competing with the buildings.
   */
  const masts = useMemo(() => {
    // ...but never on an entrance axis. Every fourth bollard put one
    // squarely in front of a door, and a seven-metre post through the
    // middle of an approach is the one place it must not be.
    const bearings = doors.map(({ p }) => Math.atan2(p.x - c.x, p.y - c.y));
    const clear = (x: number, z: number) => {
      const a = Math.atan2(x - c.x, z - c.y);
      return bearings.every((d) => {
        let dd = Math.abs(a - d) % (Math.PI * 2);
        if (dd > Math.PI) dd = Math.PI * 2 - dd;
        return dd > 0.22; // ~13 degrees either side of the approach
      });
    };
    return bollards.filter(([x, z], i) => i % 4 === 0 && clear(x, z));
  }, [bollards, doors, c]);
  const post = useRef<THREE.InstancedMesh>(null);
  const cap = useRef<THREE.InstancedMesh>(null);
  const mast = useRef<THREE.InstancedMesh>(null);
  const mastArm = useRef<THREE.InstancedMesh>(null);
  const mastLamp = useRef<THREE.InstancedMesh>(null);
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
    for (const [mesh, h, w, d, y] of [
      [mast.current, 7.2, 0.16, 0.16, 3.6],
      [mastArm.current, 0.16, 1.5, 0.2, 7.2],
      [mastLamp.current, 0.07, 1.2, 0.16, 7.09],
    ] as const) {
      if (!mesh) continue;
      masts.forEach(([bx, bz], i) => {
        // arms point in toward the plaza, so the ring reads as one move
        const ang = Math.atan2(c.x - bx, c.y - bz);
        q.setFromEuler(new THREE.Euler(0, ang, 0));
        m.compose(new THREE.Vector3(bx, y, bz), q, new THREE.Vector3(w, h, d));
        mesh.setMatrixAt(i, m);
      });
      mesh.count = masts.length;
      mesh.instanceMatrix.needsUpdate = true;
    }
  }, [bollards, masts, c]);
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
          <mesh material={planting[i % planting.length].bed} position={[0, 0.72, 0]}>
            <boxGeometry args={[6.2, 0.46, 2.3]} />
          </mesh>
          {/* a flowering row along the front of the bed — the campus is
              not all one green, and this is where colour is allowed to
              be saturated, because planting is where it comes from */}
          {[-2.4, -1.6, -0.8, 0, 0.8, 1.6, 2.4].map((bx, k) => (
            <mesh
              key={bx}
              material={planting[(i + k) % planting.length].bloom}
              position={[bx, 0.99, 0.86 + ((k % 2) - 0.5) * 0.3]}
              castShadow
            >
              <sphereGeometry args={[0.26, 8, 6]} />
            </mesh>
          ))}
          {[-2.1, 2.1].map((tx) => (
            <group key={tx} position={[tx, 0, 0]}>
              <mesh material={LUX.trunk} position={[0, 2.0, 0]} castShadow>
                <cylinderGeometry args={[0.09, 0.14, 3.6, 8]} />
              </mesh>
              <mesh
                material={planting[(i + (tx > 0 ? 1 : 0)) % planting.length].canopy}
                position={[0, 4.3, 0]}
                castShadow
              >
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
      <instancedMesh
        ref={mast}
        args={[undefined, undefined, masts.length]}
        material={LUX.pearl}
        castShadow
      >
        <boxGeometry />
      </instancedMesh>
      <instancedMesh ref={mastArm} args={[undefined, undefined, masts.length]} material={LUX.pearl}>
        <boxGeometry />
      </instancedMesh>
      <instancedMesh ref={mastLamp} args={[undefined, undefined, masts.length]} material={LUX.coveSoft}>
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
