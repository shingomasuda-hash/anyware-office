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
import { campusYaw, worldTo3D } from "../world/scale";

// Avatar V2 (STEP 4.9.2 §14): stylized metaverse human, ~1.7m.
// Segmented limbs (thigh/calf, upper arm/forearm), shoulders, hips,
// shoes, procedural hair styles and a top/bottom clothing split.
// The identity contract and realtime protocol are untouched — this is
// purely the visual body consuming the same AvatarIdentity + sample().

export interface AvatarSample {
  x: number;
  y: number;
  direction: Direction;
  moving: boolean;
}

function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * f)));
  return `#${((c((n >> 16) & 255) << 16) | (c((n >> 8) & 255) << 8) | c(n & 255))
    .toString(16)
    .padStart(6, "0")}`;
}

function hashOf(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

const BOTTOMS = ["#2c3140", "#3b4358", "#33383f", "#28303a", "#41465a"];
const HAIRS = ["#3a3230", "#241f1e", "#5a4632", "#6e6258", "#2e3440"];
const SKINS = ["#e8c39c", "#f0d0ae", "#d9ab7f", "#c68e63"];

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
  const hipL = useRef<THREE.Group>(null);
  const hipR = useRef<THREE.Group>(null);
  const kneeL = useRef<THREE.Group>(null);
  const kneeR = useRef<THREE.Group>(null);
  const shoulderL = useRef<THREE.Group>(null);
  const shoulderR = useRef<THREE.Group>(null);
  const elbowL = useRef<THREE.Group>(null);
  const elbowR = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const phase = useRef(0);
  const yaw = useRef(0);
  const lastT = useRef(performance.now());

  const h = useMemo(() => hashOf(identity.userId), [identity.userId]);
  const skin = useMemo(
    () => new THREE.MeshStandardMaterial({ color: SKINS[h % SKINS.length], roughness: 0.75 }),
    [h],
  );
  const topMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: identity.color,
        roughness: 0.62,
        emissive: identity.color,
        emissiveIntensity: 0.07,
      }),
    [identity.color],
  );
  const sleeveMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({ color: shade(identity.color, 0.82), roughness: 0.7 }),
    [identity.color],
  );
  const bottomMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: BOTTOMS[(h >> 3) % BOTTOMS.length],
        roughness: 0.85,
      }),
    [h],
  );
  const hairMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({ color: HAIRS[(h >> 6) % HAIRS.length], roughness: 0.6 }),
    [h],
  );
  const shoeMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: (h >> 9) % 2 ? "#eceff3" : "#32363e",
        roughness: 0.45,
      }),
    [h],
  );
  const ringMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: STATUS_COLORS[identity.status],
        transparent: true,
        opacity: 0.9,
      }),
    [identity.status],
  );
  const ringGlowMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: STATUS_COLORS[identity.status],
        transparent: true,
        opacity: 0.22,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [identity.status],
  );

  const hairStyle = (h >> 12) % 4;

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const s = sample();
    if (!s) {
      g.visible = false;
      return;
    }
    g.visible = true;
    // Wall-clock dt: pose smoothing must converge in real time even
    // when render FPS drops (same rule as the camera rig).
    const now = performance.now();
    const dt = Math.min((now - lastT.current) / 1000, 0.3);
    lastT.current = now;
    const [x, , z] = worldTo3D(s.x, s.y);
    g.position.set(x, 0, z);

    // shortest-path yaw smoothing (facing carried through the campus
    // transform, so a walker faces the way they walk in every building)
    const targetYaw = campusYaw(s.x, s.y, s.direction);
    let dy = targetYaw - yaw.current;
    while (dy > Math.PI) dy -= Math.PI * 2;
    while (dy < -Math.PI) dy += Math.PI * 2;
    yaw.current += dy * Math.min(1, dt * 14);
    g.rotation.y = yaw.current;

    // gait
    if (s.moving) phase.current += dt * 9;
    else phase.current *= 1 - Math.min(1, dt * 10);
    const p = phase.current;
    const swing = Math.sin(p) * (s.moving ? 0.55 : 0);
    const t = now / 1000;

    // legs: hip swing + knee flex on the recovering leg
    if (hipL.current) hipL.current.rotation.x = swing;
    if (hipR.current) hipR.current.rotation.x = -swing;
    if (kneeL.current) kneeL.current.rotation.x = s.moving ? Math.max(0, -Math.sin(p)) * 0.85 : 0;
    if (kneeR.current) kneeR.current.rotation.x = s.moving ? Math.max(0, Math.sin(p)) * 0.85 : 0;

    // arms: counter-swing + relaxed elbow
    const armIdle = Math.sin(t * 1.1) * 0.03;
    if (shoulderL.current) shoulderL.current.rotation.x = -swing * 0.75 + armIdle;
    if (shoulderR.current) shoulderR.current.rotation.x = swing * 0.75 - armIdle;
    if (elbowL.current) elbowL.current.rotation.x = -(0.25 + (s.moving ? Math.max(0, Math.sin(p)) * 0.35 : 0));
    if (elbowR.current) elbowR.current.rotation.x = -(0.25 + (s.moving ? Math.max(0, -Math.sin(p)) * 0.35 : 0));

    // body: walk bob / idle breathing + subtle weight shift
    if (body.current) {
      body.current.position.y = s.moving
        ? Math.abs(Math.sin(p)) * 0.045
        : Math.sin(t / 0.9) * 0.012;
      body.current.rotation.z = s.moving ? Math.sin(p) * 0.03 : Math.sin(t * 0.45) * 0.018;
    }
  });

  return (
    <group ref={group} onClick={onClick ? (e) => { e.stopPropagation(); onClick(); } : undefined}>
      {/* status ring + additive halo + contact blob */}
      <mesh material={ringMat} rotation-x={-Math.PI / 2} position={[0, 0.03, 0]}>
        <ringGeometry args={[0.3, 0.36, 24]} />
      </mesh>
      <mesh material={ringGlowMat} rotation-x={-Math.PI / 2} position={[0, 0.025, 0]}>
        <ringGeometry args={[0.24, 0.5, 24]} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.015, 0]}>
        <circleGeometry args={[0.32, 20]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.18} />
      </mesh>

      <group ref={body}>
        {/* legs: thigh → knee → calf → shoe */}
        {[-1, 1].map((side) => (
          <group
            key={side}
            ref={side < 0 ? hipL : hipR}
            position={[side * -0.095, 0.84, 0]}
          >
            <RoundedBox args={[0.145, 0.4, 0.17]} radius={0.05} position={[0, -0.19, 0]} material={bottomMat} castShadow />
            <group ref={side < 0 ? kneeL : kneeR} position={[0, -0.4, 0]}>
              <RoundedBox args={[0.125, 0.36, 0.145]} radius={0.045} position={[0, -0.17, 0]} material={bottomMat} castShadow />
              {/* two-part shoe: colored upper + light sole */}
              <RoundedBox args={[0.13, 0.065, 0.24]} radius={0.03} position={[0, -0.36, 0.04]} material={shoeMat} castShadow />
              <RoundedBox args={[0.138, 0.032, 0.27]} radius={0.015} position={[0, -0.407, 0.05]} material={MAT.white} />
            </group>
          </group>
        ))}

        {/* hips + torso: waist → chest (broader at the shoulders) */}
        <RoundedBox args={[0.34, 0.16, 0.2]} radius={0.06} position={[0, 0.88, 0]} material={bottomMat} castShadow />
        <RoundedBox args={[0.36, 0.3, 0.21]} radius={0.07} position={[0, 1.08, 0]} material={topMat} castShadow />
        <RoundedBox args={[0.42, 0.26, 0.23]} radius={0.08} position={[0, 1.3, 0]} material={topMat} castShadow />

        {/* shoulders + segmented arms */}
        {[-1, 1].map((side) => (
          <group key={side}>
            <mesh material={sleeveMat} position={[side * 0.245, 1.38, 0]} castShadow>
              <sphereGeometry args={[0.075, 10, 8]} />
            </mesh>
            <group
              ref={side < 0 ? shoulderL : shoulderR}
              position={[side * 0.26, 1.36, 0]}
            >
              <RoundedBox args={[0.1, 0.28, 0.115]} radius={0.04} position={[0, -0.13, 0]} material={sleeveMat} castShadow />
              <group ref={side < 0 ? elbowL : elbowR} position={[0, -0.27, 0]}>
                <RoundedBox args={[0.088, 0.24, 0.1]} radius={0.038} position={[0, -0.1, 0]} material={skin} castShadow />
                <mesh material={skin} position={[0, -0.245, 0]}>
                  <sphereGeometry args={[0.052, 8, 7]} />
                </mesh>
              </group>
            </group>
          </group>
        ))}

        {/* collar + neck + head + hair + face */}
        <RoundedBox args={[0.2, 0.05, 0.15]} radius={0.02} position={[0, 1.435, 0]} material={bottomMat} />
        <mesh material={skin} position={[0, 1.46, 0]}>
          <cylinderGeometry args={[0.05, 0.06, 0.08, 10]} />
        </mesh>
        <mesh material={skin} position={[0, 1.585, 0]} castShadow>
          <sphereGeometry args={[0.144, 18, 14]} />
        </mesh>
        {/* quiet mouth line */}
        <mesh position={[0, 1.528, 0.138]}>
          <planeGeometry args={[0.045, 0.008]} />
          <meshBasicMaterial color="#a8836a" />
        </mesh>
        {hairStyle === 0 ? (
          // short crop
          <mesh material={hairMat} position={[0, 1.655, -0.012]}>
            <sphereGeometry args={[0.152, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2.1]} />
          </mesh>
        ) : hairStyle === 1 ? (
          // side-part wedge
          <group>
            <mesh material={hairMat} position={[0, 1.66, -0.01]}>
              <sphereGeometry args={[0.15, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2.4]} />
            </mesh>
            <RoundedBox args={[0.16, 0.07, 0.13]} radius={0.03} position={[0.055, 1.7, 0.045]} material={hairMat} rotation-z={-0.2} />
          </group>
        ) : hairStyle === 2 ? (
          // bun
          <group>
            <mesh material={hairMat} position={[0, 1.65, -0.02]}>
              <sphereGeometry args={[0.152, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2 ]} />
            </mesh>
            <mesh material={hairMat} position={[0, 1.74, -0.1]}>
              <sphereGeometry args={[0.06, 10, 8]} />
            </mesh>
          </group>
        ) : (
          // fringe bob
          <group>
            <mesh material={hairMat} position={[0, 1.64, -0.015]}>
              <sphereGeometry args={[0.156, 16, 12, 0, Math.PI * 2, 0, Math.PI / 1.75]} />
            </mesh>
            <RoundedBox args={[0.26, 0.1, 0.05]} radius={0.024} position={[0, 1.63, 0.125]} material={hairMat} />
          </group>
        )}
        {[-0.052, 0.052].map((ex) => (
          <mesh key={ex} position={[ex, 1.585, 0.135]}>
            <sphereGeometry args={[0.016, 6, 6]} />
            <meshBasicMaterial color="#262a31" />
          </mesh>
        ))}
      </group>

      {showTag ? (
        <Html
          position={[0, 2.08, 0]}
          center
          distanceFactor={7}
          style={{ pointerEvents: "none", whiteSpace: "nowrap" }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "rgba(13,20,32,0.74)",
              border: "1px solid rgba(120,208,255,0.38)",
              borderRadius: 999,
              padding: "3px 11px",
              fontFamily: "system-ui, sans-serif",
              boxShadow:
                "0 2px 10px rgba(8,14,24,0.35), 0 0 14px rgba(99,214,255,0.18)",
              backdropFilter: "blur(6px)",
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: 999,
                background: STATUS_COLORS[identity.status],
                boxShadow: `0 0 6px ${STATUS_COLORS[identity.status]}`,
              }}
              title={STATUS_LABELS[identity.status]}
            />
            <span style={{ fontSize: 12, fontWeight: 600, color: "#f2f8fd" }}>
              {identity.displayName}
            </span>
            {identity.department ? (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 500,
                  color: "#8fc6e8",
                  letterSpacing: "0.04em",
                }}
              >
                {identity.department}
              </span>
            ) : null}
          </div>
        </Html>
      ) : null}
    </group>
  );
}
