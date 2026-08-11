"use client";

import { RoundedBox } from "@react-three/drei";
import { MAT } from "./materials";

// Parametric furniture (§16): every piece reads as a silhouette — no
// bare single boxes. All meshes are static; materials are shared
// singletons from materials.ts.

export function OfficeChair({
  position,
  rotationY = 0,
  seatMat = MAT.charcoal,
}: {
  position: [number, number, number];
  rotationY?: number;
  seatMat?: typeof MAT.charcoal;
}) {
  return (
    <group position={position} rotation-y={rotationY}>
      {/* base + post */}
      <mesh material={MAT.metalLeg} position={[0, 0.02, 0]} castShadow>
        <cylinderGeometry args={[0.26, 0.3, 0.04, 12]} />
      </mesh>
      <mesh material={MAT.metalLeg} position={[0, 0.22, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.4, 8]} />
      </mesh>
      {/* seat */}
      <RoundedBox
        args={[0.46, 0.08, 0.44]}
        radius={0.03}
        position={[0, 0.46, 0]}
        material={seatMat}
        castShadow
      />
      {/* back */}
      <RoundedBox
        args={[0.44, 0.52, 0.07]}
        radius={0.03}
        position={[0, 0.78, -0.2]}
        rotation-x={-0.08}
        material={seatMat}
        castShadow
      />
    </group>
  );
}

export function Monitor({
  position,
  rotationY = 0,
}: {
  position: [number, number, number];
  rotationY?: number;
}) {
  return (
    <group position={position} rotation-y={rotationY}>
      <mesh material={MAT.metalLeg} position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.09, 0.11, 0.03, 10]} />
      </mesh>
      <mesh material={MAT.metalLeg} position={[0, 0.12, 0]}>
        <boxGeometry args={[0.04, 0.2, 0.04]} />
      </mesh>
      <RoundedBox args={[0.56, 0.34, 0.03]} radius={0.01} position={[0, 0.36, 0]} castShadow>
        <meshStandardMaterial color="#22262c" roughness={0.4} />
      </RoundedBox>
      <mesh material={MAT.screenDark} position={[0, 0.36, 0.017]}>
        <planeGeometry args={[0.52, 0.3]} />
      </mesh>
    </group>
  );
}

/** Two-seat desk bank sized to a map FURNITURE rect (collision-linked). */
export function DeskBank({
  cx,
  cz,
  w,
  d,
  chairSide = 1,
}: {
  cx: number;
  cz: number;
  w: number;
  d: number;
  /** chairs on +Z (1) or -Z (-1) side */
  chairSide?: 1 | -1;
}) {
  const topY = 0.74;
  return (
    <group position={[cx, 0, cz]}>
      <RoundedBox
        args={[w, 0.05, d]}
        radius={0.015}
        position={[0, topY, 0]}
        material={MAT.woodTop}
        castShadow
        receiveShadow
      />
      {[-w / 2 + 0.08, w / 2 - 0.08].map((lx) => (
        <mesh key={lx} material={MAT.metalLeg} position={[lx, topY / 2, 0]} castShadow>
          <boxGeometry args={[0.06, topY, d - 0.12]} />
        </mesh>
      ))}
      {/* two workstations */}
      {[-w / 4, w / 4].map((mx) => (
        <group key={mx}>
          <Monitor
            position={[mx, topY + 0.02, -chairSide * (d / 4 - 0.05)]}
            rotationY={chairSide === 1 ? 0 : Math.PI}
          />
          {/* keyboard */}
          <mesh material={MAT.white} position={[mx, topY + 0.035, chairSide * 0.1]}>
            <boxGeometry args={[0.34, 0.02, 0.13]} />
          </mesh>
          <OfficeChair
            position={[mx, 0, chairSide * (d / 2 + 0.35)]}
            rotationY={chairSide === 1 ? Math.PI : 0}
          />
        </group>
      ))}
    </group>
  );
}

