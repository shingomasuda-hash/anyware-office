"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import * as THREE from "three";
import { buildIdentity, type AvatarIdentity } from "@/lib/identity/identity";
import type { RosterEntry } from "@/lib/realtime/types";
import type { CurrentUser } from "@/lib/auth/types";
import type { EffectiveStatus } from "@/lib/identity/identity";
import type { LabSim } from "./LabSim";
import AvatarMesh, { type AvatarSample } from "./avatars/AvatarMesh";
import { World } from "./world/World";
import { worldTo3D } from "./world/scale";

const SKY = "#e3eef7";

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

function CameraRig({ sim }: { sim: LabSim }) {
  const camera = useThree((s) => s.camera);
  const vDesired = useMemo(() => new THREE.Vector3(), []);
  const vLook = useMemo(() => new THREE.Vector3(), []);
  const first = useRef(true);
  const lastT = useRef(performance.now());
  useFrame(() => {
    const now = performance.now();
    const dt = Math.min((now - lastT.current) / 1000, 0.3);
    lastT.current = now;
    const [x, , z] = worldTo3D(sim.avatar.x, sim.avatar.y);
    vDesired.set(x, 3.15, z + 3.9);
    if (first.current) {
      camera.position.copy(vDesired);
      first.current = false;
    } else {
      camera.position.lerp(vDesired, 1 - Math.exp(-4.5 * dt));
    }
    vLook.set(x, 1.05, z - 1.7);
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
      <ambientLight intensity={0.12} color="#f2f7fd" />
      {/* per-area accent fills — a hint of colored light gives each
          room its own atmosphere without going neon-dark (§3) */}
      <pointLight position={[19.7, 2.6, 25.2]} intensity={14} color="#a8dcff" distance={9} decay={2} />
      <pointLight position={[4.7, 2.8, 2.7]} intensity={10} color="#eef4ff" distance={10} decay={2} />
      <pointLight position={[30.7, 2.6, 3.5]} intensity={12} color="#9fd4ff" distance={9} decay={2} />
    </>
  );
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
}: {
  sim: LabSim;
  user: CurrentUser;
  myStatus: EffectiveStatus;
  roster: RosterEntry[];
  onPickPerson: (userId: string) => void;
  onPickSelf: () => void;
  onReady: () => void;
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
      camera={{ fov: 50, near: 0.2, far: 140, position: [22, 3.7, 32] }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      style={{ touchAction: "none" }}
      onCreated={({ scene }) => {
        scene.background = new THREE.Color(SKY);
        scene.fog = new THREE.Fog(SKY, 36, 100);
        onReady();
      }}
    >
      <PerformanceMonitor onDecline={() => setDpr(1)} onIncline={() => setDpr(Math.min(window.devicePixelRatio, 2))}>
        <Lights />
        <World sim={sim} />
        <CameraRig sim={sim} />
        <LabInstruments sim={sim} />
        <AvatarMesh
          identity={localIdentity}
          sample={() => sim.avatar}
          showTag={false}
          onClick={onPickSelf}
        />
        <RemoteAvatars sim={sim} roster={roster} onPickPerson={onPickPerson} />
      </PerformanceMonitor>
    </Canvas>
  );
}
