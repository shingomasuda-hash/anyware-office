"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { LabSim } from "../LabSim";
import { AREA_BY_ID, AREAS, DOORWAYS } from "@/lib/game/map";
import type { AreaId } from "@/types/office";
import { MAT, makeTextTexture } from "./materials";
import { u } from "./scale";

// Area gateways: a holographic stele beside every room's doorway that
// says what the room is FOR. Walking in is no longer a guess — each
// door advertises its content, and the stele brightens while you are
// inside that area (the HUD prompt then offers the actual panel).

/** What a visitor can actually do inside each area — mirrors the
 * sections rendered by the matching AreaPanel. */
const AREA_ACTIONS: Record<AreaId, string> = {
  ENTRANCE: "お知らせ / MISSION・VISION",
  STAFF: "メンバー名簿・プロフィール",
  SIGNAL: "KPI・進行中の案件",
  PARTNER: "KPI・進行中の案件",
  TABLE: "店舗情報・メニュー",
  GREEN: "取引・ディール一覧",
  LOCAL: "地域プロジェクト",
  MEETING: "会議室・参加リンク",
  AI: "AI活用トピック",
  ADMIN: "管理者向け情報",
};

interface Gateway {
  area: AreaId;
  x: number;
  y: number;
  /** panel faces the corridor: 0 = faces +Z (south), PI = faces north */
  rotY: number;
}

/** Pick each area's doorway and park a stele just outside it. */
function buildGateways(): Gateway[] {
  const out: Gateway[] = [];
  for (const area of AREAS) {
    const b = area.bounds;
    const door = DOORWAYS.find((d) => {
      const cx = d.rect.x + d.rect.w / 2;
      const cy = d.rect.y + d.rect.h / 2;
      return (
        cx >= b.x - 4 &&
        cx <= b.x + b.w + 4 &&
        cy >= b.y - 4 &&
        cy <= b.y + b.h + 4
      );
    });
    if (!door) continue;
    const cx = door.rect.x + door.rect.w / 2;
    const cy = door.rect.y + door.rect.h / 2;
    const horizontal = door.rect.w >= door.rect.h;
    // Offset to the side of the opening (never blocking the walkway)
    // and a step outside the room, into the corridor.
    const roomBelow = cy < b.y + b.h / 2; // door on the room's north edge
    if (horizontal) {
      out.push({
        area: area.id,
        x: cx + door.rect.w / 2 + 34,
        y: cy + (roomBelow ? -30 : 30),
        rotY: roomBelow ? Math.PI : 0,
      });
    } else {
      const roomRight = cx < b.x + b.w / 2;
      out.push({
        area: area.id,
        x: cx + (roomRight ? -30 : 30),
        y: cy + door.rect.h / 2 + 34,
        rotY: roomRight ? -Math.PI / 2 : Math.PI / 2,
      });
    }
  }
  return out;
}

function GatewayStele({ gate, sim }: { gate: Gateway; sim: LabSim }) {
  const meta = AREA_BY_ID[gate.area];
  const tex = useMemo(
    () =>
      makeTextTexture(
        [
          { text: meta.label, size: 62, color: "#e8f6ff", weight: 800 },
          { text: AREA_ACTIONS[gate.area], size: 27, color: "#9fd0ee", weight: 600 },
        ],
        {
          width: 512,
          height: 200,
          background: "#0c1626",
          backgroundTo: "#183353",
          tracking: 3,
        },
      ),
    [meta.label, gate.area],
  );
  const panelMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        opacity: 0.82,
        toneMapped: false,
      }),
    [tex],
  );
  const accentMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: meta.accent, toneMapped: false }),
    [meta.accent],
  );
  const inside = useRef(false);
  useFrame(() => {
    // brighten while the player stands in this area (ambient feedback)
    const here = sim.getSnapshot().area === gate.area;
    if (here !== inside.current) inside.current = here;
    const target = here ? 1 : 0.78;
    panelMat.opacity += (target - panelMat.opacity) * 0.08;
  });
  return (
    <group position={[u(gate.x), 0, u(gate.y)]} rotation-y={gate.rotY}>
      {/* slim stele post */}
      <mesh material={MAT.pearl} position={[0, 0.62, 0]} castShadow>
        <boxGeometry args={[0.1, 1.24, 0.1]} />
      </mesh>
      {/* holo info panel */}
      <mesh material={panelMat} position={[0, 1.5, 0.02]}>
        <planeGeometry args={[1.5, 0.59]} />
      </mesh>
      {/* area-colored underline: the room's identity color */}
      <mesh material={accentMat} position={[0, 1.19, 0.03]}>
        <boxGeometry args={[1.5, 0.022, 0.022]} />
      </mesh>
      {/* floor halo in the same accent */}
      <mesh material={accentMat} rotation-x={-Math.PI / 2} position={[0, 0.024, 0]}>
        <ringGeometry args={[0.3, 0.34, 24]} />
      </mesh>
    </group>
  );
}

export function AreaGateways({ sim }: { sim: LabSim }) {
  const gates = useMemo(buildGateways, []);
  return (
    <group>
      {gates.map((g) => (
        <GatewayStele key={g.area} gate={g} sim={sim} />
      ))}
    </group>
  );
}
