"use client";

import { memo, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { LabSim } from "../LabSim";
import {
  AREA_BY_ID,
  AREAS,
  DOORWAYS,
  FURNITURE,
  WALL_T,
  WALLS,
  WORLD,
} from "@/lib/game/map";
import type { AreaId, Rect } from "@/types/office";
import {
  CoffeeTable,
  PlantSmall,
  PlantTall,
  Reception,
  Rug,
  Sofa,
} from "./Furniture";
import { MAT, makeTextTexture } from "./materials";
import { rectTo3D, rectToFurniture, u, WALL_HEIGHT_M, WORLD_SCALE_RATIO } from "./scale";
import { cameraWorldUnits, OcclusionSet, useViewOcclusion } from "./occlusion";
import {
  FloatingOrbs,
  MetaCity,
  Nature,
  SkyDome,
  TwoSidedSign,
  Vehicles,
  writeInstances,
  type InstanceSpec,
} from "./effects";
import { AreaGateways } from "./gateways";
import { CentralSpine } from "./spine";
import { RoomIdentity, useRoomFloor } from "./rooms";
import {
  ArrivalPlatform,
  CurvedCorners,
  EntranceFascia,
  FloatingCeiling,
  FloorSlits,
  GuidancePulse,
  HeroCore,
  HoloGreeting,
  RingGate,
  SmartGlass,
  usePlazaMaterial,
} from "./entrance";

// World builder: map.ts stays the source of truth for geometry that
// matters (collision / areas / doors). This module only decides how each
// rect LOOKS. Detailed areas: ENTRANCE / STAFF / MEETING; the other
// seven render as light massing so the floor stays continuous (§7).

const DETAILED: ReadonlySet<AreaId> = new Set(["ENTRANCE", "STAFF", "MEETING"]);



type WallKind = "outer" | "meetingGlass" | "solid";

function classifyWall(r: Rect): WallKind {
  const m = AREA_BY_ID.MEETING.bounds;
  const inMeeting =
    r.x >= m.x - 1 && r.x + r.w <= m.x + m.w + 1 && r.y >= m.y - 1 && r.y + r.h <= m.y + m.h + 1;
  const meetingNorth = inMeeting && Math.abs(r.y - m.y) < 1 && r.h === WALL_T;
  // North edge of MEETING stays solid — it carries the wall display.
  if (meetingNorth) return "solid";
  // World-boundary walls AND room walls hugging the boundary render as
  // window walls, so perimeter rooms get daylight instead of gray backs.
  const margin = WALL_T * 2 + 4;
  const nearEdge =
    r.x <= margin ||
    r.y <= margin ||
    r.x + r.w >= WORLD.w - margin ||
    r.y + r.h >= WORLD.h - margin;
  if (nearEdge) return "outer";
  if (inMeeting) return "meetingGlass";
  return "solid";
}

/**
 * Text panel. With `glow` the panel renders unlit — the texture's
 * authored colors ARE the emitted light (digital signage device).
 */
function TextPanel({
  position,
  rotationY = 0,
  width,
  height,
  texture,
  backing = MAT.charcoal,
  glow = false,
}: {
  position: [number, number, number];
  rotationY?: number;
  width: number;
  height: number;
  texture: THREE.Texture;
  backing?: THREE.Material;
  glow?: boolean;
}) {
  const mat = useMemo(
    () =>
      glow
        ? new THREE.MeshBasicMaterial({ map: texture, toneMapped: false })
        : new THREE.MeshStandardMaterial({ map: texture, roughness: 0.7 }),
    [texture, glow],
  );
  return (
    <group position={position} rotation-y={rotationY}>
      <mesh material={backing} position={[0, 0, -0.03]} castShadow>
        <boxGeometry args={[width + 0.15, height + 0.15, 0.05]} />
      </mesh>
      <mesh material={mat}>
        <planeGeometry args={[width, height]} />
      </mesh>
      {glow ? (
        <mesh material={MAT.neonCyan} position={[0, -height / 2 - 0.055, 0.01]}>
          <boxGeometry args={[width + 0.15, 0.018, 0.018]} />
        </mesh>
      ) : null}
    </group>
  );
}

/* ── walls ──────────────────────────────────────────────────────────
 * Slabs render as one small group per wall (so the dollhouse occlusion
 * can hide a wall wholesale); all repeated metalwork (rails, mullions,
 * posts, baseboards) and neon lines across EVERY wall collapse into
 * two InstancedMeshes — hundreds of boxes for two draw calls. Hidden
 * walls zero out their instances in the same per-frame pass. */

interface WallBuild {
  r: Rect;
  kind: WallKind;
  horizontal: boolean;
  slabs: Array<{ mat: THREE.Material; y: number; sx: number; sy: number; sz: number }>;
}

function buildWalls() {
  const classified: WallBuild[] = [];
  const silver: Array<InstanceSpec & { wall: number }> = [];
  const neon: Array<InstanceSpec & { wall: number }> = [];
  const H = WALL_HEIGHT_M;
  WALLS.forEach((r, wi) => {
    const kind = classifyWall(r);
    const { cx, cz, w, d } = rectTo3D(r);
    const horizontal = r.w >= r.h;
    const len = horizontal ? w : d;
    const slabs: WallBuild["slabs"] = [];
    if (kind === "outer") {
      // proportioned for the hall's 5.4 m walls: waist-high sill, then
      // a tall glass band up to a slim solid header
      const sill = 1.5;
      const top = 4.55;
      slabs.push({ mat: MAT.wallWarm, y: sill / 2, sx: w, sy: sill, sz: d });
      slabs.push({
        mat: MAT.glass,
        y: (sill + top) / 2,
        sx: horizontal ? w : w * 0.4,
        sy: top - sill,
        sz: horizontal ? d * 0.4 : d,
      });
      slabs.push({ mat: MAT.wallPaint, y: (top + H) / 2, sx: w, sy: H - top, sz: d });
      for (const fy of [sill, top]) {
        silver.push({
          wall: wi, x: cx, y: fy, z: cz,
          sx: horizontal ? w : w * 0.6, sy: 0.06, sz: horizontal ? d * 0.6 : d,
        });
      }
      const mull = Math.max(1, Math.round(len / 9.5));
      for (let i = 0; i <= mull; i++) {
        const t = -len / 2 + (i * len) / mull;
        silver.push({
          wall: wi,
          x: horizontal ? cx + t : cx,
          y: (sill + top) / 2,
          z: horizontal ? cz : cz + t,
          sx: horizontal ? 0.06 : w * 0.7,
          sy: top - sill,
          sz: horizontal ? d * 0.7 : 0.06,
        });
      }
    } else if (kind === "meetingGlass") {
      slabs.push({
        mat: MAT.glassMeeting,
        y: H / 2,
        sx: horizontal ? w : w * 0.3,
        sy: H,
        sz: horizontal ? d * 0.3 : d,
      });
      for (const fy of [0.05, 2.0, H - 0.05]) {
        silver.push({
          wall: wi, x: cx, y: fy, z: cz,
          sx: horizontal ? w : w * 0.5, sy: 0.05, sz: horizontal ? d * 0.5 : d,
        });
      }
      const posts = Math.max(1, Math.round(len / 3.8));
      for (let i = 0; i <= posts; i++) {
        const t = -len / 2 + (i * len) / posts;
        silver.push({
          wall: wi,
          x: horizontal ? cx + t : cx,
          y: H / 2,
          z: horizontal ? cz : cz + t,
          sx: horizontal ? 0.05 : w * 0.6,
          sy: H,
          sz: horizontal ? d * 0.6 : 0.05,
        });
      }
      neon.push({
        wall: wi, x: cx, y: 0.05, z: cz,
        sx: horizontal ? w : 0.04, sy: 0.014, sz: horizontal ? 0.04 : d,
      });
    } else {
      slabs.push({ mat: MAT.wallPaint, y: H / 2, sx: w, sy: H, sz: d });
      silver.push({ wall: wi, x: cx, y: 0.11, z: cz, sx: w + 0.02, sy: 0.22, sz: d + 0.02 });
      neon.push({ wall: wi, x: cx, y: 0.3, z: cz, sx: w + 0.03, sy: 0.02, sz: d + 0.03 });
    }
    classified.push({ r, kind, horizontal, slabs });
  });
  return { classified, silver, neon };
}

function Walls({ sim }: { sim: LabSim }) {
  const { classified, silver, neon } = useMemo(buildWalls, []);
  const camera = useThree((s) => s.camera);
  const groupRefs = useRef<Array<THREE.Group | null>>([]);
  const silverRef = useRef<THREE.InstancedMesh>(null);
  const neonRef = useRef<THREE.InstancedMesh>(null);
  const occ = useMemo(() => new OcclusionSet(), []);
  const rects = useMemo(() => classified.map((c) => c.r), [classified]);

  useLayoutEffect(() => {
    writeInstances(silverRef.current, silver);
    writeInstances(neonRef.current, neon);
    occ.invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [silver, neon]);

  useFrame(() => {
    const cam = cameraWorldUnits(camera);
    occ.update(rects, sim.avatar.x, sim.avatar.y, cam.x, cam.y);
    for (let i = 0; i < classified.length; i++) {
      const g = groupRefs.current[i];
      if (g) g.visible = !occ.has(i);
    }
    if (occ.changed) {
      writeInstances(silverRef.current, silver, (i) => occ.has(silver[i].wall));
      writeInstances(neonRef.current, neon, (i) => occ.has(neon[i].wall));
    }
  });

  return (
    <group>
      {classified.map(({ r, slabs }, i) => {
        const { cx, cz } = rectTo3D(r);
        return (
          <group
            key={i}
            position={[cx, 0, cz]}
            ref={(el) => {
              groupRefs.current[i] = el;
            }}
          >
            {slabs.map((s, j) => (
              <mesh key={j} material={s.mat} position={[0, s.y, 0]} castShadow receiveShadow>
                <boxGeometry args={[s.sx, s.sy, s.sz]} />
              </mesh>
            ))}
          </group>
        );
      })}
      <instancedMesh
        ref={silverRef}
        args={[undefined, undefined, silver.length]}
        material={MAT.windowFrame}
      >
        <boxGeometry />
      </instancedMesh>
      <instancedMesh
        ref={neonRef}
        args={[undefined, undefined, neon.length]}
        material={MAT.neonCyan}
      >
        <boxGeometry />
      </instancedMesh>
    </group>
  );
}

/** One themed floor plane per area (ENTRANCE keeps its plaza art). */
function AreaFloor({ area, plaza }: { area: AreaId; plaza: THREE.Material }) {
  const themed = useRoomFloor(area);
  const a = AREA_BY_ID[area];
  const { cx, cz, w, d } = rectTo3D(a.bounds);
  return (
    <mesh
      material={area === "ENTRANCE" ? plaza : themed}
      rotation-x={-Math.PI / 2}
      position={[cx, 0.012, cz]}
      receiveShadow
    >
      <planeGeometry args={[w, d]} />
    </mesh>
  );
}

function Floors() {
  const plaza = usePlazaMaterial();
  return (
    <group>
      {/* corridor / base slab */}
      <mesh material={MAT.floorCorridor} rotation-x={-Math.PI / 2} position={[u(WORLD.w) / 2, 0, u(WORLD.h) / 2]} receiveShadow>
        <planeGeometry args={[u(WORLD.w), u(WORLD.h)]} />
      </mesh>
      {AREAS.map((a) => (
        <AreaFloor key={a.id} area={a.id} plaza={plaza} />
      ))}
      {/* doorway thresholds keep their 2D accent colors — rendered
          unlit so they read as luminous guide strips, not paint */}
      {DOORWAYS.map((dw, i) => {
        const { cx, cz, w, d } = rectTo3D(dw.rect);
        return (
          <mesh key={i} rotation-x={-Math.PI / 2} position={[cx, 0.02, cz]}>
            <planeGeometry args={[w, d]} />
            <meshBasicMaterial color={dw.accent} transparent opacity={0.6} />
          </mesh>
        );
      })}
      {/* digital circulation lines running the main corridor */}
      <mesh material={MAT.holo} rotation-x={-Math.PI / 2} position={[u(WORLD.w) / 2, 0.024, u(560)]}>
        <planeGeometry args={[u(WORLD.w) - 6, 0.27]} />
      </mesh>
      <mesh material={MAT.holoPurple} rotation-x={-Math.PI / 2} position={[u(WORLD.w) / 2, 0.024, u(640)]}>
        <planeGeometry args={[u(WORLD.w) - 6, 0.15]} />
      </mesh>
      {[500, 590, 680].map((yy, i) => (
        <mesh
          key={yy}
          material={i === 1 ? MAT.neonMagenta : MAT.neonCyan}
          rotation-x={-Math.PI / 2}
          position={[u(240 + i * 380), 0.024, u(yy)]}
        >
          <planeGeometry args={[0.15, 7.2]} />
        </mesh>
      ))}
    </group>
  );
}

/** Simple massing blocks for the 7 undetailed areas' map furniture. */
function MassingFurniture() {
  const massing = useMemo(
    () =>
      FURNITURE.filter((f) => {
        for (const id of DETAILED) {
          const b = AREA_BY_ID[id].bounds;
          const cx = f.rect.x + f.rect.w / 2;
          const cy = f.rect.y + f.rect.h / 2;
          if (cx >= b.x && cx <= b.x + b.w && cy >= b.y && cy <= b.y + b.h) return false;
        }
        return true;
      }),
    [],
  );
  return (
    <group>
      {massing.map((f, i) => {
        const { cx, cz, w, d } = rectToFurniture(f.rect);
        const h = f.kind === "rack" ? 1.6 : f.kind === "plant" ? 1.1 : 0.75;
        return f.kind === "plant" ? (
          <PlantTall key={i} position={[cx, 0, cz]} scale={0.9} />
        ) : (
          <mesh key={i} material={MAT.floorMassing} position={[cx, h / 2, cz]} castShadow receiveShadow>
            <boxGeometry args={[w, h, d]} />
          </mesh>
        );
      })}
    </group>
  );
}

function AreaSign({
  area,
  position,
  sim,
  posts = false,
}: {
  area: AreaId;
  position: [number, number, number];
  sim: LabSim;
  posts?: boolean;
}) {
  const tex = useMemo(
    () =>
      makeTextTexture(
        [
          { text: AREA_BY_ID[area].label, size: 88, color: "#bfeaff", weight: 700 },
          { text: AREA_BY_ID[area].subtitle, size: 30, color: "#7d92ac", weight: 500 },
        ],
        {
          width: 640,
          height: 200,
          background: "#101a2a",
          backgroundTo: "#1c2c46",
          tracking: 6,
        },
      ),
    [area],
  );
  const group = useViewOcclusion(sim, position[0] / 0.025, position[2] / 0.025);
  return (
    <group ref={group}>
      <TextPanel position={position} width={4.6} height={1.44} texture={tex} glow />
      {posts
        ? [-2.0, 2.0].map((px) => (
            <mesh
              key={px}
              material={MAT.windowFrame}
              position={[position[0] + px, position[1] / 2 - 0.36, position[2]]}
            >
              <boxGeometry args={[0.08, position[1] - 0.72, 0.08]} />
            </mesh>
          ))
        : null}
    </group>
  );
}

const BILLBOARD_AREAS: Array<{ area: AreaId; bg: string; bgTo: string; fg: string }> = [
  { area: "SIGNAL", bg: "#2a1240", bgTo: "#7b2a8f", fg: "#ffd7f5" },
  { area: "TABLE", bg: "#0e2440", bgTo: "#1e5f8f", fg: "#d7f2ff" },
  { area: "GREEN", bg: "#0e3428", bgTo: "#1f7f5f", fg: "#d9ffef" },
  { area: "AI", bg: "#301040", bgTo: "#8f2a6f", fg: "#ffe0f8" },
];

/** One rooftop billboard floating above an area block. */
function RooftopBillboard({
  sim,
  area,
  bg,
  bgTo,
  fg,
}: {
  sim: LabSim;
  area: AreaId;
  bg: string;
  bgTo: string;
  fg: string;
}) {
  const b = AREA_BY_ID[area].bounds;
  const cxUnits = b.x + b.w / 2;
  const cyUnits = b.y + b.h / 2;
  const group = useViewOcclusion(sim, cxUnits, cyUnits, 400);
  const tex = useMemo(
    () =>
      makeTextTexture(
        [
          { text: AREA_BY_ID[area].label, size: 96, color: fg, weight: 800 },
          { text: AREA_BY_ID[area].subtitle, size: 30, color: "#cfe0f0", weight: 500 },
        ],
        { width: 640, height: 240, background: bg, backgroundTo: bgTo, tracking: 5 },
      ),
    [area, bg, bgTo, fg],
  );
  return (
    <group ref={group}>
      <group position={[u(cxUnits), 7.4, u(cyUnits)]}>
        <TwoSidedSign texture={tex} width={6.2} height={2.34} />
        <mesh material={MAT.neonCyan} position={[0, -1.32, 0]}>
          <boxGeometry args={[6.2, 0.05, 0.05]} />
        </mesh>
        <mesh material={MAT.brushed} position={[0, -2.3, 0]}>
          <boxGeometry args={[0.12, 2.0, 0.12]} />
        </mesh>
      </group>
    </group>
  );
}

function RooftopBillboards({ sim }: { sim: LabSim }) {
  return (
    <group>
      {BILLBOARD_AREAS.map((s) => (
        <RooftopBillboard key={s.area} sim={sim} {...s} />
      ))}
    </group>
  );
}

// ── detailed areas ───────────────────────────────────────────────────

function EntranceArea({ sim }: { sim: LabSim }) {
  const b = AREA_BY_ID.ENTRANCE.bounds; // 680,800 400x384
  const counter = FURNITURE.find((f) => f.kind === "counter")!;
  const c = rectToFurniture(counter.rect);
  const brandTex = useMemo(
    () =>
      makeTextTexture(
        [
          { text: "AnyWare", size: 120, color: "#eaf6ff", weight: 700 },
          { text: "OFFICE", size: 64, color: "#6fe9c8", weight: 600 },
          { text: "世の中をアップデートする。", size: 34, color: "#9db4d4", weight: 500 },
        ],
        {
          width: 1024,
          height: 512,
          background: "#0e1726",
          backgroundTo: "#233a5e",
          tracking: 8,
        },
      ),
    [],
  );
  const east = u(b.x + b.w) - 0.6;
  return (
    <group>
      {/* arrival axis: platform → lane (in the plaza floor) → gate */}
      <ArrivalPlatform />
      <GuidancePulse />
      <RingGate sim={sim} />
      <HeroCore sim={sim} />
      <HoloGreeting />
      <EntranceFascia sim={sim} />
      <FloatingCeiling />
      <SmartGlass />
      <CurvedCorners />
      <FloorSlits />
      <Reception cx={c.cx} cz={c.cz} w={c.w} d={c.d} />
      {/* digital brand wall on the west face */}
      <TextPanel
        position={[u(b.x) + 0.8, 2.6, u(990)]}
        rotationY={Math.PI / 2}
        width={9.0}
        height={4.3}
        texture={brandTex}
        glow
      />
      {/* lounge corner against the east wall */}
      <Rug position={[east - 1.2, 0.02, u(1060)]} radius={1.5} />
      <Sofa
        position={[east - 0.55, 0, u(1060)]}
        rotationY={-Math.PI / 2}
        width={2.2}
        mat={MAT.fabricGreen}
      />
      <CoffeeTable position={[east - 1.9, 0, u(1060)]} />
      <PlantTall position={[east - 0.5, 0, u(980)]} scale={0.85} />
      {/* map plants (collision-linked) */}
      {FURNITURE.filter(
        (f) => f.kind === "plant" && f.rect.y > 900 && f.rect.x > 1000,
      ).map((f, i) => {
        const p = rectToFurniture(f.rect);
        return <PlantTall key={i} position={[p.cx, 0, p.cz]} />;
      })}
      <PlantSmall position={[c.cx - c.w / 2 - 0.5, 0, c.cz + 0.2]} />
    </group>
  );
}

/** STAFF / MEETING interiors live in districts.tsx (LOD-managed);
 * these keep only the doorway signage that belongs to the corridor. */
function StaffArea({ sim }: { sim: LabSim }) {
  return <AreaSign area="STAFF" position={[u(189), 4.2, u(416) + 0.2]} sim={sim} />;
}

function MeetingArea({ sim }: { sim: LabSim }) {
  return <AreaSign area="MEETING" position={[u(1227), 4.2, u(416) + 0.2]} sim={sim} />;
}

function WorldImpl({ sim }: { sim: LabSim }) {
  return (
    <group>
      {/* Backdrop authored against the original office scale; one group
          scale keeps sky, city, greenery and traffic in register with
          the enlarged hall. */}
      <group scale={WORLD_SCALE_RATIO}>
        <SkyDome />
        <MetaCity />
        <Nature />
        <FloatingOrbs />
        <Vehicles />
      </group>
      <Floors />
      <Walls sim={sim} />
      <MassingFurniture />
      {/* district character: emblem, banner and accent rail per room */}
      {AREAS.filter((a) => a.id !== "ENTRANCE").map((a) => (
        <RoomIdentity key={a.id} area={a.id} bounds={a.bounds} sim={sim} />
      ))}
      <AreaGateways sim={sim} />
      <RooftopBillboards sim={sim} />
      <EntranceArea sim={sim} />
      <StaffArea sim={sim} />
      <MeetingArea sim={sim} />
      <CentralSpine />
    </group>
  );
}

export const World = memo(WorldImpl);
