"use client";

import { memo, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { LabSim } from "../LabSim";
import { CAMPUS_RADIUS, canonicalToCampus, PLAZA_CENTER } from "./campus";
import { CampusBuildings } from "./massing";
import { CampusFacades } from "./facades";
import type { BoardData } from "./boards";
import { CampusOutdoor } from "./outdoor";
import { MetaCity, SkyDome } from "./effects";
import { MAT } from "./materials";
import { LUX, makeSignage } from "./lux";
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
  const ring = useRef<THREE.Group>(null);
  const sign = useMemo(
    () => makeSignage("ANYWARE HQ", "FUTURE CAMPUS · CENTRAL PLAZA", "#7fd3f0", { dark: true }),
    [],
  );
  useFrame((_, dt) => {
    if (ring.current) ring.current.rotation.y += Math.min(dt, 0.2) * 0.05;
  });
  return (
    <group position={[x, 0, z]}>
      {/* stepped platform: the plaza is given a centre you walk up to */}
      <mesh material={LUX.stone} position={[0, 0.11, 0]} receiveShadow>
        <cylinderGeometry args={[11.5, 11.8, 0.22, 48]} />
      </mesh>
      <mesh material={LUX.pearl} position={[0, 0.3, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[8.6, 8.9, 0.2, 44]} />
      </mesh>
      {/* still water ring — light, sky and the buildings get a second read */}
      <mesh material={LUX.smartGlass} position={[0, 0.38, 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[5.6, 8.4, 48]} />
      </mesh>
      <mesh material={LUX.edge} position={[0, 0.41, 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[8.4, 8.62, 48]} />
      </mesh>
      {/* monument: pearl blades around a quiet core */}
      <mesh material={LUX.pearl} position={[0, 0.62, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[3.4, 3.9, 0.44, 32]} />
      </mesh>
      <group ref={ring} position={[0, 6.2, 0]}>
        {[0, 1, 2].map((i) => (
          <mesh
            key={i}
            material={LUX.pearl}
            rotation={[Math.PI / 2 + i * 0.34, 0, (i * Math.PI) / 3]}
            castShadow
          >
            <torusGeometry args={[5.0 - i * 0.7, 0.2, 8, 44]} />
          </mesh>
        ))}
      </group>
      <mesh material={LUX.core} position={[0, 6.2, 0]}>
        <cylinderGeometry args={[0.42, 0.6, 10.4, 18]} />
      </mesh>
      <mesh material={LUX.holoSoft} position={[0, 6.2, 0]}>
        <cylinderGeometry args={[1.1, 1.5, 10.6, 18]} />
      </mesh>
      <mesh material={LUX.core} position={[0, 11.7, 0]}>
        <sphereGeometry args={[0.6, 14, 12]} />
      </mesh>
      <group position={[0, 13.6, 0]}>
        <mesh material={sign}>
          <planeGeometry args={[7.6, 1.9]} />
        </mesh>
        <mesh material={sign} rotation-y={Math.PI}>
          <planeGeometry args={[7.6, 1.9]} />
        </mesh>
      </group>
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

function CampusWorldImpl({ sim, board }: { sim: LabSim; board?: BoardData }) {
  const c = useMemo(() => canonicalToCampus(PLAZA_CENTER.x, PLAZA_CENTER.y), []);
  const S = 3.2;
  // Far enough out to be a HORIZON. At a smaller scale the towers stood
  // just behind the pavilions and the campus read as a neon city block —
  // the one direction the brief rules out. Fog does the rest.
  const CITY = 11.0;
  return (
    <group>
      {/* Sky, a city on the horizon, and a few things in the air. These
          were built and tuned back when the office was one hall; the
          campus needs them MORE, not less — from the plaza the eye
          otherwise stops at a treeline. Both are instanced, so a whole
          skyline costs a handful of draw calls. Their own authored
          space is centred on (22, 15), hence the offset. */}
      <group position={[u(c.x) - 22 * S, 0, u(c.y) - 15 * S]} scale={S}>
        <SkyDome />
      </group>
      <group position={[u(c.x) - 22 * CITY, 0, u(c.y) - 15 * CITY]} scale={CITY}>
        <MetaCity />
      </group>

      <Treeline />
      <CampusOutdoor />
      <PlazaCore />
      <CampusBuildings sim={sim} board={board} />
      <CampusFacades />
    </group>
  );
}

export const CampusWorld = memo(CampusWorldImpl);
