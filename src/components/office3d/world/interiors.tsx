"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  Armchair,
  Box,
  CeilingLayers,
  Cove,
  Desk,
  FloorInlay,
  GlassWall,
  GreenBed,
  HoloPane,
  LightBar,
  LowTable,
  Plate,
  Planter,
  Rug,
  Slats,
  Sofa,
  TaskChair,
  WallScreen,
} from "./kit";
import { fillGradient, label, LUX, makeInfoPane, makeScreen, makeSignage } from "./lux";

/**
 * LUXURY METAVERSE PASS — the five interiors.
 *
 * Each room is composed the same way, in this order, because that is
 * what the brief asks luxury to be made of (§3):
 *
 *   1. architecture   ceiling layers, a lit reveal, an inset floor
 *   2. a landmark     one object the room is built around
 *   3. material       a small palette, used with intent
 *   4. light          base + accent + hidden indirect + edge
 *   5. information    signage and panes that belong to the building
 *   6. people         seating and tables that stay human-sized
 *
 * Authored in LOCAL METRES: origin at the room centre, +Z out of the
 * entrance, so each interior reads identically wherever its building
 * sits on the campus ring.
 */

const M = 0.075;

/* ── shared surfaces ─────────────────────────────────────────────── */

function useBrandWall() {
  return useMemo(
    () =>
      makeScreen((ctx, w, h) => {
        fillGradient(ctx, w, h, "#f7f8f9", "#e4e9ee");
        ctx.fillStyle = "#cdd8e2";
        ctx.fillRect(0, h * 0.72, w, 2);
        label(ctx, "AnyWare", 70, h * 0.28, 132, "#1b232b", 700, 4);
        label(ctx, "WORLD HEADQUARTERS", 76, h * 0.53, 34, "#5f7181", 600, 12);
        label(ctx, "世の中をアップデートする。", 76, h * 0.79, 40, "#7c8b98", 500, 4);
      }, 1024, 512),
    [],
  );
}

/** A slow, quiet rotation — the only motion most rooms get (§9). */
function useSpin(ref: React.RefObject<THREE.Object3D | null>, speed: number) {
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += Math.min(dt, 0.2) * speed;
  });
}

/* ── ENTRANCE — WORLD ARRIVAL HUB ────────────────────────────────── */

