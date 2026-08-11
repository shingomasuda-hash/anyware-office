"use client";

import { memo, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
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
  DeskBank,
  MeetingTable,
  Pendant,
  PlantSmall,
  PlantTall,
  Reception,
  Rug,
  Shelf,
  Sofa,
  TableProps,
  WhiteBoard,
} from "./Furniture";
import { MAT, makeTextTexture } from "./materials";
import { rectTo3D, u, WALL_HEIGHT_M } from "./scale";

// World builder: map.ts stays the source of truth for geometry that
// matters (collision / areas / doors). This module only decides how each
// rect LOOKS. Detailed areas: ENTRANCE / STAFF / MEETING; the other
// seven render as light massing so the floor stays continuous (§7).

const DETAILED: ReadonlySet<AreaId> = new Set(["ENTRANCE", "STAFF", "MEETING"]);

const FLOOR_MAT: Partial<Record<AreaId, THREE.Material>> = {
  ENTRANCE: MAT.floorEntrance,
  STAFF: MAT.floorWood,
  MEETING: MAT.floorCarpet,
};

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

function OuterWall({ r }: { r: Rect }) {
  const { cx, cz, w, d } = rectTo3D(r);
  const sill = 0.9;
  const glassTop = 2.35;
  const horizontal = r.w >= r.h;
  const len = horizontal ? w : d;
  const mullions = Math.max(1, Math.round(len / 3.2));
  return (
    <group position={[cx, 0, cz]}>
      <mesh material={MAT.wallWarm} position={[0, sill / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, sill, d]} />
      </mesh>
      <mesh material={MAT.glass} position={[0, (sill + glassTop) / 2, 0]}>
        <boxGeometry args={[horizontal ? w : w * 0.4, glassTop - sill, horizontal ? d * 0.4 : d]} />
      </mesh>
      <mesh material={MAT.wallPaint} position={[0, (glassTop + WALL_HEIGHT_M) / 2, 0]} castShadow>
        <boxGeometry args={[w, WALL_HEIGHT_M - glassTop, d]} />
      </mesh>
      {/* frame rails */}
      {[sill, glassTop].map((fy) => (
        <mesh key={fy} material={MAT.windowFrame} position={[0, fy, 0]}>
          <boxGeometry args={[horizontal ? w : w * 0.6, 0.06, horizontal ? d * 0.6 : d]} />
        </mesh>
      ))}
      {Array.from({ length: mullions + 1 }, (_, i) => {
        const t = -len / 2 + (i * len) / mullions;
        return (
          <mesh
            key={i}
            material={MAT.windowFrame}
            position={horizontal ? [t, (sill + glassTop) / 2, 0] : [0, (sill + glassTop) / 2, t]}
          >
            <boxGeometry
              args={
                horizontal
                  ? [0.06, glassTop - sill, d * 0.7]
                  : [w * 0.7, glassTop - sill, 0.06]
              }
            />
          </mesh>
        );
      })}
    </group>
  );
}

function GlassWall({ r }: { r: Rect }) {
  const { cx, cz, w, d } = rectTo3D(r);
  const horizontal = r.w >= r.h;
  const len = horizontal ? w : d;
  const posts = Math.max(1, Math.round(len / 1.8));
  return (
    <group position={[cx, 0, cz]}>
      <mesh material={MAT.glassMeeting} position={[0, WALL_HEIGHT_M / 2, 0]}>
        <boxGeometry args={[horizontal ? w : w * 0.3, WALL_HEIGHT_M, horizontal ? d * 0.3 : d]} />
      </mesh>
      {[0.04, 1.0, WALL_HEIGHT_M - 0.04].map((fy) => (
        <mesh key={fy} material={MAT.windowFrame} position={[0, fy, 0]}>
          <boxGeometry args={[horizontal ? w : w * 0.5, 0.05, horizontal ? d * 0.5 : d]} />
        </mesh>
      ))}
      {Array.from({ length: posts + 1 }, (_, i) => {
        const t = -len / 2 + (i * len) / posts;
        return (
          <mesh
            key={i}
            material={MAT.windowFrame}
            position={horizontal ? [t, WALL_HEIGHT_M / 2, 0] : [0, WALL_HEIGHT_M / 2, t]}
          >
            <boxGeometry
              args={horizontal ? [0.05, WALL_HEIGHT_M, d * 0.6] : [w * 0.6, WALL_HEIGHT_M, 0.05]}
            />
          </mesh>
        );
      })}
    </group>
  );
}

function SolidWall({ r }: { r: Rect }) {
  const { cx, cz, w, d } = rectTo3D(r);
  return (
    <group position={[cx, 0, cz]}>
      <mesh material={MAT.wallPaint} position={[0, WALL_HEIGHT_M / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, WALL_HEIGHT_M, d]} />
      </mesh>
      <mesh material={MAT.baseboard} position={[0, 0.06, 0]}>
        <boxGeometry args={[w + 0.01, 0.12, d + 0.01]} />
      </mesh>
    </group>
  );
}

