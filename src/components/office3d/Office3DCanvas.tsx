"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import * as THREE from "three";
import { buildIdentity, type AvatarIdentity } from "@/lib/identity/identity";
import type { RosterEntry } from "@/lib/realtime/types";
import type { CurrentUser } from "@/lib/auth/types";
import type { EffectiveStatus } from "@/lib/identity/identity";
import type { AreaId } from "@/types/office";
import type { LabSim } from "./LabSim";
import AvatarMesh, { type AvatarSample } from "./avatars/AvatarMesh";
import { CampusWorld } from "./world/CampusWorld";
import { campusYaw, u, WORLD_UNIT_TO_METERS, worldTo3D } from "./world/scale";
import { DOORWAYS, WALLS } from "@/lib/game/map";
import {
  BUILDINGS,
  BUILDING_BY_ID,
  campusDirToCanonical,
  canonicalToCampus,
  LAB_SPAWN,
  PLAZA_CENTER,
} from "./world/campus";
import { ROOM_THEMES } from "./world/themes";
import { SEATS } from "./world/seats";

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
      /** canonical -> campus units, the exact function the world uses */
      campus: (x: number, y: number) => { x: number; y: number };
      /** campus plan: footprints, doors, heights */
      buildings: () => Array<{
        id: AreaId;
        cx: number;
        cy: number;
        w: number;
        h: number;
        phi: number;
        height: number;
        doorX: number;
        doorY: number;
      }>;
      /** remote avatars as the renderer sees them, canonical units */
      remotes: () => Array<{ userId: string; x: number; y: number }>;
      /** walk a probe body through the real collision data */
      probe: (
        ax: number,
        ay: number,
        bx: number,
        by: number,
      ) => { x: number; y: number; reached: boolean; area: AreaId | null };
      /** dev/test only: a building's local metres -> world metres */
      localToWorld: (
        id: AreaId,
        lx: number,
        ly: number,
        lz: number,
      ) => [number, number, number];
      /** dev/test only: seat anchors in canonical units */
      seats: () => Array<{ id: string; areaId: AreaId; label: string; ax: number; ay: number }>;
      /** dev/test only: park the camera for a survey shot, null resumes */
      setCamera: (
        pos: [number, number, number] | null,
        look: [number, number, number] | null,
      ) => void;
    };
  }
}

interface Framing {
  y: number;
  dist: number;
  look: number;
}

/**
 * Two camera modes (§9). Outdoors the boom lifts and pulls back so the
 * campus, its silhouettes and the sky are in shot; indoors it drops to
 * the room framing already tuned for these interiors. The switch is
 * eased over ~0.6 s, never snapped.
 */
const EXTERIOR: Framing = { y: 10.4, dist: 14.6, look: 5.2 };
/** Indoors the camera drops to roughly a head above the avatar and
 *  looks along the room. At the old height the ceiling filled the
 *  frame and you could not read the space you were standing in. */
const INTERIOR_DEFAULT: Framing = { y: 2.9, dist: 5.4, look: 2.0 };
const AREA_CAM: Partial<Record<AreaId, Framing>> = {
  // the arrival hall is taller, so it can carry a little more height
  ENTRANCE: { y: 3.6, dist: 6.6, look: 2.4 },
  STAFF: { y: 2.9, dist: 5.4, look: 2.0 },
  MEETING: { y: 2.9, dist: 5.6, look: 2.0 },
  SIGNAL: { y: 3.0, dist: 5.8, look: 2.1 },
};

/**
 * Dev/test camera override. The chase rig owns the camera every frame,
 * so the acceptance harness needs a documented way to park it for a
 * survey shot. Never set outside development.
 */
