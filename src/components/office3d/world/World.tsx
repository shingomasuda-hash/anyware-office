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
  const mullions = Math.max(1, Math.round(len / 4.8));
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
      {/* light rail along the glass base */}
      <mesh material={MAT.neonCyan} position={[0, 0.05, 0]}>
        <boxGeometry args={[horizontal ? w : 0.04, 0.014, horizontal ? 0.04 : d]} />
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
      {/* accent light line floating just above the baseboard */}
      <mesh material={MAT.neonCyan} position={[0, 0.16, 0]}>
        <boxGeometry args={[w + 0.02, 0.012, d + 0.02]} />
      </mesh>
    </group>
  );
}

/**
 * Text panel. With `glow` the texture doubles as an emissive map, so
 * the panel reads as a self-lit digital display instead of a printed
 * signboard — the core "digital signage" device of STEP 4.9.1.
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
      // Unlit for glow panels: the texture's authored colors ARE the
      // emitted light, so navy stays navy even in direct sun (a lit
      // material would wash the panel out to pale blue).
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

/**
 * Gradient sky dome — cyan zenith fading into a lavender-pink horizon.
 * This single mesh does most of the "you logged into a virtual world"
 * lifting: the space stops reading as a room under a gray sky and
 * starts reading as a district inside a bright digital city.
 */
function SkyDome() {
  const mat = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 512;
    const ctx = canvas.getContext("2d")!;
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, "#5fb4f2");
    grad.addColorStop(0.45, "#a8d2f7");
    grad.addColorStop(0.72, "#dfd8f7");
    grad.addColorStop(1, "#f7dcef");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 512);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshBasicMaterial({
      map: tex,
      side: THREE.BackSide,
      toneMapped: false,
      fog: false,
      depthWrite: false,
    });
  }, []);
  return (
    <mesh material={mat} position={[22, 0, 15]}>
      <sphereGeometry args={[95, 24, 12]} />
    </mesh>
  );
}

/** Shared lit-window texture for the digital-city towers. */
function useTowerMaterials() {
  return useMemo(() => {
    const makeTower = (base: string, win1: string, win2: string) => {
      const canvas = document.createElement("canvas");
      canvas.width = 64;
      canvas.height = 128;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, 64, 128);
      for (let y = 6; y < 122; y += 10) {
        for (let x = 6; x < 58; x += 12) {
          const r = (x * 31 + y * 17) % 10;
          if (r < 4) continue;
          ctx.fillStyle = r > 7 ? win2 : win1;
          ctx.fillRect(x, y, 7, 5);
        }
      }
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      return new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });
    };
    return [
      makeTower("#8ea6d8", "#eaf6ff", "#7fdcff"),
      makeTower("#a08fd8", "#f3ecff", "#f78ade"),
      makeTower("#7f9ccc", "#e8f6ff", "#7deccb"),
    ];
  }, []);
}

/**
 * Digital-city skyline ringing the campus — stylized towers with lit
 * windows (shared unlit textures, one draw call per tower) so every
 * perimeter window looks out at a metaverse city, not empty lawn.
 */
function MetaCity() {
  const mats = useTowerMaterials();
  const towers = useMemo(() => {
    const list: Array<{ x: number; z: number; w: number; h: number; m: number }> = [];
    const spots = [
      { x: -14, z: -12 }, { x: 0, z: -16 }, { x: 14, z: -14 }, { x: 30, z: -17 },
      { x: 44, z: -13 }, { x: 58, z: -8 }, { x: 60, z: 8 }, { x: 58, z: 24 },
      { x: 52, z: 38 }, { x: 30, z: 44 }, { x: 8, z: 44 }, { x: -12, z: 40 },
      { x: -18, z: 20 }, { x: -18, z: 4 },
    ];
    spots.forEach((p, i) => {
      list.push({
        ...p,
        w: 3.5 + ((i * 29) % 5),
        h: 7 + ((i * 41) % 12),
        m: i % 3,
      });
    });
    return list;
  }, []);
  return (
    <group>
      {towers.map((t, i) => (
        <mesh key={i} material={mats[t.m]} position={[t.x, t.h / 2 - 0.1, t.z]}>
          <boxGeometry args={[t.w, t.h, t.w]} />
        </mesh>
      ))}
    </group>
  );
}