function TextPanel({
  position,
  rotationY = 0,
  width,
  height,
  texture,
  backing = MAT.charcoal,
}: {
  position: [number, number, number];
  rotationY?: number;
  width: number;
  height: number;
  texture: THREE.Texture;
  backing?: THREE.Material;
}) {
  const mat = useMemo(
    () => new THREE.MeshStandardMaterial({ map: texture, roughness: 0.7 }),
    [texture],
  );
  return (
    <group position={position} rotation-y={rotationY}>
      <mesh material={backing} position={[0, 0, -0.03]} castShadow>
        <boxGeometry args={[width + 0.15, height + 0.15, 0.05]} />
      </mesh>
      <mesh material={mat}>
        <planeGeometry args={[width, height]} />
      </mesh>
    </group>
  );
}

/** Exterior: grass, hedges and soft tree blobs so windows never face void. */
function Exterior() {
  const trees = useMemo(() => {
    const list: Array<{ x: number; z: number; s: number }> = [];
    const ring = [
      ...Array.from({ length: 12 }, (_, i) => ({ x: -6 + i * 5, z: -5.5 })),
      ...Array.from({ length: 12 }, (_, i) => ({ x: -6 + i * 5, z: 35.5 })),
      ...Array.from({ length: 7 }, (_, i) => ({ x: -6, z: i * 5.5 })),
      ...Array.from({ length: 7 }, (_, i) => ({ x: 50, z: i * 5.5 })),
    ];
    ring.forEach((p, i) => list.push({ ...p, s: 0.8 + ((i * 37) % 10) / 14 }));
    return list;
  }, []);
  return (
    <group>
      <mesh material={MAT.grass} rotation-x={-Math.PI / 2} position={[22, -0.03, 15]} receiveShadow>
        <planeGeometry args={[140, 120]} />
      </mesh>
      {trees.map((t, i) => (
        <group key={i} position={[t.x, 0, t.z]} scale={t.s}>
          <mesh material={MAT.trunk} position={[0, 0.6, 0]}>
            <cylinderGeometry args={[0.12, 0.16, 1.2, 6]} />
          </mesh>
          <mesh material={i % 3 === 0 ? MAT.leafDark : MAT.leaf} position={[0, 1.8, 0]}>
            <icosahedronGeometry args={[1.1, 1]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Floors() {
  return (
    <group>
      {/* corridor / base slab */}
      <mesh material={MAT.floorCorridor} rotation-x={-Math.PI / 2} position={[u(WORLD.w) / 2, 0, u(WORLD.h) / 2]} receiveShadow>
        <planeGeometry args={[u(WORLD.w), u(WORLD.h)]} />
      </mesh>
      {AREAS.map((a) => {
        const { cx, cz, w, d } = rectTo3D(a.bounds);
        const mat = FLOOR_MAT[a.id] ?? MAT.floorMassing;
        return (
          <mesh key={a.id} material={mat} rotation-x={-Math.PI / 2} position={[cx, 0.012, cz]} receiveShadow>
            <planeGeometry args={[w, d]} />
          </mesh>
        );
      })}
      {/* doorway thresholds keep their 2D accent colors */}
      {DOORWAYS.map((dw, i) => {
        const { cx, cz, w, d } = rectTo3D(dw.rect);
        return (
          <mesh key={i} rotation-x={-Math.PI / 2} position={[cx, 0.02, cz]}>
            <planeGeometry args={[w, d]} />
            <meshStandardMaterial color={dw.accent} roughness={0.8} transparent opacity={0.55} />
          </mesh>
        );
      })}
    </group>
  );
}

/**
 * Camera-occlusion (§23): the third-person camera sits south of the
 * avatar with a fixed yaw, so any east-west wall between the avatar and
 * the camera would fill the screen. Those segments hide while occluding
 * (dollhouse-style) and pop back as soon as the player walks away.
 */
function Walls({ sim }: { sim: LabSim }) {
  const classified = useMemo(
    () => WALLS.map((r) => ({ r, kind: classifyWall(r) })),
    [],
  );
  const refs = useRef<Array<THREE.Group | null>>([]);
  useFrame(() => {
    const ay = sim.avatar.y;
    const ax = sim.avatar.x;
    for (let i = 0; i < classified.length; i++) {
      const g = refs.current[i];
      if (!g) continue;
      const { r } = classified[i];
      const horizontal = r.h === WALL_T && r.w > r.h;
      if (!horizontal) continue;
      // Wall between avatar and camera (camera ≈ avatar.y + 180u) and
      // horizontally near the view corridor → hide.
      const occludes =
        r.y > ay + 8 &&
        r.y < ay + 230 &&
        r.x < ax + 340 &&
        r.x + r.w > ax - 340;
      g.visible = !occludes;
    }
  });
  return (
    <group>
      {classified.map(({ r, kind }, i) => (
        <group
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
        >
          {kind === "outer" ? (
            <OuterWall r={r} />
          ) : kind === "meetingGlass" ? (
            <GlassWall r={r} />
          ) : (
            <SolidWall r={r} />
          )}
        </group>
      ))}
    </group>
  );
}

/** Simple gray blocks for the 7 massing areas' existing map furniture. */
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
        const { cx, cz, w, d } = rectTo3D(f.rect);
        const h = f.kind === "rack" ? 1.6 : f.kind === "plant" ? 1.1 : 0.75;
        return f.kind === "plant" ? (
          <PlantTall key={i} position={[cx, 0, cz]} scale={0.9} />
        ) : (
          <RoundedMass key={i} cx={cx} cz={cz} w={w} d={d} h={h} />
        );
      })}
    </group>
  );
}

function RoundedMass({ cx, cz, w, d, h }: { cx: number; cz: number; w: number; d: number; h: number }) {
  return (
    <mesh material={MAT.floorMassing} position={[cx, h / 2, cz]} castShadow receiveShadow>
      <boxGeometry args={[w, h, d]} />
    </mesh>
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
          { text: AREA_BY_ID[area].label, size: 88, color: "#f5f5f2", weight: 700 },
          { text: AREA_BY_ID[area].subtitle, size: 30, color: "#b9bdc4", weight: 500 },
        ],
        { width: 640, height: 200, background: "#2e3136", tracking: 6 },
      ),
    [area],
  );
  const group = useRef<THREE.Group>(null);
  // Same occlusion rule as walls: never let the sign sit between the
  // south-anchored camera and the avatar.
  const signYUnits = position[2] / 0.025;
  const signXUnits = position[0] / 0.025;
  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const occludes =
      signYUnits > sim.avatar.y + 8 &&
      signYUnits < sim.avatar.y + 230 &&
      Math.abs(signXUnits - sim.avatar.x) < 340;
    g.visible = !occludes;
  });
  return (
    <group ref={group}>
      <TextPanel position={position} width={2.4} height={0.75} texture={tex} />
      {posts
        ? [-1.05, 1.05].map((px) => (
            <mesh
              key={px}
              material={MAT.windowFrame}
              position={[position[0] + px, position[1] / 2 - 0.19, position[2]]}
            >
              <boxGeometry args={[0.05, position[1] - 0.38, 0.05]} />
            </mesh>
          ))
        : null}
    </group>
  );
}