export function MeetingTable({
  cx,
  cz,
  w,
  d,
  chairs = 6,
}: {
  cx: number;
  cz: number;
  w: number;
  d: number;
  chairs?: number;
}) {
  const topY = 0.74;
  const perSide = Math.max(1, Math.floor((chairs - 2) / 2));
  const sideXs = Array.from(
    { length: perSide },
    (_, i) => -w / 2 + ((i + 1) * w) / (perSide + 1),
  );
  return (
    <group position={[cx, 0, cz]}>
      <RoundedBox
        args={[w, 0.06, d]}
        radius={0.03}
        position={[0, topY, 0]}
        material={MAT.woodTop}
        castShadow
        receiveShadow
      />
      {[-w / 2 + 0.25, w / 2 - 0.25].map((lx) => (
        <RoundedBox
          key={lx}
          args={[0.08, topY, d - 0.4]}
          radius={0.02}
          position={[lx, topY / 2, 0]}
          material={MAT.woodDark}
          castShadow
        />
      ))}
      {sideXs.map((sx) => (
        <OfficeChair key={`n${sx}`} position={[sx, 0, -d / 2 - 0.34]} rotationY={0} />
      ))}
      {sideXs.map((sx) => (
        <OfficeChair key={`s${sx}`} position={[sx, 0, d / 2 + 0.34]} rotationY={Math.PI} />
      ))}
      <OfficeChair position={[-w / 2 - 0.36, 0, 0]} rotationY={Math.PI / 2} />
      <OfficeChair position={[w / 2 + 0.36, 0, 0]} rotationY={-Math.PI / 2} />
    </group>
  );
}

export function PlantTall({
  position,
  scale = 1,
}: {
  position: [number, number, number];
  scale?: number;
}) {
  return (
    <group position={position} scale={scale}>
      <mesh material={MAT.pot} position={[0, 0.22, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.24, 0.44, 10]} />
      </mesh>
      <mesh material={MAT.trunk} position={[0, 0.75, 0]}>
        <cylinderGeometry args={[0.035, 0.05, 0.75, 6]} />
      </mesh>
      <mesh material={MAT.leaf} position={[0, 1.3, 0]} castShadow>
        <icosahedronGeometry args={[0.42, 1]} />
      </mesh>
      <mesh material={MAT.leafDark} position={[0.22, 1.05, 0.1]} castShadow>
        <icosahedronGeometry args={[0.26, 1]} />
      </mesh>
      <mesh material={MAT.leafDark} position={[-0.2, 1.12, -0.12]}>
        <icosahedronGeometry args={[0.24, 1]} />
      </mesh>
    </group>
  );
}

export function PlantSmall({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh material={MAT.potDark} position={[0, 0.12, 0]} castShadow>
        <cylinderGeometry args={[0.13, 0.16, 0.24, 8]} />
      </mesh>
      <mesh material={MAT.leaf} position={[0, 0.38, 0]} castShadow>
        <icosahedronGeometry args={[0.2, 1]} />
      </mesh>
      <mesh material={MAT.leafDark} position={[0.1, 0.28, 0.06]}>
        <icosahedronGeometry args={[0.12, 1]} />
      </mesh>
    </group>
  );
}

export function Sofa({
  position,
  rotationY = 0,
  width = 2,
  mat = MAT.fabricWarm,
}: {
  position: [number, number, number];
  rotationY?: number;
  width?: number;
  mat?: typeof MAT.fabricWarm;
}) {
  return (
    <group position={position} rotation-y={rotationY}>
      <RoundedBox args={[width, 0.16, 0.85]} radius={0.05} position={[0, 0.22, 0]} material={mat} castShadow />
      <RoundedBox args={[width, 0.28, 0.75]} radius={0.06} position={[0, 0.36, 0]} material={mat} castShadow />
      <RoundedBox args={[width, 0.55, 0.2]} radius={0.06} position={[0, 0.62, -0.32]} material={mat} castShadow />
      {[-width / 2 + 0.1, width / 2 - 0.1].map((ax) => (
        <RoundedBox key={ax} args={[0.2, 0.5, 0.8]} radius={0.06} position={[ax, 0.5, 0]} material={mat} castShadow />
      ))}
      {[-width / 2 + 0.15, width / 2 - 0.15].map((lx) => (
        <mesh key={lx} material={MAT.woodDark} position={[lx, 0.07, 0.3]}>
          <cylinderGeometry args={[0.025, 0.025, 0.14, 6]} />
        </mesh>
      ))}
    </group>
  );
}