function DataCore() {
  const rings = useRef<THREE.Group>(null);
  const nodes = useRef<THREE.Group>(null);
  useSpin(rings, 0.16);
  useSpin(nodes, -0.09);
  const pane = useMemo(
    () =>
      makeInfoPane(
        "ANYWARE WORLD",
        [
          ["DISTRICTS", "10"],
          ["CAMPUS", "224 m"],
          ["STATUS", "LIVE"],
        ],
        "#7fd3f0",
      ),
    [],
  );
  return (
    <group position={[0, 0, -2.2]}>
      {/* stepped plinth — the object is given a base, not dropped on the floor */}
      <mesh material={LUX.stone} position={[0, 0.16, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[6.4, 6.8, 0.32, 40]} />
      </mesh>
      <mesh material={LUX.pearl} position={[0, 0.46, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[4.6, 4.9, 0.28, 36]} />
      </mesh>
      <Cove w={9.6} d={9.6} y={0.62} t={0.16} r={4.8} mat={LUX.edge} faceDown={false} />
      {/* luminous core */}
      <mesh material={LUX.core} position={[0, 3.9, 0]}>
        <cylinderGeometry args={[0.5, 0.72, 6.6, 20]} />
      </mesh>
      <mesh material={LUX.holoSoft} position={[0, 3.9, 0]}>
        <cylinderGeometry args={[1.15, 1.5, 6.8, 20]} />
      </mesh>
      {/* pearl rings — architecture around the light, not more light */}
      <group ref={rings} position={[0, 3.7, 0]}>
        {[
          [3.3, 0.34, 0.9],
          [2.5, -0.22, 1.5],
          [4.0, 0.1, -0.5],
        ].map(([r, tilt, y], i) => (
          <mesh key={i} material={LUX.pearl} position={[0, y, 0]} rotation={[Math.PI / 2 + tilt, 0, 0]} castShadow>
            <torusGeometry args={[r, 0.11, 8, 40]} />
          </mesh>
        ))}
      </group>
      {/* five business nodes in orbit */}
      <group ref={nodes} position={[0, 2.6, 0]}>
        {[0, 1, 2, 3, 4].map((i) => {
          const a = (i / 5) * Math.PI * 2;
          return (
            <group key={i} position={[Math.cos(a) * 5.2, Math.sin(i * 1.7) * 0.7, Math.sin(a) * 5.2]}>
              <mesh material={LUX.holo}>
                <octahedronGeometry args={[0.3]} />
              </mesh>
              <mesh material={LUX.holoSoft}>
                <sphereGeometry args={[0.55, 10, 8]} />
              </mesh>
            </group>
          );
        })}
      </group>
      <mesh material={LUX.core} position={[0, 7.6, 0]}>
        <sphereGeometry args={[0.55, 14, 12]} />
      </mesh>
      <HoloPane w={2.8} h={1.9} x={6.6} y={2.2} z={3.4} rotY={-0.62} mat={pane} />
    </group>
  );
}

function EntranceInterior({ hw, hd }: { hw: number; hd: number }) {
  const brand = useBrandWall();
  const identity = useMemo(
    () => makeSignage("RECEPTION", "GUEST / DELIVERY / TOUR", "#7fd3f0"),
    [],
  );
  const welcome = useMemo(
    () => makeSignage("ANYWARE HQ", "WORLD ARRIVAL HUB", "#7fd3f0", { dark: true }),
    [],
  );
  const counter = useMemo(
    () => new THREE.CylinderGeometry(2.6, 2.7, 1.06, 28, 1, true, Math.PI * 0.15, Math.PI * 0.7),
    [],
  );
  return (
    <group>
      {/* floor: polished stone field, deep inlay under the core, lit axis */}
      <Plate w={hw * 2 - 2.6} d={hd * 2 - 2.6} y={0.032} r={2.2} mat={LUX.stone} />
      <FloorInlay w={15.5} d={15.5} z={-2.2} r={7.7} mat={LUX.stoneDark} />
      <Plate w={3.2} d={hd - 1} y={0.05} z={hd / 2 + 1.6} r={0.3} mat={LUX.pearlDeep} />
      <Cove w={3.5} d={hd - 0.7} y={0.052} z={hd / 2 + 1.6} t={0.1} r={0.3} mat={LUX.edge} faceDown={false} />

      {/* ceiling: two floating layers, a lit reveal, an oculus over the core */}
      <CeilingLayers w={hw * 2 - 2.2} d={hd * 2 - 2.2} base={5.0} lift={1.05} inset={3.0} />
      <Cove w={13.0} d={13.0} y={5.12} z={-2.2} t={0.5} r={6.5} mat={LUX.coveSoft} />
      <mesh material={LUX.holoSoft} position={[0, 5.16, -2.2]} rotation-x={Math.PI / 2}>
        <ringGeometry args={[5.4, 6.2, 40]} />
      </mesh>

      <DataCore />

      {/* reception: a curved brushed counter with a floating identity */}
      <group position={[-hw + 5.2, 0, hd - 8.0]} rotation-y={0.5}>
        <mesh geometry={counter} material={LUX.pearl} position={[0, 0.53, 0]} castShadow receiveShadow />
        <mesh material={LUX.silver} position={[0, 1.08, 0]}>
          <cylinderGeometry args={[2.72, 2.72, 0.06, 28, 1, true, Math.PI * 0.15, Math.PI * 0.7]} />
        </mesh>
        <mesh material={LUX.cove} position={[0, 0.1, 0]}>
          <cylinderGeometry args={[2.66, 2.66, 0.05, 28, 1, true, Math.PI * 0.15, Math.PI * 0.7]} />
        </mesh>
        <HoloPane w={3.6} h={0.9} y={2.55} z={-0.4} rotY={Math.PI} mat={identity} />
      </group>

      {/* premium waiting lounge */}
      <group position={[hw - 6.4, 0, hd - 8.6]}>
        <Rug w={6.4} d={5.0} />
        <Sofa w={2.6} z={-1.9} mat={LUX.fabricWarm} />
        <Armchair x={-2.1} z={0.9} rotY={0.9} />
        <Armchair x={2.1} z={0.9} rotY={-0.9} />
        <LowTable w={1.5} d={0.9} />
        <Planter x={3.0} z={-2.2} />
        <LightBar w={4.2} y={4.2} />
      </group>

      {/* smart-glass brand wall */}
      <group position={[-hw + 1.35, 0, -3.0]} rotation-y={Math.PI / 2}>
        <GlassWall w={13.5} h={4.4} mat={LUX.smartGlass} />
        <mesh material={brand} position={[0, 2.5, 0.06]}>
          <planeGeometry args={[10.5, 3.1]} />
        </mesh>
      </group>

      {/* landscape islands framing the arrival axis */}
      <GreenBed w={5.4} d={1.5} x={-5.6} z={hd - 4.4} />
      <GreenBed w={5.4} d={1.5} x={5.6} z={hd - 4.4} />
      <Planter x={-hw + 3.4} z={-hd + 4.0} scale={1.15} />
      <Planter x={hw - 3.4} z={-hd + 4.0} scale={1.15} />

      {/* the place says its own name, held in the air over the threshold */}
      <HoloPane w={6.2} h={1.55} y={4.0} z={hd - 2.0} rotY={Math.PI} mat={welcome} />
    </group>
  );
}

/* ── STAFF — CREATIVE WORK CAMPUS ────────────────────────────────── */

function CollaborationIsland() {
  const holo = useRef<THREE.Group>(null);
  useSpin(holo, 0.12);
  const pane = useMemo(
    () =>
      makeInfoPane(
        "TEAM BOARD",
        [
          ["IN PROGRESS", "12"],
          ["REVIEW", "4"],
          ["SHIPPED / WK", "9"],
        ],
        "#8fe3c2",
      ),
    [],
  );
  return (
    <group position={[0, 0, -1.4]}>
      {/* the island is given its own room-within-a-room overhead */}
      <mesh material={LUX.pearlDeep} position={[0, 3.35, 0]} rotation-x={-Math.PI / 2} castShadow>
        <torusGeometry args={[3.5, 0.2, 10, 44]} />
      </mesh>
      <mesh material={LUX.pearl} position={[0, 3.0, 0]} rotation-x={-Math.PI / 2} castShadow>
        <torusGeometry args={[2.9, 0.13, 8, 40]} />
      </mesh>
      <Plate w={7.6} d={7.6} y={3.6} r={3.8} mat={LUX.pearl} faceDown />
      <mesh material={LUX.cove} position={[0, 3.3, 0]} rotation-x={Math.PI / 2}>
        <ringGeometry args={[3.2, 3.42, 40]} />
      </mesh>
      <FloorInlay w={8.2} d={8.2} r={4.1} mat={LUX.rug} />
      {/* oval table */}
      <mesh material={LUX.wood} position={[0, 0.73, 0]} scale={[1.5, 1, 1]} castShadow receiveShadow>
        <cylinderGeometry args={[1.5, 1.5, 0.08, 32]} />
      </mesh>
      <mesh material={LUX.silver} position={[0, 0.36, 0]} scale={[1.3, 1, 1]}>
        <cylinderGeometry args={[0.6, 0.75, 0.72, 16]} />
      </mesh>
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const a = (i / 6) * Math.PI * 2;
        return (
          <TaskChair
            key={i}
            x={Math.cos(a) * 2.9}
            z={Math.sin(a) * 2.1}
            rotY={-a + Math.PI / 2}
            mat={i % 2 ? LUX.fabricSage : LUX.fabric}
          />
        );
      })}
      <group position={[0, 2.4, 0]}>
        <HoloPane w={2.6} h={1.75} y={0} z={0.02} mat={pane} />
        <group ref={holo}>
          <mesh material={LUX.holo} rotation-x={-Math.PI / 2}>
            <torusGeometry args={[2.0, 0.025, 6, 36]} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

function StaffInterior({ hw, hd }: { hw: number; hd: number }) {
  const live = useMemo(
    () =>
      makeScreen((ctx, w, h) => {
        fillGradient(ctx, w, h, "#16222c", "#0f1820");
        label(ctx, "STAFF", 54, 46, 58, "#e9f6ff", 700, 8);
        label(ctx, "MEMBERS / PROFILE", 56, 122, 26, "#7fa3ba", 500, 8);
        const bars = [0.5, 0.78, 0.42, 0.9, 0.64, 0.72, 0.36];
        bars.forEach((v, i) => {
          const x = 60 + i * 78;
          ctx.fillStyle = i % 2 ? "#4fc0a0" : "#3f9fd0";
          ctx.fillRect(x, h - 90 - v * 250, 46, v * 250);
        });
        ctx.fillStyle = "rgba(255,255,255,0.08)";
        ctx.fillRect(56, h - 88, w - 112, 1);
      }, 768, 512),
    [],
  );
  const podScreen = useMemo(
    () =>
      makeScreen((ctx, w, h) => {
        fillGradient(ctx, w, h, "#101a22", "#0b1219");
        ctx.fillStyle = "#2f4a5c";
        for (let i = 0; i < 9; i++) ctx.fillRect(40, 60 + i * 46, (w - 80) * (0.3 + ((i * 37) % 60) / 100), 12);
      }, 512, 288),
    [],
  );
  return (
    <group>
      {/* warm floor field with carpet zones */}
      <Plate w={hw * 2 - 2.6} d={hd * 2 - 2.6} y={0.032} r={1.6} mat={LUX.wood} />
      <CeilingLayers w={hw * 2 - 2.2} d={hd * 2 - 2.2} base={4.2} lift={0.8} inset={2.6} />

      <CollaborationIsland />

      {/* focus pods: frosted glass, brushed frame, one desk each */}
      {[-1, 0, 1].map((i) => (
        <group key={i} position={[-hw + 3.4, 0, i * 4.2 + 3.4]}>
          <GlassWall w={3.4} h={2.6} z={1.7} mat={LUX.frosted} />
          <GlassWall w={3.4} h={2.6} z={-1.7} mat={LUX.frosted} />
          <GlassWall w={3.4} h={2.6} x={1.7} rotY={Math.PI / 2} mat={LUX.frosted} />
          <Plate w={3.6} d={3.6} y={2.72} r={0.3} mat={LUX.pearl} faceDown />
          <Cove w={3.2} d={3.2} y={2.6} t={0.12} r={0.3} />
          <Desk w={1.9} d={0.8} z={-0.9} screen={podScreen} />
          <TaskChair z={0.4} rotY={Math.PI} />
        </group>
      ))}

      {/* personal workstations under a slatted soffit, live wall behind */}
      <group position={[hw - 4.6, 0, 0]} rotation-y={-Math.PI / 2}>
        {[-1, 0, 1].map((i) => (
          <group key={i} position={[i * 3.4, 0, 0]}>
            <Desk w={2.2} d={0.85} screen={podScreen} />
            <TaskChair z={1.0} rotY={Math.PI} />
          </group>
        ))}
        <Slats count={13} span={11.5} len={3.2} y={3.5} />
        <LightBar w={11.0} y={3.9} />
      </group>
      <WallScreen w={5.6} h={3.0} x={hw - 1.3} y={2.7} rotY={-Math.PI / 2} mat={live} />

      {/* soft seating by the entrance — the room greets you */}
      <group position={[hw - 7.2, 0, hd - 6.0]}>
        <Rug w={5.2} d={4.2} />
        <Sofa w={2.4} z={-1.6} mat={LUX.fabricSage} />
        <Armchair x={-1.9} z={0.9} rotY={0.8} />
        <LowTable w={1.2} d={0.8} />
        <Planter x={2.4} z={-1.6} />
      </group>

      {/* greenery integrated into circulation, not decoration on the side */}
      <GreenBed w={7.0} d={1.3} z={hd - 3.2} x={-2.0} />
      <Planter x={-hw + 3.0} z={-hd + 3.4} scale={1.2} />
      <Planter x={2.6} z={-hd + 3.0} scale={1.05} />
    </group>
  );
}

/* ── MEETING — GLASS CONFERENCE PAVILION ─────────────────────────── */

function ConferenceRoom() {
  const sweep = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (sweep.current) {
      const t = (state.clock.elapsedTime * 0.25) % 1;
      sweep.current.position.x = -3.2 + t * 6.4;
    }
  });
  const deck = useMemo(
    () =>
      makeScreen((ctx, w, h) => {
        fillGradient(ctx, w, h, "#f6f8fa", "#e6ebf0");
        ctx.fillStyle = "#8e6cc0";
        ctx.fillRect(64, 64, 6, 96);
        label(ctx, "FY26 STRATEGY", 92, 62, 62, "#1e2732", 700, 5);
        label(ctx, "ANYWARE GROUP · CONFIDENTIAL", 92, 138, 24, "#7c8b98", 500, 6);
        const pts = [0.35, 0.5, 0.44, 0.62, 0.7, 0.85];
        ctx.strokeStyle = "#8e6cc0";
        ctx.lineWidth = 6;
        ctx.beginPath();
        pts.forEach((v, i) => {
          const x = 100 + (i * (w - 200)) / (pts.length - 1);
          const y = h - 90 - v * (h * 0.45);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
      }, 1024, 576),
    [],
  );
  return (
    <group position={[0, 0, -6.4]}>
      <FloorInlay w={12.4} d={8.4} r={0.6} mat={LUX.rug} />
      <GlassWall w={12.4} h={3.2} z={4.2} />
      <GlassWall w={8.4} h={3.2} x={-6.2} rotY={Math.PI / 2} />
      <GlassWall w={8.4} h={3.2} x={6.2} rotY={Math.PI / 2} />
      <Plate w={12.8} d={8.8} y={3.34} r={0.6} mat={LUX.pearl} faceDown />
      <Cove w={11.4} d={7.4} y={3.2} t={0.16} r={0.5} />
      {/* the table: one continuous surface, not a cluster of boxes */}
      <mesh material={LUX.pearl} position={[0, 0.74, 0]} castShadow receiveShadow>
        <boxGeometry args={[6.4, 0.09, 1.9]} />
      </mesh>
      {[-1, 1].map((s) => (
        <Box key={s} w={0.5} h={0.72} d={1.4} x={s * 2.4} y={0} mat={LUX.silver} shadow={false} />
      ))}
      <mesh material={LUX.holoSoft} position={[0, 0.8, 0]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[5.4, 0.9]} />
      </mesh>
      {[-1, 1].map((side) =>
        [-2, -1, 0, 1, 2].map((i) => (
          <TaskChair
            key={`${side}${i}`}
            x={i * 1.28}
            z={side * 1.55}
            rotY={side > 0 ? Math.PI : 0}
            mat={LUX.fabric}
          />
        )),
      )}
      <WallScreen w={6.0} h={3.1} y={2.2} z={-4.1} mat={deck} />
      <mesh ref={sweep} material={LUX.holo} position={[0, 3.05, -4.0]}>
        <boxGeometry args={[0.9, 0.03, 0.03]} />
      </mesh>
      <LightBar w={6.6} y={3.05} />
    </group>
  );
}

function MeetingInterior({ hw, hd }: { hw: number; hd: number }) {
  const room = useMemo(() => makeSignage("MEETING", "GLASS CONFERENCE PAVILION", "#8e6cc0"), []);
  const board = useMemo(
    () =>
      makeInfoPane(
        "ROOM STATUS",
        [
          ["MAIN HALL", "IN USE"],
          ["POD A", "FREE"],
          ["POD B", "14:30"],
        ],
        "#b79bf0",
      ),
    [],
  );
  return (
    <group>
      <Plate w={hw * 2 - 2.6} d={hd * 2 - 2.6} y={0.032} r={1.6} mat={LUX.stone} />
      <CeilingLayers w={hw * 2 - 2.2} d={hd * 2 - 2.2} base={4.6} lift={0.9} inset={2.8} />
      {/* daylight oculus over the waiting zone */}
      <Cove w={9.0} d={7.0} y={4.72} z={hd - 7.2} t={0.42} r={3.0} mat={LUX.coveSoft} />

      <ConferenceRoom />

      {/* two side pods, glazed so the pavilion stays transparent */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * (hw - 4.2), 0, 1.4]}>
          <FloorInlay w={4.6} d={4.6} r={0.4} mat={LUX.rug} edge={false} />
          <GlassWall w={4.6} h={2.9} z={2.3} />
          <GlassWall w={4.6} h={2.9} z={-2.3} />
          <GlassWall w={4.6} h={2.9} x={s * 2.3} rotY={Math.PI / 2} />
          <Plate w={4.8} d={4.8} y={3.02} r={0.4} mat={LUX.pearl} faceDown />
          <Cove w={4.2} d={4.2} y={2.9} t={0.13} r={0.4} />
          <mesh material={LUX.wood} position={[0, 0.73, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.85, 0.85, 0.08, 24]} />
          </mesh>
          <mesh material={LUX.silver} position={[0, 0.36, 0]}>
            <cylinderGeometry args={[0.16, 0.3, 0.72, 12]} />
          </mesh>
          {[0, 1, 2, 3].map((i) => {
            const a = (i / 4) * Math.PI * 2 + 0.7;
            return <TaskChair key={i} x={Math.cos(a) * 1.4} z={Math.sin(a) * 1.4} rotY={-a + Math.PI / 2} />;
          })}
        </group>
      ))}

      {/* standing niche — quick decisions, no chairs */}
      <group position={[-hw + 4.4, 0, hd - 5.4]}>
        <mesh material={LUX.wood} position={[0, 1.06, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.2, 0.07, 0.9]} />
        </mesh>
        <Box w={0.4} h={1.03} d={0.6} mat={LUX.silver} shadow={false} />
        <HoloPane w={1.9} h={1.25} y={2.5} mat={board} />
      </group>

      {/* waiting zone under the oculus */}
      <group position={[hw - 5.6, 0, hd - 6.4]}>
        <Rug w={5.0} d={4.2} />
        <Sofa w={2.4} z={-1.5} />
        <Armchair x={-1.9} z={0.8} rotY={0.9} />
        <LowTable w={1.2} d={0.8} />
        <Planter x={2.5} z={-1.6} scale={1.1} />
      </group>

      <HoloPane w={5.4} h={1.35} y={3.7} z={hd - 2.0} rotY={Math.PI} mat={room} />
      <GreenBed w={5.6} d={1.2} x={-1.0} z={hd - 3.0} />
    </group>
  );
}

