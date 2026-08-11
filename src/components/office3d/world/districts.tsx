"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { AREA_BY_ID } from "@/lib/game/map";
import { MAT, makeTextTexture } from "./materials";
import { u } from "./scale";
import { TwoSidedSign } from "./effects";
import { OfficeChair } from "./Furniture";
import { ROOM_THEMES } from "./themes";

// District interiors (STEP 4.9.3 §5, §11). A district is not a room
// with furniture — it is several small spaces with their own jobs:
// a hero landmark, two function zones, a social/buffer zone and the
// transition that hands you to the boulevard. Verticality (raised
// decks, sunken lounges, canopies, hanging displays) does the rest;
// the walking simulation stays flat, as agreed.

/* ── shared building blocks ──────────────────────────────────────── */

/** Raised deck with a lit edge — the district's "upper ground". */
function Deck({
  x,
  z,
  w,
  d,
  h = 0.34,
  accent,
}: {
  x: number;
  z: number;
  w: number;
  d: number;
  h?: number;
  accent: THREE.Material;
}) {
  return (
    <group position={[x, 0, z]}>
      <mesh material={MAT.warmCeramic} position={[0, h / 2, 0]} receiveShadow castShadow>
        <boxGeometry args={[w, h, d]} />
      </mesh>
      {/* lit nosing around the deck edge — reads as a step, not paint */}
      {[
        { p: [0, h - 0.03, d / 2] as const, s: [w, 0.05, 0.05] as const },
        { p: [0, h - 0.03, -d / 2] as const, s: [w, 0.05, 0.05] as const },
        { p: [w / 2, h - 0.03, 0] as const, s: [0.05, 0.05, d] as const },
        { p: [-w / 2, h - 0.03, 0] as const, s: [0.05, 0.05, d] as const },
      ].map((e, i) => (
        <mesh key={i} material={accent} position={[e.p[0], e.p[1], e.p[2]]}>
          <boxGeometry args={[e.s[0], e.s[1], e.s[2]]} />
        </mesh>
      ))}
    </group>
  );
}

/** Floating canopy panel — ceiling interest without closing the sky. */
function Canopy({
  x,
  z,
  w,
  d,
  y = 5.6,
  mat = MAT.pearl,
}: {
  x: number;
  z: number;
  w: number;
  d: number;
  y?: number;
  mat?: THREE.Material;
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (ref.current) ref.current.position.y = y + Math.sin(performance.now() / 4200) * 0.04;
  });
  return (
    <group ref={ref} position={[x, y, z]}>
      {/* translucent so the canopy reads as a light shelf overhead
          rather than a lid across the top of the frame */}
      <mesh material={MAT.frost}>
        <boxGeometry args={[w, 0.12, d]} />
      </mesh>
      <mesh material={mat} position={[0, 0.09, 0]}>
        <boxGeometry args={[w * 0.55, 0.08, d * 0.55]} />
      </mesh>
      <mesh material={MAT.neonWhite} position={[0, -0.09, 0]}>
        <boxGeometry args={[w * 0.86, 0.02, 0.02]} />
      </mesh>
    </group>
  );
}

/** Wall-hung display running live-looking content. */
function WallScreen({
  x,
  z,
  rotY = 0,
  w = 5.2,
  h = 2.9,
  lines,
}: {
  x: number;
  z: number;
  rotY?: number;
  w?: number;
  h?: number;
  lines: Array<{ text: string; size: number; color: string; weight?: number }>;
}) {
  const tex = useMemo(
    () =>
      makeTextTexture(lines, {
        width: 1024,
        height: 576,
        background: "#0c1626",
        backgroundTo: "#1a3350",
        tracking: 3,
      }),
    [lines],
  );
  const mat = useMemo(
    () => new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }),
    [tex],
  );
  return (
    <group position={[x, h / 2 + 1.1, z]} rotation-y={rotY}>
      <mesh material={MAT.matteSilver} position={[0, 0, -0.06]} castShadow>
        <boxGeometry args={[w + 0.16, h + 0.16, 0.12]} />
      </mesh>
      <mesh material={mat}>
        <planeGeometry args={[w, h]} />
      </mesh>
    </group>
  );
}