type DevCam = { pos: [number, number, number]; look: [number, number, number] };
const devCamRef: { current: DevCam | null } = { current: null };

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
  dx: number,
  dy: number,
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
  const camYaw = useRef(0);
  // Mobile rides a little higher and further back so the tall viewport
  // shows the world's depth instead of a giant avatar (§23).
  const mobileScale = isMobile ? 1.22 : 1;
  const framing = useRef({ ...EXTERIOR });
  useFrame(() => {
    if (devCamRef.current) {
      const { pos, look } = devCamRef.current;
      camera.position.set(pos[0], pos[1], pos[2]);
      camera.lookAt(look[0], look[1], look[2]);
      return;
    }
    const now = performance.now();
    const dt = Math.min((now - lastT.current) / 1000, 0.3);
    lastT.current = now;
    const ax = sim.avatar.x;
    const ay = sim.avatar.y;
    // Facing is read in CAMPUS space: buildings are turned to face the
    // plaza, so canonical "up" points somewhere different in each one.
    const targetYaw = campusYaw(ax, ay, sim.avatar.direction) + Math.PI;
    let dy = targetYaw - camYaw.current;
    while (dy > Math.PI) dy -= Math.PI * 2;
    while (dy < -Math.PI) dy += Math.PI * 2;
    camYaw.current += dy * (first.current ? 1 : 1 - Math.exp(-3.2 * dt));
    const ox = Math.sin(camYaw.current);
    const oz = Math.cos(camYaw.current);
    // exterior ↔ interior framing (§9)
    const area = sim.getSnapshot().area;
    const want = area ? AREA_CAM[area] ?? INTERIOR_DEFAULT : EXTERIOR;
    const k = first.current ? 1 : 1 - Math.exp(-1.6 * dt);
    framing.current.y += (want.y * mobileScale - framing.current.y) * k;
    framing.current.dist += (want.dist * mobileScale - framing.current.dist) * k;
    framing.current.look += (want.look * mobileScale - framing.current.look) * k;
    const camY = framing.current.y;
    const camDist = framing.current.dist;
    const lookAhead = framing.current.look;
    // Spring arm. The boom is measured in campus metres, but the walls
    // it has to clear live in canonical units, so the direction is
    // pushed back through the local linearisation of the transform —
    // exact where it matters (inside a building the transform is rigid).
    const back = campusDirToCanonical(ax, ay, ox / WORLD_UNIT_TO_METERS, oz / WORLD_UNIT_TO_METERS);
    const dist = cameraBoom(ax, ay, back.x, back.y, camDist);
    const [x, , z] = worldTo3D(ax, ay);
    // When the boom is compressed by a wall the camera RISES and looks
    // further down, so being cornered turns into a clean look into the
    // room instead of a close-up of the wall behind you.
    const t = Math.max(0, Math.min(1, (dist - MIN_BOOM) / Math.max(0.001, camDist - MIN_BOOM)));
    vDesired.set(x + ox * dist, camY + (1 - t) * (area ? 0.8 : 2.4), z + oz * dist);
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
  const plaza = useMemo(() => canonicalToCampus(PLAZA_CENTER.x, PLAZA_CENTER.y), []);
  useEffect(() => {
    const l = light.current;
    if (!l) return;
    l.target.position.set(u(plaza.x), 0, u(plaza.y));
    l.target.updateMatrixWorld();
  }, [plaza]);
  return (
    <>
      <hemisphereLight args={["#edf5fc", "#dde2e8", 1.05]} />
      {/* one sun for the whole campus — open air, mid-afternoon */}
      <directionalLight
        ref={light}
        position={[u(plaza.x) + 130, 150, u(plaza.y) - 190]}
        intensity={1.5}
        color="#fff6e8"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-140}
        shadow-camera-right={140}
        shadow-camera-top={140}
        shadow-camera-bottom={-140}
        shadow-camera-near={20}
        shadow-camera-far={460}
        shadow-bias={-0.0014}
      />
      <ambientLight intensity={0.12} color="#f2f7fd" />
      {/* One key light per building interior. It has to hang BELOW the
          ceiling plates — a light above them leaves every soffit and
          reveal unlit, which is exactly what makes an interior read as
          flat cardboard instead of architecture. */}
      {BUILDINGS.map((b) => (
        <pointLight
          key={b.id}
          position={[u(b.center.x), 3.0, u(b.center.y)]}
          intensity={190}
          color={ROOM_THEMES[b.id].light}
          distance={36}
          decay={2}
        />
      ))}
    </>
  );
}

