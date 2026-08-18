"use client";

import { memo, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { WALLS } from "@/lib/game/map";
import { BUILDINGS, type Building } from "./campus";
import { LUX, makeScreen, fillGradient, label } from "./lux";
import { u } from "./scale";

/**
 * CAMPUS FACADES.
 *
 * The buildings were white massing: correct volumes, no surface. This
 * gives every exterior wall the three moves that make a facade read as
 * architecture rather than a block — a stone plinth it stands on, a cap
 * that finishes it against the sky, and vertical fins that give the
 * surface grain and catch the sun.
 *
 * All of it is built ONCE, campus-wide, into three InstancedMeshes.
 * Ten buildings' worth of cladding therefore costs three draw calls
 * instead of a hundred and fifty, which is what makes it affordable at
 * all — the facade budget went into geometry the eye reads, not into
 * per-wall meshes the GPU has to be told about one at a time.
 */

const PLINTH_H = 0.62;
const CAP_H = 0.42;

/**
 * Fins get their own material rather than reusing the brushed silver of
 * the interior kit. At that metalness, with only sky and a sun to
 * reflect, a facade full of them went almost black and the buildings
 * read as dark cages. Pale and barely metallic keeps the grain and
 * loses the cage.
 */
const FIN = new THREE.MeshStandardMaterial({
  color: "#dfe3e8",
  roughness: 0.5,
  metalness: 0.14,
});

/**
 * The cap is the one band of a facade that is seen from everywhere —
 * across the plaza, from the ring path, from the air. Painting it in
 * the district's own colour is what turns ten white sheds into ten
 * addressable buildings. It is a TINT, not a stripe: mixed most of the
 * way to white, so the campus stays pearl and the colour is the thing
 * you notice second, not first.
 */
const CAP = new THREE.MeshStandardMaterial({
  color: "#ffffff",
  roughness: 0.42,
  metalness: 0.06,
});

/** district colour, softened toward white by `toward`. */
function tint(hex: string, toward: number): THREE.Color {
  return new THREE.Color(hex).lerp(new THREE.Color("#ffffff"), toward);
}

interface Piece {
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
  rotY: number;
  color?: THREE.Color;
}

/** Walls of one building, in that building's local metre space. */
function localWalls(b: Building) {
  const out: Array<{ x: number; z: number; w: number; d: number }> = [];
  for (const r of WALLS) {
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
      w: u(r.w),
      d: u(r.h),
    });
  }
  return out;
}

function buildPieces() {
  const plinths: Piece[] = [];
  const caps: Piece[] = [];
  const fins: Piece[] = [];

  for (const b of BUILDINGS) {
    const flip = b.frontSign > 0 ? 0 : Math.PI;
    const rotY = -b.phi + flip;
    const cos = Math.cos(rotY);
    const sin = Math.sin(rotY);
    const bx = u(b.center.x);
    const bz = u(b.center.y);
    // local (x, z) -> world, matching BuildingFrame exactly
    const toWorld = (lx: number, lz: number): [number, number] => [
      bx + lx * cos + lz * sin,
      bz - lx * sin + lz * cos,
    ];

    for (const w of localWalls(b)) {
      const [wx, wz] = toWorld(w.x, w.z);
      plinths.push({
        x: wx,
        y: PLINTH_H / 2,
        z: wz,
        sx: w.w + 0.34,
        sy: PLINTH_H,
        sz: w.d + 0.34,
        rotY,
      });
      caps.push({
        x: wx,
        y: b.height - CAP_H / 2,
        z: wz,
        sx: w.w + 0.5,
        sy: CAP_H,
        sz: w.d + 0.5,
        rotY,
        color: tint(b.accent, 0.18),
      });

      // fins march along the wall's long axis, standing just proud of
      // its outward face
      const horizontal = w.w >= w.d;
      const len = horizontal ? w.w : w.d;
      const count = Math.max(2, Math.round(len / 2.7));
      const normal = horizontal ? Math.sign(w.z) || 1 : Math.sign(w.x) || 1;
      const off = (horizontal ? w.d : w.w) / 2 + 0.08;
      const finH = Math.max(1.6, b.height - PLINTH_H - CAP_H - 0.3);
      for (let i = 0; i <= count; i++) {
        const t = -len / 2 + (len * i) / count;
        const lx = horizontal ? w.x + t : w.x + normal * off;
        const lz = horizontal ? w.z + normal * off : w.z + t;
        const [fx, fz] = toWorld(lx, lz);
        fins.push({
          x: fx,
          y: PLINTH_H + finH / 2,
          z: fz,
          sx: horizontal ? 0.11 : 0.14,
          sy: finH,
          sz: horizontal ? 0.14 : 0.11,
          rotY,
        });
      }
    }
  }
  return { plinths, caps, fins };
}