/** A workstation: desk, screen, chair, light line. */
function Workstation({
  x,
  z,
  rotY = 0,
  accent,
}: {
  x: number;
  z: number;
  rotY?: number;
  accent: THREE.Material;
}) {
  return (
    <group position={[x, 0, z]} rotation-y={rotY}>
      <mesh material={MAT.resinWhite} position={[0, 0.73, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.7, 0.06, 0.85]} />
      </mesh>
      {[-0.76, 0.76].map((lx) => (
        <mesh key={lx} material={MAT.matteSilver} position={[lx, 0.36, 0]}>
          <boxGeometry args={[0.07, 0.72, 0.7]} />
        </mesh>
      ))}
      <mesh material={MAT.screenDark} position={[0, 1.06, -0.28]}>
        <boxGeometry args={[0.8, 0.5, 0.04]} />
      </mesh>
      <mesh material={accent} position={[0, 0.69, 0.42]}>
        <boxGeometry args={[1.5, 0.025, 0.025]} />
      </mesh>
      <OfficeChair position={[0, 0, 0.85]} rotationY={Math.PI} />
    </group>
  );
}

/** Soft lounge cluster: rug, sofas, low table. */
function LoungeCluster({
  x,
  z,
  accent,
  fabric = MAT.fabricGreen,
}: {
  x: number;
  z: number;
  accent: THREE.Material;
  fabric?: THREE.Material;
}) {
  return (
    <group position={[x, 0, z]}>
      <mesh material={MAT.rug} rotation-x={-Math.PI / 2} position={[0, 0.02, 0]} receiveShadow>
        <circleGeometry args={[2.6, 28]} />
      </mesh>
      <mesh material={accent} rotation-x={-Math.PI / 2} position={[0, 0.025, 0]}>
        <ringGeometry args={[2.58, 2.64, 32]} />
      </mesh>
      {[0, Math.PI * 0.66, Math.PI * 1.33].map((a, i) => (
        <group key={i} position={[Math.cos(a) * 1.9, 0, Math.sin(a) * 1.9]} rotation-y={-a + Math.PI / 2}>
          <mesh material={fabric} position={[0, 0.28, 0]} castShadow>
            <boxGeometry args={[1.8, 0.34, 0.75]} />
          </mesh>
          <mesh material={fabric} position={[0, 0.6, -0.3]} castShadow>
            <boxGeometry args={[1.8, 0.5, 0.2]} />
          </mesh>
        </group>
      ))}
      <mesh material={MAT.frost} position={[0, 0.38, 0]} castShadow>
        <cylinderGeometry args={[0.6, 0.6, 0.06, 20]} />
      </mesh>
      <mesh material={MAT.matteSilver} position={[0, 0.19, 0]}>
        <cylinderGeometry args={[0.09, 0.14, 0.38, 12]} />
      </mesh>
    </group>
  );
}

/** Tall planting column for the plant zones. */
function PlantColumn({ x, z, h = 2.4 }: { x: number; z: number; h?: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh material={MAT.pearl} position={[0, 0.32, 0]} castShadow>
        <cylinderGeometry args={[0.42, 0.5, 0.64, 16]} />
      </mesh>
      <mesh material={MAT.trunk} position={[0, h * 0.5, 0]}>
        <cylinderGeometry args={[0.08, 0.11, h, 8]} />
      </mesh>
      <mesh material={MAT.leaf} position={[0, h * 0.92, 0]} castShadow>
        <icosahedronGeometry args={[0.95, 1]} />
      </mesh>
      <mesh material={MAT.leafDark} position={[0.5, h * 0.75, 0.2]}>
        <icosahedronGeometry args={[0.55, 1]} />
      </mesh>
    </group>
  );
}

/* ── STAFF — CREATIVE WORK CAMPUS ────────────────────────────────── */