/* ── SIGNAL — CREATIVE MEDIA LAB ─────────────────────────────────── */

function MediaWall({ hd }: { hd: number }) {
  const pulse = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (pulse.current) {
      const m = pulse.current.material as THREE.MeshBasicMaterial;
      m.opacity = 0.18 + Math.sin(state.clock.elapsedTime * 1.1) * 0.1;
    }
  });
  const campaign = useMemo(
    () =>
      makeScreen((ctx, w, h) => {
        fillGradient(ctx, w, h, "#2a1240", "#7b2a8f");
        ctx.fillStyle = "rgba(255,255,255,0.10)";
        for (let i = 0; i < 7; i++) ctx.fillRect(0, (i * h) / 7, w, 2);
        label(ctx, "SIGNAL", 70, h * 0.22, 150, "#ffe9fb", 800, 14);
        label(ctx, "MARKETING / SNS / ADS / RECRUITING / WEB", 76, h * 0.56, 32, "#f0c6ea", 600, 8);
        label(ctx, "CAMPAIGN 2026 — REACH 1.2M", 76, h * 0.72, 40, "#ffffff", 600, 3);
      }, 1024, 576),
    [],
  );
  const feed = useMemo(
    () =>
      makeScreen((ctx, w, h) => {
        fillGradient(ctx, w, h, "#1a1430", "#3a1c52");
        ctx.fillStyle = "rgba(255,255,255,0.06)";
        for (let i = 0; i < 4; i++) ctx.fillRect(60, 70 + i * 130, w - 120, 96);
        label(ctx, "NOW PLAYING", 62, 24, 30, "#f0c6ea", 600, 8);
        ["BRAND FILM  ／  02:14", "RECRUIT LP  ／  A/B  62%", "SNS REEL  ／  SCHEDULED", "PRESS KIT  ／  DRAFT"].forEach(
          (t, i) => label(ctx, t, 84, 98 + i * 130, 38, "#ffe9fb", 600, 2),
        );
      }, 1024, 576),
    [],
  );
  const analytics = useMemo(
    () =>
      makeInfoPane(
        "LIVE ANALYTICS",
        [
          ["IMPRESSIONS", "1.24 M"],
          ["ENGAGE", "8.7 %"],
          ["APPLICANTS", "312"],
        ],
        "#f08ad8",
      ),
    [],
  );
  return (
    <group position={[0, 0, -hd + 2.6]}>
      {/* two panels set at a shallow angle: a wall you stand in front of */}
      {[
        [-1, campaign, 6.3],
        [1, feed, 6.3],
      ].map(([s, mat, pw], i) => (
        <group key={i} position={[(s as number) * 3.25, 0, 0.28]} rotation-y={-(s as number) * 0.11}>
          <Box w={6.5} h={4.5} d={0.2} y={1.45} mat={LUX.graphite} shadow={false} />
          <mesh material={mat as THREE.Material} position={[0, 3.7, 0.12]}>
            <planeGeometry args={[pw as number, 3.54]} />
          </mesh>
        </group>
      ))}
      <mesh ref={pulse} material={LUX.holoSoft} position={[0, 3.7, 0.6]}>
        <planeGeometry args={[13.6, 4.4]} />
      </mesh>
      <Cove w={14.4} d={2.4} y={5.6} t={0.3} r={0.4} />
      {/* viewing step + bench: the room invites you to stop here */}
      <Box w={13.0} h={0.22} d={2.4} z={2.4} mat={LUX.stoneDark} />
      <Box w={9.0} h={0.44} d={0.9} y={0.22} z={2.8} mat={LUX.wood} />
      <Cove w={13.4} d={2.8} y={0.24} t={0.1} r={0.2} mat={LUX.edge} faceDown={false} />
      <HoloPane w={2.6} h={1.75} y={2.3} x={8.4} z={4.6} rotY={-0.66} mat={analytics} />
    </group>
  );
}