/** Slow-drifting glow orbs — pure "virtual world" garnish. */
function FloatingOrbs() {
  const group = useRef<THREE.Group>(null);
  const orbs = useMemo(() => {
    const mats = [MAT.orbCyan, MAT.orbMagenta, MAT.orbPurple, MAT.orbMint];
    return Array.from({ length: 12 }, (_, i) => ({
      x: [21, 24.5, 18.5, 27, 15, 31, 9, 36, 5, 40, 12.5, 33.5][i],
      z: [26.5, 24, 22.5, 27.5, 14, 13, 17, 16, 9, 22, 27.9, 25][i],
      y: 3 + ((i * 23) % 30) / 10,
      r: 0.16 + ((i * 17) % 12) / 60,
      speed: 0.35 + ((i * 13) % 10) / 22,
      phase: i * 1.7,
      m: mats[i % 4],
    }));
  }, []);
  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const t = performance.now() / 1000;
    for (let i = 0; i < g.children.length; i++) {
      const o = orbs[i];
      g.children[i].position.y = o.y + Math.sin(t * o.speed + o.phase) * 0.35;
    }
  });
  return (
    <group ref={group}>
      {orbs.map((o, i) => (
        <mesh key={i} material={o.m} position={[o.x, o.y, o.z]}>
          <sphereGeometry args={[o.r, 12, 10]} />
        </mesh>
      ))}
    </group>
  );
}

/** Exterior: grass ring + tree blobs between the campus and the city. */
function Exterior() {
  const trees = useMemo(() => {
    const list: Array<{ x: number; z: number; s: number }> = [];
    const ring = [
      ...Array.from({ length: 7 }, (_, i) => ({ x: -5 + i * 8.5, z: -5.5 })),
      ...Array.from({ length: 7 }, (_, i) => ({ x: -5 + i * 8.5, z: 35.5 })),
      ...Array.from({ length: 3 }, (_, i) => ({ x: -6, z: 3 + i * 10 })),
      ...Array.from({ length: 3 }, (_, i) => ({ x: 50, z: 3 + i * 10 })),
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
      {/* digital circulation lines running the main corridor — the
          floor itself carries data-stream lighting, like a crosswalk
          in a virtual city block */}
      <mesh material={MAT.holo} rotation-x={-Math.PI / 2} position={[u(WORLD.w) / 2, 0.024, u(560)]}>
        <planeGeometry args={[u(WORLD.w) - 2, 0.09]} />
      </mesh>
      <mesh material={MAT.holoPurple} rotation-x={-Math.PI / 2} position={[u(WORLD.w) / 2, 0.024, u(640)]}>
        <planeGeometry args={[u(WORLD.w) - 2, 0.05]} />
      </mesh>
      {[500, 590, 680].map((yy, i) => (
        <mesh
          key={yy}
          material={i === 1 ? MAT.neonMagenta : MAT.neonCyan}
          rotation-x={-Math.PI / 2}
          position={[u(240 + i * 380), 0.024, u(yy)]}
        >
          <planeGeometry args={[0.05, 2.4]} />
        </mesh>
      ))}
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
      <TextPanel position={position} width={2.4} height={0.75} texture={tex} glow />
      {posts
        ? [-1.05, 1.05].map((px) => (
            <mesh
              key={px}
              material={MAT.windowFrame}
              position={[position[0] + px, position[1] / 2 - 0.19, position[2]]}
            >
              <boxGeometry args={[0.04, position[1] - 0.38, 0.04]} />
            </mesh>
          ))
        : null}
    </group>
  );
}

/**
 * Dollhouse occlusion shared by world set-pieces: hide the group while
 * it sits between the south-anchored camera and the avatar.
 */
function useSouthOcclusion(sim: LabSim, xUnits: number, yUnits: number, halfWidth = 340) {
  const group = useRef<THREE.Group>(null);
  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const occludes =
      yUnits > sim.avatar.y + 8 &&
      yUnits < sim.avatar.y + 230 &&
      Math.abs(xUnits - sim.avatar.x) < halfWidth;
    g.visible = !occludes;
  });
  return group;
}

/**
 * Portal gate framing the corridor doorway out of ENTRANCE — pylons +
 * light beam arching over the walkway ahead of the arriving player.
 * The area sign hangs inside the arch, so gate and wayfinding read as
 * one structure ("you are stepping deeper into the world").
 */
function EntranceGate({ sim }: { sim: LabSim }) {
  const group = useSouthOcclusion(sim, 880, 806);
  const x = u(880);
  const z = u(806);
  return (
    <group ref={group}>
      {[-1.9, 1.9].map((ox) => (
        <group key={ox} position={[x + ox, 0, z]}>
          <mesh material={MAT.resinWhite} position={[0, 1.6, 0]} castShadow>
            <boxGeometry args={[0.26, 3.2, 0.26]} />
          </mesh>
          <mesh material={MAT.neonMagenta} position={[0.14, 1.6, 0.1]}>
            <boxGeometry args={[0.02, 3.0, 0.06]} />
          </mesh>
          <mesh material={MAT.neonCyan} position={[-0.14, 1.6, 0.1]}>
            <boxGeometry args={[0.02, 3.0, 0.06]} />
          </mesh>
        </group>
      ))}
      <mesh material={MAT.charcoal} position={[x, 3.32, z]} castShadow>
        <boxGeometry args={[4.4, 0.24, 0.34]} />
      </mesh>
      <mesh material={MAT.neonCyan} position={[x, 3.17, z]}>
        <boxGeometry args={[4.3, 0.02, 0.3]} />
      </mesh>
    </group>
  );
}