export function CoffeeTable({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh material={MAT.woodTop} position={[0, 0.36, 0]} castShadow>
        <cylinderGeometry args={[0.45, 0.45, 0.04, 20]} />
      </mesh>
      <mesh material={MAT.charcoal} position={[0, 0.18, 0]}>
        <cylinderGeometry args={[0.05, 0.07, 0.34, 8]} />
      </mesh>
      <mesh material={MAT.charcoal} position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.24, 0.28, 0.03, 12]} />
      </mesh>
    </group>
  );
}

/** Reception counter sized to the map counter rect. */
export function Reception({
  cx,
  cz,
  w,
  d,
}: {
  cx: number;
  cz: number;
  w: number;
  d: number;
}) {
  return (
    <group position={[cx, 0, cz]}>
      {/* front panel (faces the entrance door, +Z is room-north here) */}
      <RoundedBox args={[w, 1.05, d]} radius={0.02} position={[0, 0.55, 0]} material={MAT.charcoal} castShadow receiveShadow />
      <RoundedBox args={[w + 0.14, 0.06, d + 0.14]} radius={0.02} position={[0, 1.1, 0]} material={MAT.woodTop} castShadow />
      {/* inner working top + monitor hint */}
      <mesh material={MAT.white} position={[0, 0.78, d / 2 + 0.18]}>
        <boxGeometry args={[w * 0.7, 0.04, 0.35]} />
      </mesh>
      <Monitor position={[w * 0.18, 0.8, d / 2 + 0.2]} rotationY={Math.PI} />
    </group>
  );
}

export function Pendant({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh material={MAT.charcoal}>
        <cylinderGeometry args={[0.01, 0.01, 1.0, 4]} />
      </mesh>
      <mesh material={MAT.charcoal} position={[0, -0.55, 0]}>
        <cylinderGeometry args={[0.16, 0.11, 0.16, 12, 1, true]} />
      </mesh>
      <mesh material={MAT.pendant} position={[0, -0.6, 0]}>
        <sphereGeometry args={[0.07, 10, 8]} />
      </mesh>
    </group>
  );
}

export function Shelf({
  position,
  rotationY = 0,
  width = 1.8,
}: {
  position: [number, number, number];
  rotationY?: number;
  width?: number;
}) {
  const colors = [MAT.fabricGreen, MAT.fabricWarm, MAT.charcoal, MAT.white];
  return (
    <group position={position} rotation-y={rotationY}>
      <RoundedBox args={[width, 1.5, 0.32]} radius={0.02} position={[0, 0.75, 0]} material={MAT.woodDark} castShadow receiveShadow />
      {[0.42, 0.88, 1.34].map((sy, row) => (
        <group key={sy}>
          <mesh material={MAT.woodTop} position={[0, sy - 0.07, 0.02]}>
            <boxGeometry args={[width - 0.1, 0.03, 0.28]} />
          </mesh>
          {Array.from({ length: 4 }, (_, i) => (
            <mesh
              key={i}
              material={colors[(i + row) % colors.length]}
              position={[-width / 2 + 0.25 + i * ((width - 0.5) / 3), sy + 0.08, 0.02]}
            >
              <boxGeometry args={[0.16, 0.24, 0.2]} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

export function Rug({
  position,
  radius = 1.4,
}: {
  position: [number, number, number];
  radius?: number;
}) {
  return (
    <mesh material={MAT.rug} position={position} rotation-x={-Math.PI / 2} receiveShadow>
      <circleGeometry args={[radius, 24]} />
    </mesh>
  );
}
