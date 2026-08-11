"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, PerformanceMonitor } from "@react-three/drei";
import * as THREE from "three";
import { buildIdentity, type AvatarIdentity } from "@/lib/identity/identity";
import type { RosterEntry } from "@/lib/realtime/types";
import type { CurrentUser } from "@/lib/auth/types";
import type { EffectiveStatus } from "@/lib/identity/identity";
import type { Direction } from "@/types/office";
import type { LabSim } from "./LabSim";
import AvatarMesh, { type AvatarSample } from "./avatars/AvatarMesh";
import { World } from "./world/World";
import { worldTo3D } from "./world/scale";

const SKY = "#e9e4f5";

declare global {
  interface Window {
    /** dev-only lab diagnostics for the acceptance harness. */
    __officeLab?: {
      stats: () => {
        fps: number;
        calls: number;
        triangles: number;
        dpr: number;
        camera: [number, number, number];
      };
    };
  }
}

/** Facing vector per 4-way direction (world units: +y is south). */
const DIR_VEC: Record<Direction, [number, number]> = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
};

/**
 * Chase camera: swings smoothly to sit BEHIND the walking direction,
 * so turning right or walking back turns the view with you. Height /
 * distance / pitch stay fixed (elevated third person).
 */
function CameraRig({ sim, isMobile }: { sim: LabSim; isMobile: boolean }) {
  const camera = useThree((s) => s.camera);
  const vDesired = useMemo(() => new THREE.Vector3(), []);
  const vLook = useMemo(() => new THREE.Vector3(), []);
  const first = useRef(true);
  const lastT = useRef(performance.now());
  const camYaw = useRef(0); // 0 = camera south of avatar, looking north
  // Mobile rides a little higher and further back so the tall viewport
  // shows the world's depth instead of a giant avatar (§23).
  const camY = isMobile ? 3.9 : 3.15;
  const camDist = isMobile ? 4.9 : 3.9;
  const lookAhead = isMobile ? 2.4 : 1.7;
  useFrame(() => {
    const now = performance.now();
    const dt = Math.min((now - lastT.current) / 1000, 0.3);
    lastT.current = now;
    const [fx, fz] = DIR_VEC[sim.avatar.direction];
    // camera offset direction is opposite the facing vector
    const targetYaw = Math.atan2(-fx, -fz);
    let dy = targetYaw - camYaw.current;
    while (dy > Math.PI) dy -= Math.PI * 2;
    while (dy < -Math.PI) dy += Math.PI * 2;
    camYaw.current += dy * (first.current ? 1 : 1 - Math.exp(-3.2 * dt));
    const ox = Math.sin(camYaw.current);
    const oz = Math.cos(camYaw.current);
    const [x, , z] = worldTo3D(sim.avatar.x, sim.avatar.y);
    vDesired.set(x + ox * camDist, camY, z + oz * camDist);
    if (first.current) {
      camera.position.copy(vDesired);
      first.current = false;
    } else {
      camera.position.lerp(vDesired, 1 - Math.exp(-4.5 * dt));
    }
    vLook.set(x - ox * lookAhead, 1.05, z - oz * lookAhead);
    camera.lookAt(vLook);
  });
  return null;
}

function Lights() {
  const light = useRef<THREE.DirectionalLight>(null);
  useEffect(() => {
    const l = light.current;
    if (!l) return;
    l.target.position.set(22, 0, 15);
    l.target.updateMatrixWorld();
  }, []);
  return (
    <>
      <hemisphereLight args={["#edf5fc", "#dde2e8", 1.0]} />
      <directionalLight
        ref={light}
        position={[40, 30, -8]}
        intensity={1.45}
        color="#fff6e8"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={28}
        shadow-camera-bottom={-28}
        shadow-camera-near={4}
        shadow-camera-far={90}
        shadow-bias={-0.0004}
      />
      <ambientLight intensity={0.1} color="#f2f7fd" />
      {/* per-area accent fills — a hint of colored light gives each
          room its own atmosphere without going neon-dark (§3). The
          entrance key light is warm architectural white; cyan there is
          reserved for information surfaces (§11). */}
      <pointLight position={[19.7, 2.8, 25.2]} intensity={11} color="#fff3e4" distance={9} decay={2} />
      <pointLight position={[22.2, 3.4, 24.8]} intensity={6} color="#ecf4fc" distance={6} decay={2} />
      <pointLight position={[4.7, 2.8, 2.7]} intensity={10} color="#eef4ff" distance={10} decay={2} />
      <pointLight position={[30.7, 2.6, 3.5]} intensity={12} color="#c9b2ff" distance={9} decay={2} />
    </>
  );
}

/**
 * Holds the loading overlay until the renderer has produced two REAL
 * frames. Real renders allocate shadow maps and upload every texture
 * through the normal pipeline, so shaders and samplers always match —
 * unlike gl.compile(), which pre-links shadow-sampling programs before
 * the shadow map exists and breaks strict drivers (Metal/ANGLE threw
 * GL_INVALID_OPERATION sampler mismatches on every draw). The warmup
 * frames also absorb the first-frame compile stall, so the first
 * keyboard input never lands inside it.
 */