export function StaffDistrict() {
  const b = AREA_BY_ID.STAFF.bounds;
  const theme = ROOM_THEMES.STAFF;
  const accent = useMemo(
    () => new THREE.MeshBasicMaterial({ color: theme.accent, toneMapped: false }),
    [theme.accent],
  );
  const island = useRef<THREE.Group>(null);
  useFrame(() => {
    if (island.current) {
      island.current.rotation.y = performance.now() / 22000;
    }
  });
  const at = (fx: number, fz: number): [number, number] => [
    u(b.x + b.w * fx),
    u(b.y + b.h * fz),
  ];
  const [ix, iz] = at(0.5, 0.46);
  return (
    <group>
      {/* ── HERO LANDMARK: Collaboration Island ── */}
      <Deck x={ix} z={iz} w={9.5} d={7.0} accent={accent} />
      <group position={[ix, 0.34, iz]}>
        <mesh material={MAT.resinWhite} position={[0, 0.74, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[2.3, 2.3, 0.08, 28]} />
        </mesh>
        <mesh material={MAT.matteSilver} position={[0, 0.37, 0]}>
          <cylinderGeometry args={[0.3, 0.45, 0.74, 16]} />
        </mesh>
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i / 8) * Math.PI * 2;
          return (
            <OfficeChair
              key={i}
              position={[Math.cos(a) * 3.1, 0, Math.sin(a) * 3.1]}
              rotationY={-a + Math.PI / 2}
              seatMat={MAT.white}
            />
          );
        })}
        {/* hanging halo above the island */}
        <group ref={island} position={[0, 4.6, 0]}>
          <mesh material={accent} rotation-x={Math.PI / 2}>
            <torusGeometry args={[1.9, 0.045, 8, 40]} />
          </mesh>
          <mesh material={MAT.neonWhite} rotation-x={Math.PI / 2}>
            <torusGeometry args={[1.3, 0.03, 8, 32]} />
          </mesh>
        </group>
      </group>
      <Canopy x={ix} z={iz} w={9.0} d={6.4} y={8.6} mat={MAT.warmCeramic} />

      {/* ── FUNCTION ZONE A: Focus Pods (west bay) ── */}
      {[0.16, 0.34].map((fz, row) =>
        [0.12, 0.3].map((fx, col) => {
          const [px, pz] = at(fx, fz);
          return (
            <Workstation
              key={`f${row}${col}`}
              x={px}
              z={pz}
              rotY={row === 0 ? 0 : Math.PI}
              accent={accent}
            />
          );
        }),
      )}
      {/* focus pod privacy fins */}
      {[0.21, 0.39].map((fz, i) => {
        const [px, pz] = at(0.21, fz);
        return (
          <mesh key={i} material={MAT.frost} position={[px, 1.3, pz]}>
            <boxGeometry args={[7.0, 1.5, 0.06]} />
          </mesh>
        );
      })}

      {/* ── FUNCTION ZONE B: Personal Desks (east bay) ── */}
      {[0.16, 0.34, 0.52].map((fz, row) => {
        const [px, pz] = at(0.84, fz);
        return <Workstation key={`p${row}`} x={px} z={pz} rotY={-Math.PI / 2} accent={accent} />;
      })}
      <WallScreen
        {...(() => {
          const [px, pz] = at(0.99, 0.3);
          return { x: px - 0.35, z: pz };
        })()}
        rotY={-Math.PI / 2}
        w={4.6}
        h={2.6}
        lines={[
          { text: "LIVE WALL", size: 62, color: "#eaf7ff", weight: 800 },
          { text: "TEAM ACTIVITY · NOW", size: 30, color: theme.accent, weight: 600 },
        ]}
      />

      {/* ── SOCIAL / BUFFER: Soft Lounge + plant zone (south) ── */}
      <LoungeCluster {...(() => { const [px, pz] = at(0.24, 0.78); return { x: px, z: pz }; })()} accent={accent} />
      <PlantColumn {...(() => { const [px, pz] = at(0.46, 0.85); return { x: px, z: pz }; })()} />
      <PlantColumn {...(() => { const [px, pz] = at(0.56, 0.75); return { x: px, z: pz }; })()} h={1.9} />

      {/* ── Small meeting nook (south-east) ── */}
      <group>
        <Deck {...(() => { const [px, pz] = at(0.78, 0.8); return { x: px, z: pz }; })()} w={5.4} d={4.4} h={0.22} accent={accent} />
        {(() => {
          const [px, pz] = at(0.78, 0.8);
          return (
            <group position={[px, 0.22, pz]}>
              <mesh material={MAT.resinWhite} position={[0, 0.74, 0]} castShadow>
                <boxGeometry args={[2.2, 0.07, 1.2]} />
              </mesh>
              <mesh material={MAT.matteSilver} position={[0, 0.37, 0]}>
                <cylinderGeometry args={[0.12, 0.18, 0.74, 12]} />
              </mesh>
              {[-1.5, 1.5].map((dx) => (
                <OfficeChair key={dx} position={[dx, 0, 0]} rotationY={dx < 0 ? Math.PI / 2 : -Math.PI / 2} />
              ))}
              <mesh material={MAT.frost} position={[0, 1.5, -1.4]}>
                <boxGeometry args={[5.0, 2.6, 0.06]} />
              </mesh>
            </group>
          );
        })()}
      </group>

      {/* ── City terrace: glazed edge looking out over the district ── */}
      {(() => {
        const [px, pz] = at(0.5, 0.05);
        return (
          <group position={[px, 0, pz]}>
            <mesh material={MAT.frost} position={[0, 0.55, 0]}>
              <boxGeometry args={[14, 1.1, 0.1]} />
            </mesh>
            <mesh material={accent} position={[0, 1.12, 0]}>
              <boxGeometry args={[14, 0.05, 0.14]} />
            </mesh>
          </group>
        );
      })()}
    </group>
  );
}

