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
import { u, WORLD_SCALE_RATIO, WORLD_UNIT_TO_METERS, worldTo3D } from "./world/scale";
import { AREAS, WALLS } from "@/lib/game/map";
import { ROOM_THEMES } from "./world/rooms";

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

const MIN_BOOM = 3.4; // metres — closest the camera may tuck in
const CAM_PAD = 0.7; // metres of clearance kept from any wall face

/**
 * Longest boom length (metres) from the avatar along (ox,oz) that keeps
 * the camera clear of every wall. Marching in world units against the
 * same WALLS rects the collision layer uses, so the camera obeys the
 * exact architecture the player sees.
 */
function cameraBoom(
  ax: number,
  ay: number,
  ox: number,
  oz: number,
  maxDist: number,
): number {
  const padU = CAM_PAD / WORLD_UNIT_TO_METERS;
  let best = maxDist;
  for (const r of WALLS) {
    // expand the wall by the pad, then ray-march the segment
    const minX = r.x - padU;
    const maxX = r.x + r.w + padU;
    const minY = r.y - padU;
    const maxY = r.y + r.h + padU;
    if (ax >= minX && ax <= maxX && ay >= minY && ay <= maxY) continue;
    // direction in world units per metre of boom
    const dx = (ox * 1) / WORLD_UNIT_TO_METERS;
    const dy = (oz * 1) / WORLD_UNIT_TO_METERS;
    let t0 = 0;
    let t1 = maxDist;
    let ok = true;
    if (Math.abs(dx) < 1e-6) {
      if (ax < minX || ax > maxX) ok = false;
    } else {
      let tA = (minX - ax) / dx;
      let tB = (maxX - ax) / dx;
      if (tA > tB) [tA, tB] = [tB, tA];
      t0 = Math.max(t0, tA);
      t1 = Math.min(t1, tB);
      if (t0 > t1) ok = false;
    }
    if (ok) {
      if (Math.abs(dy) < 1e-6) {
        if (ay < minY || ay > maxY) ok = false;
      } else {
        let tA = (minY - ay) / dy;
        let tB = (maxY - ay) / dy;
        if (tA > tB) [tA, tB] = [tB, tA];
        t0 = Math.max(t0, tA);
        t1 = Math.min(t1, tB);
        if (t0 > t1) ok = false;
      }
    }
    if (ok && t0 < best) best = t0;
  }
  return Math.max(MIN_BOOM, best);
}

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
  const camY = isMobile ? 8.2 : 6.8;
  const camDist = isMobile ? 10.5 : 8.6;
  const lookAhead = isMobile ? 4.6 : 3.4;
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
    // Spring arm: shorten the boom so the camera never passes through a
    // wall. Standing in a room and turning around used to push the
    // camera outside, which made the whole wall vanish; now the camera
    // simply pulls in and the room stays intact.
    const dist = cameraBoom(sim.avatar.x, sim.avatar.y, ox, oz, camDist);
    const [x, , z] = worldTo3D(sim.avatar.x, sim.avatar.y);
    // When the boom is compressed by a wall the camera RISES and looks
    // further down, so being cornered turns into a clean look into the
    // room instead of a close-up of the wall behind you.
    const t = Math.max(0, Math.min(1, (dist - MIN_BOOM) / Math.max(0.001, camDist - MIN_BOOM)));
    vDesired.set(x + ox * dist, camY + (1 - t) * 2.4, z + oz * dist);
    if (first.current) {
      camera.position.copy(vDesired);
      first.current = false;
    } else {
      // Pulling in must be quick (a wall is in the way); easing back
      // out stays smooth so the camera doesn't snap when space opens.
      const curDist = Math.hypot(camera.position.x - x, camera.position.z - z);
      const rate = dist < curDist ? 18 : 4.5;
      camera.position.lerp(vDesired, 1 - Math.exp(-rate * dt));
    }
    // look further down as the boom compresses
    vLook.set(x - ox * lookAhead * t, 1.05 - (1 - t) * 1.1, z - oz * lookAhead * t);
    camera.lookAt(vLook);
  });
  return null;
}

function Lights() {
  const light = useRef<THREE.DirectionalLight>(null);
  useEffect(() => {
    const l = light.current;
    if (!l) return;
    l.target.position.set(u(880), 0, u(600));
    l.target.updateMatrixWorld();
  }, []);
  return (
    <>
      <hemisphereLight args={["#edf5fc", "#dde2e8", 1.0]} />
      <directionalLight
        ref={light}
        position={[u(1600), 90, u(-320)]}
        intensity={1.45}
        color="#fff6e8"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-90}
        shadow-camera-right={90}
        shadow-camera-top={84}
        shadow-camera-bottom={-84}
        shadow-camera-near={10}
        shadow-camera-far={270}
        shadow-bias={-0.0012}
      />
      <ambientLight intensity={0.1} color="#f2f7fd" />
      {/* per-area accent fills — a hint of colored light gives each
          room its own atmosphere without going neon-dark (§3). The
          entrance key light is warm architectural white; cyan there is
          reserved for information surfaces (§11). */}
      <pointLight position={[u(788), 5.2, u(1008)]} intensity={95} color="#fff3e4" distance={27} decay={2} />
      <pointLight position={[u(888), 6.2, u(992)]} intensity={55} color="#ecf4fc" distance={18} decay={2} />
      {/* one key light per district, tinted by its theme (§room world
          building) so each room reads with its own atmosphere */}
      {AREAS.filter((a) => a.id !== "ENTRANCE").map((a) => (
        <pointLight
          key={a.id}
          position={[
            u(a.bounds.x + a.bounds.w / 2),
            5.2,
            u(a.bounds.y + a.bounds.h / 2),
          ]}
          intensity={95}
          color={ROOM_THEMES[a.id].light}
          distance={34}
          decay={2}
        />
      ))}
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
      camera={{ fov: isMobile ? 56 : 50, near: 0.3, far: 420, position: [u(880), 11, u(1280)] }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      style={{ touchAction: "none" }}
      onCreated={({ scene }) => {
        scene.background = new THREE.Color(SKY);
        scene.fog = new THREE.Fog(SKY, 126, 375);
      }}
    >
      <PerformanceMonitor onDecline={() => setDpr(1)} onIncline={() => setDpr(Math.min(window.devicePixelRatio, 2))}>
        <Lights />
        {/* static contact-shadow bake for the arrival plaza: grounds
            the reception, core pedestal and furniture (§10). far stays
            below the floating ceiling so panels don't darken the floor;
            frames=1 → rendered once, zero per-frame cost. */}
        <ContactShadows
          position={[u(880), 0.05, u(992)]}
          scale={13 * WORLD_SCALE_RATIO}
          far={7.2}
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