/**
 * Steps the simulation once per rendered frame, on the wall clock.
 * Sub-steps stay <= 50 ms so collision behaves exactly as it does in
 * the 2D engine, and a 1.5 s catch-up ceiling covers main-thread
 * stalls without unbounded replay.
 */
function SimDriver({ sim }: { sim: LabSim }) {
  const last = useRef(performance.now());
  useFrame(() => {
    const now = performance.now();
    let elapsed = Math.min((now - last.current) / 1000, 1.5);
    last.current = now;
    while (elapsed > 0) {
      const step = Math.min(elapsed, 0.05);
      sim.update(step);
      elapsed -= step;
    }
  });
  return null;
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
      campus: (x, y) => canonicalToCampus(x, y),
      buildings: () =>
        BUILDINGS.map((b) => {
          const door = DOORWAYS.find(
            (d) =>
              d.rect.x >= b.bounds.x - 1 &&
              d.rect.x + d.rect.w <= b.bounds.x + b.bounds.w + 1 &&
              d.rect.y >= b.bounds.y - 1 &&
              d.rect.y + d.rect.h <= b.bounds.y + b.bounds.h + 1,
          );
          return {
            id: b.id,
            cx: b.center.x,
            cy: b.center.y,
            w: b.size.w,
            h: b.size.h,
            phi: b.phi,
            height: b.height,
            doorX: door ? door.rect.x + door.rect.w / 2 : b.canon.x,
            doorY: door ? door.rect.y + door.rect.h / 2 : b.canon.y,
          };
        }),
      remotes: () =>
        (sim.remoteSource?.(0) ?? []).map((r) => ({
          userId: r.userId,
          x: r.x,
          y: r.y,
        })),
      probe: (ax, ay, bx, by) => sim.probePath(ax, ay, bx, by),
      seats: () =>
        SEATS.map((s) => ({
          id: s.id,
          areaId: s.areaId,
          label: s.label,
          ax: s.approach.x,
          ay: s.approach.y,
        })),
      localToWorld: (id, lx, ly, lz) => {
        const b = BUILDING_BY_ID[id];
        // exactly the transform world/massing.tsx BuildingFrame applies
        const flip = b.frontSign > 0 ? 0 : Math.PI;
        const th = -b.phi + flip;
        return [
          u(b.center.x) + lx * Math.cos(th) + lz * Math.sin(th),
          ly,
          u(b.center.y) - lx * Math.sin(th) + lz * Math.cos(th),
        ];
      },
      setCamera: (pos, look) => {
        devCamRef.current = pos && look ? { pos, look } : null;
      },
    };
    return () => {
      delete window.__officeLab;
    };
  }, [gl, camera, sim]);

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
  const spawn = useMemo(() => canonicalToCampus(LAB_SPAWN.x, LAB_SPAWN.y), []);
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
      camera={{
        fov: isMobile ? 56 : 50,
        near: 0.3,
        far: 900,
        position: [u(spawn.x), 16, u(spawn.y) + 22],
      }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      style={{ touchAction: "none" }}
      onCreated={({ scene }) => {
        scene.background = new THREE.Color(SKY);
        scene.fog = new THREE.Fog(SKY, 200, 470);
      }}
    >
      <PerformanceMonitor onDecline={() => setDpr(1)} onIncline={() => setDpr(Math.min(window.devicePixelRatio, 2))}>
        <Lights />
        <SimDriver sim={sim} />
        <CampusWorld sim={sim} />
        <CameraRig sim={sim} isMobile={isMobile} />
        <LabInstruments sim={sim} />
        <AvatarMesh
          identity={localIdentity}
          sample={() => {
            const seat = sim.seatedIn();
            return seat
              ? { ...sim.avatar, seated: true, seatHeight: seat.seatHeight }
              : sim.avatar;
          }}
          showTag={false}
          onClick={onPickSelf}
        />
        <RemoteAvatars sim={sim} roster={roster} onPickPerson={onPickPerson} />
        <WarmupGate onReady={onReady} />
      </PerformanceMonitor>
    </Canvas>
  );
}