/* ── MEETING — GLASS MEETING PAVILION ────────────────────────────── */

/** A glass-walled meeting room: posts, glass, table, chairs, screen. */
function GlassRoom({
  x,
  z,
  w,
  d,
  accent,
  seats = 6,
  screen,
}: {
  x: number;
  z: number;
  w: number;
  d: number;
  accent: THREE.Material;
  seats?: number;
  screen?: Array<{ text: string; size: number; color: string; weight?: number }>;
}) {
  const H = 3.4;
  const perSide = Math.max(1, Math.floor(seats / 2));
  return (
    <group position={[x, 0, z]}>
      {/* glass envelope: three sides, open toward the corridor (+Z) */}
      {[
        { p: [0, H / 2, -d / 2] as const, s: [w, H, 0.06] as const },
        { p: [-w / 2, H / 2, 0] as const, s: [0.06, H, d] as const },
        { p: [w / 2, H / 2, 0] as const, s: [0.06, H, d] as const },
      ].map((g, i) => (
        <mesh key={i} material={MAT.glassMeeting} position={[g.p[0], g.p[1], g.p[2]]}>
          <boxGeometry args={[g.s[0], g.s[1], g.s[2]]} />
        </mesh>
      ))}
      {/* corner posts + head rail */}
      {[[-w / 2, -d / 2], [w / 2, -d / 2], [-w / 2, d / 2], [w / 2, d / 2]].map(([px, pz], i) => (
        <mesh key={i} material={MAT.brushed} position={[px, H / 2, pz]} castShadow>
          <boxGeometry args={[0.12, H, 0.12]} />
        </mesh>
      ))}
      <mesh material={MAT.brushed} position={[0, H, 0]}>
        <boxGeometry args={[w, 0.1, 0.1]} />
      </mesh>
      <mesh material={accent} position={[0, 0.06, d / 2]}>
        <boxGeometry args={[w, 0.05, 0.05]} />
      </mesh>
      {/* soft ceiling panel */}
      <mesh material={MAT.softGlow} position={[0, H + 0.2, 0]}>
        <boxGeometry args={[w * 0.7, 0.1, d * 0.6]} />
      </mesh>
      {/* table + chairs */}
      <mesh material={MAT.resinWhite} position={[0, 0.74, 0]} castShadow receiveShadow>
        <boxGeometry args={[w * 0.52, 0.07, d * 0.36]} />
      </mesh>
      <mesh material={accent} position={[0, 0.782, 0]}>
        <boxGeometry args={[w * 0.42, 0.006, 0.05]} />
      </mesh>
      <mesh material={MAT.matteSilver} position={[0, 0.37, 0]}>
        <cylinderGeometry args={[0.16, 0.24, 0.74, 14]} />
      </mesh>
      {Array.from({ length: perSide }, (_, i) => {
        const sx = -w * 0.26 + ((i + 1) * (w * 0.52)) / (perSide + 1);
        return (
          <group key={i}>
            <OfficeChair position={[sx, 0, -d * 0.28]} rotationY={0} seatMat={MAT.white} />
            <OfficeChair position={[sx, 0, d * 0.28]} rotationY={Math.PI} seatMat={MAT.white} />
          </group>
        );
      })}
      {screen ? (
        <WallScreen x={0} z={-d / 2 + 0.12} w={w * 0.6} h={1.9} lines={screen} />
      ) : null}
    </group>
  );
}