function write(mesh: THREE.InstancedMesh | null, pieces: Piece[]) {
  if (!mesh) return;
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const p = new THREE.Vector3();
  const s = new THREE.Vector3();
  pieces.forEach((it, i) => {
    e.set(0, it.rotY, 0);
    q.setFromEuler(e);
    p.set(it.x, it.y, it.z);
    s.set(it.sx, it.sy, it.sz);
    m.compose(p, q, s);
    mesh.setMatrixAt(i, m);
    if (it.color) mesh.setColorAt(i, it.color);
  });
  mesh.count = pieces.length;
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
}

/**
 * The district's initial, big enough to read across the plaza. From the
 * far side of the campus a name plate is unreadable, so identity has to
 * come from something the eye resolves at 90 m — a letter and a colour.
 */
function DistrictMark({ b }: { b: Building }) {
  const tex = useMemo(
    () =>
      makeScreen(
        (ctx, w, h) => {
          fillGradient(ctx, w, h, "#ffffff", "#eef1f4");
          ctx.fillStyle = b.accent;
          ctx.fillRect(0, h - 26, w, 26);
          const initial = b.label.slice(0, 2);
          ctx.textAlign = "center";
          ctx.font = "800 300px system-ui, -apple-system, sans-serif";
          ctx.fillStyle = "#1d242b";
          ctx.fillText(initial, w / 2, h * 0.74);
          ctx.textAlign = "left";
          label(ctx, b.label, 30, 28, 44, b.accent, 700, 6);
        },
        512,
        512,
      ),
    [b.accent, b.label],
  );
  const flip = b.frontSign > 0 ? 0 : Math.PI;
  const rotY = -b.phi + flip;
  const hd = u(b.size.h) / 2;
  // on the front face, up where the massing is still solid
  const lz = hd + 0.12;
  const lx = u(b.size.w) / 2 - 4.4;
  const cos = Math.cos(rotY);
  const sin = Math.sin(rotY);
  const x = u(b.center.x) + lx * cos + lz * sin;
  const z = u(b.center.y) - lx * sin + lz * cos;
  const y = Math.min(b.height - 2.4, 4.7);
  return (
    <group position={[x, y, z]} rotation-y={rotY}>
      <mesh material={tex}>
        <planeGeometry args={[2.2, 2.2]} />
      </mesh>
    </group>
  );
}

function FacadesImpl() {
  const { plinths, caps, fins } = useMemo(buildPieces, []);
  const plinthRef = useRef<THREE.InstancedMesh>(null);
  const capRef = useRef<THREE.InstancedMesh>(null);
  const finRef = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    write(plinthRef.current, plinths);
    write(capRef.current, caps);
    write(finRef.current, fins);
  }, [plinths, caps, fins]);
  return (
    <group>
      <instancedMesh
        ref={plinthRef}
        args={[undefined, undefined, plinths.length]}
        material={LUX.stoneDark}
        castShadow
        receiveShadow
      >
        <boxGeometry />
      </instancedMesh>
      <instancedMesh
        ref={capRef}
        args={[undefined, undefined, caps.length]}
        material={CAP}
        castShadow
        receiveShadow
      >
        <boxGeometry />
      </instancedMesh>
      <instancedMesh
        ref={finRef}
        args={[undefined, undefined, fins.length]}
        material={FIN}
        castShadow
      >
        <boxGeometry />
      </instancedMesh>
      {BUILDINGS.map((b) => (
        <DistrictMark key={b.id} b={b} />
      ))}
    </group>
  );
}

export const CampusFacades = memo(FacadesImpl);