// ── detailed areas ───────────────────────────────────────────────────

function EntranceArea({ sim }: { sim: LabSim }) {
  const b = AREA_BY_ID.ENTRANCE.bounds; // 680,800 400x384
  const counter = FURNITURE.find((f) => f.kind === "counter")!;
  const c = rectTo3D(counter.rect);
  const brandTex = useMemo(
    () =>
      makeTextTexture(
        [
          { text: "AnyWare", size: 120, color: "#f5f5f2", weight: 700 },
          { text: "OFFICE", size: 64, color: "#9fd3b4", weight: 600 },
          { text: "世の中をアップデートする。", size: 34, color: "#b9bdc4", weight: 500 },
        ],
        { width: 1024, height: 512, background: "#2e3136", tracking: 8 },
      ),
    [],
  );
  const east = u(b.x + b.w) - 0.6;
  return (
    <group>
      <Reception cx={c.cx} cz={c.cz} w={c.w} d={c.d} />
      {[c.cx - 1.1, c.cx + 1.1].map((px) => (
        <Pendant key={px} position={[px, 2.4, c.cz]} />
      ))}
      {/* brand wall on the west face — always in view while walking in,
          and never between the south-anchored camera and the avatar */}
      <TextPanel
        position={[u(b.x) + 0.55, 1.5, u(990)]}
        rotationY={Math.PI / 2}
        width={4.4}
        height={2.1}
        texture={brandTex}
      />
      {/* waiting corner against the east wall */}
      <Rug position={[east - 1.2, 0.02, u(1060)]} radius={1.5} />
      <Sofa position={[east - 0.55, 0, u(1060)]} rotationY={-Math.PI / 2} width={2.2} />
      <CoffeeTable position={[east - 1.9, 0, u(1060)]} />
      <PlantTall position={[east - 0.5, 0, u(980)]} scale={0.85} />
      {/* map plants (collision-linked) */}
      {FURNITURE.filter(
        (f) => f.kind === "plant" && f.rect.y > 900 && f.rect.x > 1000,
      ).map((f, i) => {
        const p = rectTo3D(f.rect);
        return <PlantTall key={i} position={[p.cx, 0, p.cz]} />;
      })}
      {/* hanging sign at the open corridor edge */}
      <AreaSign area="ENTRANCE" position={[u(880), 2.25, u(806)]} sim={sim} posts />
      <PlantSmall position={[c.cx - c.w / 2 - 0.5, 0, c.cz + 0.2]} />
    </group>
  );
}