export function MeetingDistrict() {
  const b = AREA_BY_ID.MEETING.bounds;
  const theme = ROOM_THEMES.MEETING;
  const doorTex = useMemo(
    () =>
      makeTextTexture(
        [
          { text: "MEETING PAVILION", size: 62, color: "#eaf7ff", weight: 800 },
          { text: "GLASS ROOMS · PRESENTATION", size: 26, color: "#a89cff", weight: 600 },
        ],
        { width: 768, height: 200, background: "#0e1424", backgroundTo: "#241f4a", tracking: 5 },
      ),
    [],
  );
  const accent = useMemo(
    () => new THREE.MeshBasicMaterial({ color: theme.accent, toneMapped: false }),
    [theme.accent],
  );
  const at = (fx: number, fz: number): [number, number] => [
    u(b.x + b.w * fx),
    u(b.y + b.h * fz),
  ];
  const [mx, mz] = at(0.5, 0.34);
  return (
    <group>
      {/* ── HERO LANDMARK: Main Conference Room ── */}
      <Deck x={mx} z={mz} w={13.5} d={9.5} h={0.26} accent={accent} />
      <group position={[mx, 0.26, mz]}>
        <GlassRoom
          x={0}
          z={0}
          w={12.0}
          d={8.2}
          accent={accent}
          seats={10}
          screen={[
            { text: "MAIN CONFERENCE", size: 58, color: "#eaf7ff", weight: 800 },
            { text: "AnyWare OFFICE · WEEKLY SYNC", size: 28, color: "#a89cff", weight: 600 },
          ]}
        />
      </group>

      {/* ── FUNCTION ZONE A: small meeting rooms (west) ── */}
      {(() => {
        const [sx, sz] = at(0.14, 0.72);
        return (
          <GlassRoom x={sx} z={sz} w={5.6} d={5.0} accent={accent} seats={4} />
        );
      })()}
      {(() => {
        const [sx, sz] = at(0.4, 0.75);
        return <GlassRoom x={sx} z={sz} w={5.2} d={4.6} accent={accent} seats={4} />;
      })()}

      {/* ── FUNCTION ZONE B: standing meeting + presentation (east) ── */}
      {(() => {
        const [sx, sz] = at(0.76, 0.7);
        return (
          <group position={[sx, 0, sz]}>
            {/* standing tables */}
            {[-2.2, 2.2].map((dx) => (
              <group key={dx} position={[dx, 0, 0]}>
                <mesh material={MAT.resinWhite} position={[0, 1.05, 0]} castShadow>
                  <cylinderGeometry args={[0.7, 0.7, 0.07, 20]} />
                </mesh>
                <mesh material={MAT.matteSilver} position={[0, 0.53, 0]}>
                  <cylinderGeometry args={[0.09, 0.16, 1.05, 12]} />
                </mesh>
                <mesh material={accent} rotation-x={-Math.PI / 2} position={[0, 0.03, 0]}>
                  <ringGeometry args={[1.0, 1.1, 24]} />
                </mesh>
              </group>
            ))}
          </group>
        );
      })()}
      {(() => {
        const [sx, sz] = at(0.86, 0.28);
        return (
          <group position={[sx, 0, sz]}>
            <Deck x={0} z={0} w={5.6} d={4.6} h={0.42} accent={accent} />
            <WallScreen
              x={0}
              z={-2.1}
              w={4.4}
              h={2.5}
              lines={[
                { text: "PRESENTATION", size: 56, color: "#eaf7ff", weight: 800 },
                { text: "STAGE READY", size: 28, color: "#a89cff", weight: 600 },
              ]}
            />
          </group>
        );
      })()}

      {/* ── SOCIAL / BUFFER: waiting zone by the door ── */}
      <LoungeCluster
        {...(() => { const [sx, sz] = at(0.5, 0.92); return { x: sx, z: sz }; })()}
        accent={accent}
        fabric={MAT.fabricGray}
      />
      <PlantColumn {...(() => { const [sx, sz] = at(0.2, 0.94); return { x: sx, z: sz }; })()} />
      <PlantColumn {...(() => { const [sx, sz] = at(0.8, 0.94); return { x: sx, z: sz }; })()} h={2.0} />

      {/* ── TRANSITION: glazed threshold at the district door ── */}
      {(() => {
        const [sx, sz] = at(0.5, 1.0);
        return (
          <group position={[sx, 0, sz - 0.6]}>
            <mesh material={accent} rotation-x={-Math.PI / 2} position={[0, 0.03, 0]}>
              <planeGeometry args={[7.0, 0.12]} />
            </mesh>
            <TwoSidedSign
              texture={doorTex}
              width={5.4}
              height={1.4}
              position={[0, 4.6, 0]}
            />
          </group>
        );
      })()}
    </group>
  );
}