/** Concentric light rings just inside the gate — the spawn pad. */
function SpawnPad() {
  const x = u(788);
  const z = u(1146);
  return (
    <group position={[x, 0, z]}>
      <mesh material={MAT.holo} rotation-x={-Math.PI / 2} position={[0, 0.024, 0]}>
        <circleGeometry args={[0.85, 32]} />
      </mesh>
      <mesh material={MAT.neonCyan} rotation-x={-Math.PI / 2} position={[0, 0.028, 0]}>
        <ringGeometry args={[0.82, 0.88, 32]} />
      </mesh>
      <mesh material={MAT.neonMagenta} rotation-x={-Math.PI / 2} position={[0, 0.026, 0]}>
        <ringGeometry args={[0.55, 0.585, 32]} />
      </mesh>
    </group>
  );
}

/** Rotating holo monument — the lobby's symbolic centerpiece. It sits
 * on the map's plant rect at (1028,950), so it inherits real collision
 * from the 2D map instead of being walk-through scenery. */
function HoloMonument({ sim }: { sim: LabSim }) {
  const group = useSouthOcclusion(sim, 1041, 963, 200);
  const rings = useRef<THREE.Group>(null);
  useFrame(() => {
    const r = rings.current;
    if (!r) return;
    const t = performance.now() / 1000;
    r.rotation.y = t * 0.5;
    r.children[1].rotation.x = Math.PI / 2 + Math.sin(t * 0.6) * 0.35;
  });
  const x = u(1041);
  const z = u(963);
  return (
    <group ref={group}>
      <group position={[x, 0, z]}>
        <mesh material={MAT.matteSilver} position={[0, 0.09, 0]} castShadow>
          <cylinderGeometry args={[0.5, 0.62, 0.18, 20]} />
        </mesh>
        <mesh material={MAT.neonCyan} position={[0, 0.19, 0]}>
          <cylinderGeometry args={[0.51, 0.51, 0.02, 20]} />
        </mesh>
        <group ref={rings} position={[0, 1.45, 0]}>
          <mesh material={MAT.holo} rotation-x={Math.PI / 2}>
            <torusGeometry args={[0.62, 0.035, 8, 40]} />
          </mesh>
          <mesh material={MAT.holoPurple} rotation-x={Math.PI / 2}>
            <torusGeometry args={[0.45, 0.028, 8, 36]} />
          </mesh>
          <mesh material={MAT.orbCyan}>
            <sphereGeometry args={[0.2, 14, 12]} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

/** Floating brand letters above reception, Harajuku-rooftop style. */
function FloatingBrandSign() {
  const group = useRef<THREE.Group>(null);
  const tex = useMemo(
    () =>
      makeTextTexture(
        [{ text: "A N Y W A R E", size: 110, color: "#ffffff", weight: 800 }],
        { width: 1024, height: 160, tracking: 4 },
      ),
    [],
  );
  const mat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    [tex],
  );
  useFrame(() => {
    const g = group.current;
    if (!g) return;
    g.position.y = 4.25 + Math.sin(performance.now() / 1400) * 0.08;
  });
  return (
    <group ref={group} position={[u(788), 4.25, u(950)]}>
      <mesh material={mat}>
        <planeGeometry args={[5.2, 0.8]} />
      </mesh>
      <mesh material={MAT.neonMagenta} position={[0, -0.52, 0]}>
        <boxGeometry args={[4.4, 0.025, 0.025]} />
      </mesh>
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
  const group = useSouthOcclusion(sim, cxUnits, cyUnits, 400);
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
  const mat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, side: THREE.DoubleSide }),
    [tex],
  );
  return (
    <group ref={group}>
      <group position={[u(cxUnits), 3.45, u(cyUnits)]}>
        <mesh material={mat}>
          <planeGeometry args={[2.6, 0.98]} />
        </mesh>
        <mesh material={MAT.neonCyan} position={[0, -0.56, 0]}>
          <boxGeometry args={[2.6, 0.02, 0.02]} />
        </mesh>
        <mesh material={MAT.matteSilver} position={[0, -1.0, 0]}>
          <boxGeometry args={[0.05, 0.85, 0.05]} />
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
  const c = rectTo3D(counter.rect);
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
      <Reception cx={c.cx} cz={c.cz} w={c.w} d={c.d} />
      {[c.cx - 1.1, c.cx + 1.1].map((px) => (
        <Pendant key={px} position={[px, 2.4, c.cz]} />
      ))}
      {/* digital brand wall on the west face — always in view while
          walking in, never between the south camera and the avatar */}
      <TextPanel
        position={[u(b.x) + 0.55, 1.5, u(990)]}
        rotationY={Math.PI / 2}
        width={4.4}
        height={2.1}
        texture={brandTex}
        glow
      />
      {/* approach lane: light guides from the south door to reception */}
      {[-0.5, 0.5].map((ox) => (
        <mesh
          key={ox}
          material={MAT.neonCyan}
          position={[u(788) + ox, 0.022, u(1090)]}
        >
          <boxGeometry args={[0.045, 0.008, 4.2]} />
        </mesh>
      ))}
      <mesh material={MAT.holo} rotation-x={-Math.PI / 2} position={[u(788), 0.026, u(1008)]}>
        <ringGeometry args={[0.5, 0.72, 32]} />
      </mesh>
      {/* waiting corner against the east wall */}
      <Rug position={[east - 1.2, 0.02, u(1060)]} radius={1.5} />
      <Sofa
        position={[east - 0.55, 0, u(1060)]}
        rotationY={-Math.PI / 2}
        width={2.2}
        mat={MAT.fabricGreen}
      />
      <CoffeeTable position={[east - 1.9, 0, u(1060)]} />
      <PlantTall position={[east - 0.5, 0, u(980)]} scale={0.85} />
      {/* map plants (collision-linked) — the (1028,950) rect hosts the
          holo monument instead of a tree */}
      {FURNITURE.filter(
        (f) => f.kind === "plant" && f.rect.y > 1000 && f.rect.x > 1000,
      ).map((f, i) => {
        const p = rectTo3D(f.rect);
        return <PlantTall key={i} position={[p.cx, 0, p.cz]} />;
      })}
      {/* sign hangs inside the portal gate arch */}
      <AreaSign area="ENTRANCE" position={[u(880), 2.25, u(806)]} sim={sim} />
      <PlantSmall position={[c.cx - c.w / 2 - 0.5, 0, c.cz + 0.2]} />
      {/* metaverse gate layer: arrival gate, spawn pad, brand letters,
          rotating holo monument */}
      <EntranceGate sim={sim} />
      <SpawnPad />
      <FloatingBrandSign />
      <HoloMonument sim={sim} />
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
        return (
          <group key={i}>
            <DeskBank cx={p.cx} cz={p.cz} w={p.w} d={p.d} chairSide={i === 0 ? 1 : -1} />
            {/* holo project board hovering over the bank */}
            <mesh material={MAT.holo} position={[p.cx, 1.95, p.cz]}>
              <planeGeometry args={[p.w * 0.7, 0.5]} />
            </mesh>
            <mesh material={MAT.neonCyan} position={[p.cx, 2.22, p.cz]}>
              <boxGeometry args={[p.w * 0.7, 0.015, 0.015]} />
            </mesh>
          </group>
        );
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
      <Rug position={[u(255), 0.02, u(210)]} radius={1.2} />
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
          { text: "AnyWare OFFICE", size: 72, color: "#e8f4fc", weight: 700 },
          { text: "Weekly Sync — MEETING ROOM A", size: 36, color: "#8fc6e8", weight: 500 },
        ],
        { width: 1024, height: 512, background: "#0d1524", backgroundTo: "#1d3450" },
      ),
    [],
  );
  const screenMat = useMemo(
    // Unlit: the display's authored colors are the emitted light.
    () => new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false }),
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
            {/* halo ring floating over each pod — the purple accent
                marks the meeting zone's shifted atmosphere */}
            <mesh
              material={MAT.holoPurple}
              rotation-x={Math.PI / 2}
              position={[p.cx, 2.45, p.cz]}
            >
              <torusGeometry args={[Math.min(p.w, p.d) * 0.42, 0.03, 8, 36]} />
            </mesh>
          </group>
        );
      })}
      {/* large display on the solid north wall — a glowing digital
          presence wall rather than a mounted TV */}
      <group position={[u(b.x + b.w / 2), 1.55, u(b.y) + 0.45]}>
        <mesh material={MAT.matteSilver} position={[0, 0, -0.03]} castShadow>
          <boxGeometry args={[3.56, 2.0, 0.06]} />
        </mesh>
        <mesh material={screenMat}>
          <planeGeometry args={[3.3, 1.78]} />
        </mesh>
        <mesh material={MAT.neonCyan} position={[0, -1.03, 0.01]}>
          <boxGeometry args={[3.56, 0.02, 0.02]} />
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
      <SkyDome />
      <MetaCity />
      <Exterior />
      <FloatingOrbs />
      <Floors />
      <Walls sim={sim} />
      <MassingFurniture />
      <RooftopBillboards sim={sim} />
      <EntranceArea sim={sim} />
      <StaffArea sim={sim} />
      <MeetingArea sim={sim} />
    </group>
  );
}

export const World = memo(WorldImpl);