function SignalInterior({ hw, hd }: { hw: number; hd: number }) {
  const monitor = useMemo(
    () =>
      makeScreen((ctx, w, h) => {
        fillGradient(ctx, w, h, "#1a1030", "#0d0a1a");
        ctx.fillStyle = "#c56bd8";
        ctx.fillRect(30, 34, 4, 40);
        label(ctx, "EDIT", 48, 32, 34, "#f2d8f8", 600, 4);
        for (let i = 0; i < 5; i++) {
          ctx.fillStyle = i % 2 ? "#3d2a5c" : "#54306e";
          ctx.fillRect(30, 100 + i * 34, (w - 60) * (0.35 + ((i * 53) % 60) / 100), 20);
        }
      }, 512, 288),
    [],
  );
  const board = useMemo(
    () =>
      makeScreen((ctx, w, h) => {
        fillGradient(ctx, w, h, "#f7f4fa", "#e9e2f2");
        for (let i = 0; i < 8; i++) {
          const x = 40 + (i % 4) * 250;
          const y = 60 + Math.floor(i / 4) * 250;
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(x, y, 210, 190);
          ctx.fillStyle = ["#f26bd8", "#a88cff", "#59b8ff", "#ffd166"][i % 4];
          ctx.fillRect(x, y, 210, 10);
          ctx.fillStyle = "#cfc6dc";
          for (let k = 0; k < 4; k++) ctx.fillRect(x + 18, y + 44 + k * 30, 210 - 70 - k * 22, 9);
        }
      }, 1024, 576),
    [],
  );
  return (
    <group>
      <Plate w={hw * 2 - 2.6} d={hd * 2 - 2.6} y={0.032} r={1.6} mat={LUX.stoneDark} />
      <FloorInlay w={hw * 2 - 8.0} d={10.0} z={1.0} r={1.0} mat={LUX.stone} />
      <CeilingLayers w={hw * 2 - 2.2} d={hd * 2 - 2.2} base={5.0} lift={0.9} inset={2.6} mat={LUX.pearlDeep} />

      <MediaWall hd={hd} />

      {/* production stations facing the wall */}
      {[-1, 0, 1].map((i) => (
        <group key={i} position={[i * 4.0, 0, 2.0]}>
          <Desk w={2.4} d={0.9} screen={monitor} />
          <group position={[0, 0.77, -0.12]}>
            {[-1, 1].map((s) => (
              <group key={s} position={[s * 1.0, 0.5, 0.12]} rotation-y={-s * 0.42}>
                <mesh material={monitor}>
                  <planeGeometry args={[0.8, 0.45]} />
                </mesh>
                <Box w={0.85} h={0.5} d={0.03} y={-0.25} z={-0.02} mat={LUX.graphite} shadow={false} />
              </group>
            ))}
          </group>
          <TaskChair z={1.1} rotY={Math.PI} />
        </group>
      ))}
      <Slats count={15} span={12.6} len={2.2} y={4.72} z={3.4} rotY={Math.PI / 2} mat={LUX.pearl} />
      <LightBar w={11.0} y={4.55} z={3.4} />

      {/* storyboard architecture: a wall you read */}
      <group position={[hw - 1.4, 0, hd - 8.0]} rotation-y={-Math.PI / 2}>
        <Box w={9.0} h={4.0} d={0.2} y={0.9} mat={LUX.pearl} shadow={false} />
        <mesh material={board} position={[0, 2.75, 0.12]}>
          <planeGeometry args={[8.2, 2.6]} />
        </mesh>
        <Cove w={9.2} d={0.5} y={4.95} t={0.14} r={0.1} />
      </group>

      {/* a soft corner so the studio still feels like a place to be */}
      <group position={[-hw + 4.6, 0, hd - 6.0]}>
        <Rug w={4.4} d={3.6} />
        <Sofa w={2.2} z={-1.3} mat={LUX.fabricWarm} />
        <LowTable w={1.1} d={0.7} />
        <Planter x={2.0} z={-1.4} />
      </group>
      <GreenBed w={4.6} d={1.2} x={2.2} z={hd - 3.0} />
    </group>
  );
}

/* ── dispatch ────────────────────────────────────────────────────── */

export const LUXURY_AREAS = new Set(["ENTRANCE", "STAFF", "MEETING", "SIGNAL"]);

export function LuxuryInterior({
  id,
  w,
  d,
}: {
  id: string;
  /** footprint in canonical units */
  w: number;
  d: number;
}) {
  const hw = (w * M) / 2;
  const hd = (d * M) / 2;
  switch (id) {
    case "ENTRANCE":
      return <EntranceInterior hw={hw} hd={hd} />;
    case "STAFF":
      return <StaffInterior hw={hw} hd={hd} />;
    case "MEETING":
      return <MeetingInterior hw={hw} hd={hd} />;
    case "SIGNAL":
      return <SignalInterior hw={hw} hd={hd} />;
    default:
      return null;
  }
}
