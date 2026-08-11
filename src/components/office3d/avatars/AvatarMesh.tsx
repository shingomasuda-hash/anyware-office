"use client";

import { useMemo, useRef } from "react";
import { Html, RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  STATUS_COLORS,
  STATUS_LABELS,
  type AvatarIdentity,
} from "@/lib/identity/identity";
import type { Direction } from "@/types/office";
import { MAT } from "../world/materials";
import { worldTo3D } from "../world/scale";

// Low-poly human (~1.7m) consuming the STEP 4 identity contract (§11).
// Position/pose update imperatively per frame — no React state per frame.

export interface AvatarSample {
  x: number;
  y: number;
  direction: Direction;
  moving: boolean;
}

const YAW: Record<Direction, number> = {
  down: 0,
  right: Math.PI / 2,
  up: Math.PI,
  left: -Math.PI / 2,
};

function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * f)));
  return `#${((c((n >> 16) & 255) << 16) | (c((n >> 8) & 255) << 8) | c(n & 255))
    .toString(16)
    .padStart(6, "0")}`;
}

export default function AvatarMesh({
  identity,
  sample,
  showTag,
  onClick,
}: {
  identity: AvatarIdentity;
  sample: () => AvatarSample | null;
  showTag: boolean;
  onClick?: () => void;
}) {
  const group = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Group>(null);
  const legR = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const phase = useRef(0);
  const yaw = useRef(0);

  const bodyMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: identity.color, roughness: 0.85 }),
    [identity.color],
  );
  const legMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: shade(identity.color, 0.55), roughness: 0.9 }),
    [identity.color],
  );
  const ringMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: STATUS_COLORS[identity.status],
        transparent: true,
        opacity: 0.85,
      }),
    [identity.status],
  );

  useFrame((_, rawDt) => {
    const g = group.current;
    if (!g) return;
    const s = sample();
    if (!s) {
      g.visible = false;
      return;
    }
    g.visible = true;
    const dt = Math.min(rawDt, 0.05);
    const [x, , z] = worldTo3D(s.x, s.y);
    g.position.set(x, 0, z);

    // shortest-path yaw smoothing
    const targetYaw = YAW[s.direction];
    let dy = targetYaw - yaw.current;
    while (dy > Math.PI) dy -= Math.PI * 2;
    while (dy < -Math.PI) dy += Math.PI * 2;
    yaw.current += dy * Math.min(1, dt * 14);
    g.rotation.y = yaw.current;

    // walk cycle / idle breathing
    if (s.moving) phase.current += dt * 9;
    else phase.current *= 1 - Math.min(1, dt * 10);
    const swing = Math.sin(phase.current) * (s.moving ? 0.55 : 0);
    if (legL.current) legL.current.rotation.x = swing;
    if (legR.current) legR.current.rotation.x = -swing;
    if (armL.current) armL.current.rotation.x = -swing * 0.8;
    if (armR.current) armR.current.rotation.x = swing * 0.8;
    if (body.current) {
      body.current.position.y = s.moving
        ? Math.abs(Math.sin(phase.current)) * 0.04
        : Math.sin(performance.now() / 900) * 0.012;
    }
  });

  return (
    <group ref={group} onClick={onClick ? (e) => { e.stopPropagation(); onClick(); } : undefined}>
      {/* status ring at the feet */}
      <mesh material={ringMat} rotation-x={-Math.PI / 2} position={[0, 0.03, 0]}>
        <ringGeometry args={[0.3, 0.36, 24]} />
      </mesh>
      {/* soft blob shadow so avatars never float */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.015, 0]}>
        <circleGeometry args={[0.32, 20]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.18} />
      </mesh>

      <group ref={body}>
        {/* legs */}
        <group ref={legL} position={[-0.1, 0.78, 0]}>
          <RoundedBox args={[0.15, 0.78, 0.18]} radius={0.05} position={[0, -0.39, 0]} material={legMat} castShadow />
        </group>
        <group ref={legR} position={[0.1, 0.78, 0]}>
          <RoundedBox args={[0.15, 0.78, 0.18]} radius={0.05} position={[0, -0.39, 0]} material={legMat} castShadow />
        </group>
        {/* torso */}
        <RoundedBox args={[0.44, 0.58, 0.26]} radius={0.09} position={[0, 1.06, 0]} material={bodyMat} castShadow />
        {/* arms */}
        <group ref={armL} position={[-0.28, 1.3, 0]}>
          <RoundedBox args={[0.11, 0.55, 0.14]} radius={0.05} position={[0, -0.26, 0]} material={bodyMat} castShadow />
        </group>
        <group ref={armR} position={[0.28, 1.3, 0]}>
          <RoundedBox args={[0.11, 0.55, 0.14]} radius={0.05} position={[0, -0.26, 0]} material={bodyMat} castShadow />
        </group>
        {/* head + face hint */}
        <mesh material={MAT.skinTone} position={[0, 1.52, 0]} castShadow>
          <sphereGeometry args={[0.17, 16, 12]} />
        </mesh>
        <mesh material={bodyMat} position={[0, 1.62, 0]}>
          <sphereGeometry args={[0.175, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2.6]} />
        </mesh>
        {[-0.055, 0.055].map((ex) => (
          <mesh key={ex} position={[ex, 1.53, 0.155]}>
            <sphereGeometry args={[0.018, 6, 6]} />
            <meshBasicMaterial color="#2b2d33" />
          </mesh>
        ))}
      </group>

      {showTag ? (
        <Html
          position={[0, 2.05, 0]}
          center
          distanceFactor={7}
          style={{ pointerEvents: "none", whiteSpace: "nowrap" }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "rgba(255,255,255,0.92)",
              border: "1px solid rgba(47,49,54,0.14)",
              borderRadius: 999,
              padding: "3px 10px",
              fontFamily: "system-ui, sans-serif",
              boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: 999,
                background: STATUS_COLORS[identity.status],
              }}
              title={STATUS_LABELS[identity.status]}
            />
            <span style={{ fontSize: 12, fontWeight: 600, color: "#2f3136" }}>
              {identity.displayName}
            </span>
            {identity.department ? (
              <span style={{ fontSize: 10, fontWeight: 500, color: "#8a8f98" }}>
                {identity.department}
              </span>
            ) : null}
          </div>
        </Html>
      ) : null}
    </group>
  );
}