function StaffArea({ sim }: { sim: LabSim }) {
  const b = AREA_BY_ID.STAFF.bounds; // 16,16 346x400
  const desks = FURNITURE.filter(
    (f) => f.kind === "desk" && f.rect.x < 362 && f.rect.y < 416,
  );
  return (
    <group>
      {desks.map((f, i) => {
        const p = rectTo3D(f.rect);
        return <DeskBank key={i} cx={p.cx} cz={p.cz} w={p.w} d={p.d} chairSide={i === 0 ? 1 : -1} />;
      })}
      {/* shelving along the north wall + a soft partition */}
      <Shelf position={[u(b.x) + 1.6, 0, u(b.y) + 0.62]} width={2.2} />
      <Shelf position={[u(b.x) + 4.2, 0, u(b.y) + 0.62]} width={2.2} />
      {/* lounge corner south side */}
      <Sofa position={[u(120), 0, u(365)]} rotationY={0} width={1.8} mat={MAT.fabricGreen} />
      <CoffeeTable position={[u(120), 0, u(322)]} />
      <PlantTall position={[u(330), 0, u(365)]} />
      {FURNITURE.filter((f) => f.kind === "plant" && f.rect.x === 312).map((f, i) => {
        const p = rectTo3D(f.rect);
        return <PlantTall key={i} position={[p.cx, 0, p.cz]} scale={0.9} />;
      })}
      <PlantSmall position={[u(40), 0, u(380)]} />
      <Rug position={[u(255), 0.02, u(210)]} radius={1.7} />
      <WhiteBoard position={[u(346) - 0.35, 0, u(150)]} rotationY={-Math.PI / 2} />
      <PlantSmall position={[u(330), 0, u(60)]} />
      <AreaSign area="STAFF" position={[u(189), 2.25, u(416) + 0.09]} sim={sim} />
    </group>
  );
}

function MeetingArea({ sim }: { sim: LabSim }) {
  const tables = FURNITURE.filter((f) => f.kind === "table" && f.rect.y < 416);
  const b = AREA_BY_ID.MEETING.bounds;
  const screenTex = useMemo(
    () =>
      makeTextTexture(
        [
          { text: "AnyWare OFFICE", size: 72, color: "#dfe8ee", weight: 700 },
          { text: "Weekly Sync — MEETING ROOM A", size: 36, color: "#8fa8bd", weight: 500 },
        ],
        { width: 1024, height: 512, background: "#141a22" },
      ),
    [],
  );
  const screenMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: screenTex,
        emissive: "#2a3947",
        emissiveIntensity: 0.6,
        roughness: 0.35,
      }),
    [screenTex],
  );
  return (
    <group>
      {tables.map((f, i) => {
        const p = rectTo3D(f.rect);
        return (
          <group key={i}>
            <MeetingTable cx={p.cx} cz={p.cz} w={p.w} d={p.d} />
            <TableProps position={[p.cx - 0.5, 0.775, p.cz + 0.15]} rotationY={0.4} />
            <TableProps position={[p.cx + 0.55, 0.775, p.cz - 0.12]} rotationY={Math.PI - 0.3} />
          </group>
        );
      })}
      {/* large display on the solid north wall */}
      <group position={[u(b.x + b.w / 2), 1.55, u(b.y) + 0.45]}>
        <mesh material={MAT.charcoal} position={[0, 0, -0.03]} castShadow>
          <boxGeometry args={[3.5, 1.95, 0.06]} />
        </mesh>
        <mesh material={screenMat}>
          <planeGeometry args={[3.3, 1.78]} />
        </mesh>
      </group>
      <PlantTall position={[u(b.x) + 0.7, 0, u(b.y) + 0.8]} />
      <PlantTall position={[u(b.x + b.w) - 0.7, 0, u(b.y + b.h) - 0.9]} scale={0.9} />
      <AreaSign area="MEETING" position={[u(1227), 2.25, u(416) + 0.09]} sim={sim} />
    </group>
  );
}

function WorldImpl({ sim }: { sim: LabSim }) {
  return (
    <group>
      <Exterior />
      <Floors />
      <Walls sim={sim} />
      <MassingFurniture />
      <EntranceArea sim={sim} />
      <StaffArea sim={sim} />
      <MeetingArea sim={sim} />
    </group>
  );
}

export const World = memo(WorldImpl);
