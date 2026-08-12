"use client";

import { memo, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { LabSim } from "../LabSim";
import { CAMPUS_RADIUS, canonicalToCampus, PLAZA_CENTER } from "./campus";
import { CampusBuildings } from "./massing";
import { CampusOutdoor } from "./outdoor";
import { SkyDome } from "./effects";
import { MAT } from "./materials";
import { u } from "./scale";

/**
 * ANYWARE FUTURE CAMPUS — M1 world.
 *
 * Outdoor campus, Central Plaza, ten independent building massings.
 * Deliberately NOT a visual pass: materials, interiors, landscape
 * detail and lighting polish are M2+ (§9). What M1 fixes is structure
 * — where the buildings are, how big they are, which way they face,
 * how you walk between them and how you get inside.
 */

function PlazaCore() {
  const c = useMemo(() => canonicalToCampus(PLAZA_CENTER.x, PLAZA_CENTER.y), []);
  const x = u(c.x);
  const z = u(c.y);
  return (
    <group position={[x, 0, z]}>
      <mesh material={MAT.resinWhite} position={[0, 0.35, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[7.4, 8.0, 0.7, 32]} />
      </mesh>
      <mesh material={MAT.resinWhite} position={[0, 1.1, 0]} castShadow>
        <cylinderGeometry args={[3.2, 3.8, 0.8, 24]} />
      </mesh>
      <mesh material={MAT.matteSilver} position={[0, 5.2, 0]} castShadow>
        <cylinderGeometry args={[0.9, 1.4, 7.4, 16]} />
      </mesh>
      <mesh material={MAT.matteSilver} position={[0, 9.4, 0]} rotation-x={Math.PI / 2}>
        <torusGeometry args={[3.6, 0.22, 8, 26]} />
      </mesh>
    </group>
  );
}

/** Distant treeline so the campus reads as sitting in a landscape. */
function Treeline() {
  const c = useMemo(() => canonicalToCampus(PLAZA_CENTER.x, PLAZA_CENTER.y), []);
  const items = useMemo(() => {
    const out: Array<{ x: number; z: number; s: number }> = [];
    const R = u(CAMPUS_RADIUS);
    for (let i = 0; i < 120; i++) {
      const a = (i / 120) * Math.PI * 2;
      const ring = R * (1.18 + ((i * 37) % 11) / 44);
      out.push({
        x: u(c.x) + Math.sin(a) * ring,
        z: u(c.y) + Math.cos(a) * ring,
        s: 0.8 + ((i * 13) % 7) / 7,
      });
    }
    return out;
  }, [c]);
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    items.forEach((it, i) => {
      m.compose(
        new THREE.Vector3(it.x, 3.4 * it.s, it.z),
        new THREE.Quaternion(),
        new THREE.Vector3(it.s * 2.6, it.s * 7.0, it.s * 2.6),
      );
      ref.current?.setMatrixAt(i, m);
    });
    if (ref.current) {
      ref.current.count = items.length;
      ref.current.instanceMatrix.needsUpdate = true;
    }
  }, [items]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, items.length]} material={MAT.leaf}>
      <coneGeometry args={[0.5, 1, 7]} />
    </instancedMesh>
  );
}

function CampusWorldImpl({ sim }: { sim: LabSim }) {
  const c = useMemo(() => canonicalToCampus(PLAZA_CENTER.x, PLAZA_CENTER.y), []);
  const S = 3.2;
  return (
    <group>
      <group position={[u(c.x) - 22 * S, 0, u(c.y) - 15 * S]} scale={S}>
        <SkyDome />
      </group>
      <Treeline />
      <CampusOutdoor />
      <PlazaCore />
      <CampusBuildings sim={sim} />
    </group>
  );
}

export const CampusWorld = memo(CampusWorldImpl);