function WarmupGate({ onReady }: { onReady: () => void }) {
  const frames = useRef(0);
  const done = useRef(false);
  useFrame(() => {
    if (done.current) return;
    frames.current += 1;
    if (frames.current >= 2) {
      done.current = true;
      onReady();
    }
  });
  return null;
}

/** Registers the world→screen projector + dev stats (§41). */
function LabInstruments({ sim }: { sim: LabSim }) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const gl = useThree((s) => s.gl);
  const frames = useRef(0);
  const fps = useRef(0);
  const last = useRef(performance.now());

  useEffect(() => {
    sim.projector = (wx, wy) => {
      const [x, , z] = worldTo3D(wx, wy);
      const v = new THREE.Vector3(x, 1.1, z);
      v.project(camera);
      if (v.z > 1) return null;
      return {
        x: (v.x * 0.5 + 0.5) * size.width,
        y: (-v.y * 0.5 + 0.5) * size.height,
      };
    };
    return () => {
      sim.projector = null;
    };
  }, [sim, camera, size]);

  useFrame(() => {
    frames.current++;
    const now = performance.now();
    if (now - last.current >= 1000) {
      fps.current = Math.round((frames.current * 1000) / (now - last.current));
      frames.current = 0;
      last.current = now;
    }
  });

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    window.__officeLab = {
      stats: () => ({
        fps: fps.current,
        calls: gl.info.render.calls,
        triangles: gl.info.render.triangles,
        dpr: gl.getPixelRatio(),
        camera: [camera.position.x, camera.position.y, camera.position.z],
      }),
    };
    return () => {
      delete window.__officeLab;
    };
  }, [gl, camera]);

  return null;
}

function RemoteAvatars({
  sim,
  roster,
  onPickPerson,
}: {
  sim: LabSim;
  roster: RosterEntry[];
  onPickPerson: (userId: string) => void;
}) {
  const samples = useRef(new Map<string, AvatarSample>());
  const lastT = useRef(performance.now());
  useFrame(() => {
    // Wall-clock dt: remote interpolation must converge in real time
    // even when render FPS drops.
    const now = performance.now();
    const dt = Math.min((now - lastT.current) / 1000, 0.3);
    lastT.current = now;
    const arr = sim.remoteSource?.(dt) ?? [];
    const m = samples.current;
    m.clear();
    for (const r of arr) m.set(r.userId, r);
  });
  const remotes = roster.filter((r) => !r.isSelf);
  return (
    <>
      {remotes.map((r) => (
        <AvatarMesh
          key={r.userId}
          identity={buildIdentity({
            userId: r.userId,
            displayName: r.displayName,
            department: r.department,
            avatarUrl: r.avatarUrl,
            status: r.status,
          })}
          sample={() => samples.current.get(r.userId) ?? null}
          showTag
          onClick={() => onPickPerson(r.userId)}
        />
      ))}
    </>
  );
}

export default function Office3DCanvas({
  sim,
  user,
  myStatus,
  roster,
  onPickPerson,
  onPickSelf,
  onReady,
  isMobile = false,
}: {
  sim: LabSim;
  user: CurrentUser;
  myStatus: EffectiveStatus;
  roster: RosterEntry[];
  onPickPerson: (userId: string) => void;
  onPickSelf: () => void;
  onReady: () => void;
  isMobile?: boolean;
}) {
  const [dpr, setDpr] = useState<number>(() =>
    Math.min(typeof window !== "undefined" ? window.devicePixelRatio : 1, 2),
  );

  const localIdentity: AvatarIdentity = useMemo(
    () =>
      buildIdentity({
        userId: user.id,
        displayName: user.name,
        department: user.department,
        avatarUrl: user.avatar_url,
        status: myStatus,
      }),
    [user, myStatus],
  );

  return (
    <Canvas
      shadows
      dpr={dpr}
      camera={{ fov: isMobile ? 56 : 50, near: 0.2, far: 140, position: [22, 3.7, 32] }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      style={{ touchAction: "none" }}
      onCreated={({ scene }) => {
        scene.background = new THREE.Color(SKY);
        scene.fog = new THREE.Fog(SKY, 42, 125);
      }}
    >
      <PerformanceMonitor onDecline={() => setDpr(1)} onIncline={() => setDpr(Math.min(window.devicePixelRatio, 2))}>
        <Lights />
        {/* static contact-shadow bake for the arrival plaza: grounds
            the reception, core pedestal and furniture (§10). far stays
            below the floating ceiling so panels don't darken the floor;
            frames=1 → rendered once, zero per-frame cost. */}
        <ContactShadows
          position={[22, 0.018, 24.8]}
          scale={13}
          far={2.4}
          blur={2.4}
          opacity={0.38}
          resolution={512}
          frames={1}
        />
        <World sim={sim} />
        <CameraRig sim={sim} isMobile={isMobile} />
        <LabInstruments sim={sim} />
        <AvatarMesh
          identity={localIdentity}
          sample={() => sim.avatar}
          showTag={false}
          onClick={onPickSelf}
        />
        <RemoteAvatars sim={sim} roster={roster} onPickPerson={onPickPerson} />
        <WarmupGate onReady={onReady} />
      </PerformanceMonitor>
    </Canvas>
  );
}
