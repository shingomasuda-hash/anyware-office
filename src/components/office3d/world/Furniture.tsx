"use client";

import { RoundedBox } from "@react-three/drei";
import { MAT } from "./materials";

// Parametric furniture (§16) — STEP 4.9.1 art direction: clean resin /
// matte metal "future modules" with subtle neon light accents instead
// of plain wooden office fittings. All meshes are static; materials are
// shared singletons from materials.ts.

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
      <mesh material={MAT.matteSilver} position={[0, 0.02, 0]} castShadow>
        <cylinderGeometry args={[0.26, 0.3, 0.04, 12]} />
      </mesh>
      <mesh material={MAT.matteSilver} position={[0, 0.22, 0]}>
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
      <mesh material={MAT.matteSilver} position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.09, 0.11, 0.03, 10]} />
      </mesh>
      <mesh material={MAT.matteSilver} position={[0, 0.12, 0]}>
        <boxGeometry args={[0.04, 0.2, 0.04]} />
      </mesh>
      <RoundedBox args={[0.56, 0.34, 0.03]} radius={0.01} position={[0, 0.36, 0]} castShadow>
        <meshStandardMaterial color="#dfe3e8" roughness={0.35} metalness={0.3} />
      </RoundedBox>
      <mesh material={MAT.screenDark} position={[0, 0.36, 0.017]}>
        <planeGeometry args={[0.52, 0.3]} />
      </mesh>
      {/* light bar under the display */}
      <mesh material={MAT.neonCyan} position={[0, 0.185, 0.012]}>
        <boxGeometry args={[0.3, 0.012, 0.012]} />
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
        material={MAT.resinWhite}
        castShadow
        receiveShadow
      />
      {[-w / 2 + 0.08, w / 2 - 0.08].map((lx) => (
        <mesh key={lx} material={MAT.matteSilver} position={[lx, topY / 2, 0]} castShadow>
          <boxGeometry args={[0.06, topY, d - 0.12]} />
        </mesh>
      ))}
      {/* light line along the working edge */}
      <mesh
        material={MAT.neonCyan}
        position={[0, topY - 0.045, chairSide * (d / 2 - 0.015)]}
      >
        <boxGeometry args={[w - 0.2, 0.016, 0.016]} />
      </mesh>
      {/* frosted center divider between the two workstations */}
      <mesh material={MAT.frost} position={[0, topY + 0.19, 0]}>
        <boxGeometry args={[0.02, 0.34, d - 0.24]} />
      </mesh>
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
        material={MAT.resinWhite}
        castShadow
        receiveShadow
      />
      {/* cyan data-line inlay along the table center */}
      <mesh material={MAT.neonCyan} position={[0, topY + 0.033, 0]}>
        <boxGeometry args={[w - 0.5, 0.006, 0.03]} />
      </mesh>
      {/* center pedestal instead of four legs */}
      <mesh material={MAT.matteSilver} position={[0, topY / 2, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.12, topY, 10]} />
      </mesh>
      <mesh material={MAT.matteSilver} position={[0, 0.025, 0]}>
        <cylinderGeometry args={[Math.min(w, d) * 0.28, Math.min(w, d) * 0.32, 0.05, 14]} />
      </mesh>
      {sideXs.map((sx) => (
        <OfficeChair key={`n${sx}`} position={[sx, 0, -d / 2 - 0.34]} rotationY={0} seatMat={MAT.white} />
      ))}
      {sideXs.map((sx) => (
        <OfficeChair key={`s${sx}`} position={[sx, 0, d / 2 + 0.34]} rotationY={Math.PI} seatMat={MAT.white} />
      ))}
      <OfficeChair position={[-w / 2 - 0.36, 0, 0]} rotationY={Math.PI / 2} seatMat={MAT.white} />
      <OfficeChair position={[w / 2 + 0.36, 0, 0]} rotationY={-Math.PI / 2} seatMat={MAT.white} />
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
        <mesh key={lx} material={MAT.matteSilver} position={[lx, 0.07, 0.3]}>
          <cylinderGeometry args={[0.025, 0.025, 0.14, 6]} />
        </mesh>
      ))}
    </group>
  );
}

export function CoffeeTable({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh material={MAT.frost} position={[0, 0.36, 0]} castShadow>
        <cylinderGeometry args={[0.45, 0.45, 0.035, 20]} />
      </mesh>
      <mesh material={MAT.matteSilver} position={[0, 0.18, 0]}>
        <cylinderGeometry args={[0.05, 0.07, 0.34, 8]} />
      </mesh>
      <mesh material={MAT.matteSilver} position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.24, 0.28, 0.03, 12]} />
      </mesh>
    </group>
  );
}

/** Reception counter sized to the map counter rect — future front desk. */
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
      {/* clean white monolith body */}
      <RoundedBox args={[w, 1.05, d]} radius={0.05} position={[0, 0.55, 0]} material={MAT.resinWhite} castShadow receiveShadow />
      <RoundedBox args={[w + 0.14, 0.05, d + 0.14]} radius={0.02} position={[0, 1.1, 0]} material={MAT.matteSilver} castShadow />
      {/* light lines: floating base glow + under-rim accent */}
      <mesh material={MAT.neonCyan} position={[0, 0.07, d / 2 + 0.005]}>
        <boxGeometry args={[w - 0.2, 0.025, 0.02]} />
      </mesh>
      <mesh material={MAT.neonCyan} position={[0, 1.065, d / 2 + 0.06]}>
        <boxGeometry args={[w + 0.1, 0.014, 0.014]} />
      </mesh>
      {/* inner working top + monitor */}
      <mesh material={MAT.white} position={[0, 0.78, d / 2 + 0.18]}>
        <boxGeometry args={[w * 0.7, 0.04, 0.35]} />
      </mesh>
      <Monitor position={[w * 0.18, 0.8, d / 2 + 0.2]} rotationY={Math.PI} />
    </group>
  );
}

/** Floating halo lamp — a glowing ring on a thin cable. */
export function Pendant({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh material={MAT.matteSilver} position={[0, -0.14, 0]}>
        <cylinderGeometry args={[0.006, 0.006, 0.4, 4]} />
      </mesh>
      <mesh material={MAT.pendant} position={[0, -0.4, 0]} rotation-x={Math.PI / 2}>
        <torusGeometry args={[0.16, 0.025, 8, 24]} />
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
  const colors = [MAT.fabricGreen, MAT.charcoal, MAT.white, MAT.fabricGray];
  return (
    <group position={position} rotation-y={rotationY}>
      {/* thin back panel + side cheeks — books sit in FRONT of it */}
      <mesh material={MAT.resinWhite} position={[0, 0.75, -0.14]} castShadow receiveShadow>
        <boxGeometry args={[width, 1.5, 0.05]} />
      </mesh>
      {[-width / 2 + 0.025, width / 2 - 0.025].map((sx) => (
        <mesh key={sx} material={MAT.matteSilver} position={[sx, 0.75, 0]}>
          <boxGeometry args={[0.05, 1.5, 0.32]} />
        </mesh>
      ))}
      {[0.06, 0.52, 0.98, 1.44].map((sy) => (
        <mesh key={sy} material={MAT.resinWhite} position={[0, sy, 0]}>
          <boxGeometry args={[width - 0.08, 0.035, 0.3]} />
        </mesh>
      ))}
      {[0.52, 0.98].map((sy, row) => (
        <group key={sy}>
          {Array.from({ length: 5 }, (_, i) => (
            <mesh
              key={i}
              material={colors[(i + row) % colors.length]}
              position={[
                -width / 2 + 0.22 + i * ((width - 0.44) / 4),
                sy + 0.15,
                0.01,
              ]}
              castShadow
            >
              <boxGeometry args={[0.14, 0.26, 0.18]} />
            </mesh>
          ))}
        </group>
      ))}
      {/* mint light edge on the top shelf */}
      <mesh material={MAT.neonMint} position={[0, 1.462, 0.14]}>
        <boxGeometry args={[width - 0.1, 0.012, 0.012]} />
      </mesh>
      {/* top row: plant + binder box */}
      <mesh material={MAT.potDark} position={[-width / 4, 1.52, 0]}>
        <cylinderGeometry args={[0.08, 0.1, 0.14, 8]} />
      </mesh>
      <mesh material={MAT.leaf} position={[-width / 4, 1.68, 0]}>
        <icosahedronGeometry args={[0.12, 1]} />
      </mesh>
      <mesh material={MAT.white} position={[width / 4, 1.55, 0]}>
        <boxGeometry args={[0.3, 0.18, 0.2]} />
      </mesh>
    </group>
  );
}

/** Slim laptop + paper props for meeting tables. */
export function TableProps({
  position,
  rotationY = 0,
}: {
  position: [number, number, number];
  rotationY?: number;
}) {
  return (
    <group position={position} rotation-y={rotationY}>
      <mesh material={MAT.matteSilver} position={[0, 0.012, 0]} castShadow>
        <boxGeometry args={[0.3, 0.018, 0.21]} />
      </mesh>
      <mesh material={MAT.matteSilver} position={[0, 0.1, -0.1]} rotation-x={-1.85}>
        <boxGeometry args={[0.3, 0.008, 0.2]} />
      </mesh>
      <mesh material={MAT.screenDark} position={[0, 0.1, -0.096]} rotation-x={-1.85}>
        <planeGeometry args={[0.27, 0.17]} />
      </mesh>
      <mesh material={MAT.white} position={[0.32, 0.01, 0.05]} rotation-y={0.3}>
        <boxGeometry args={[0.21, 0.006, 0.29]} />
      </mesh>
    </group>
  );
}

/** Digital idea board — dark glass surface with luminous strokes. */
export function WhiteBoard({
  position,
  rotationY = 0,
}: {
  position: [number, number, number];
  rotationY?: number;
}) {
  return (
    <group position={position} rotation-y={rotationY}>
      <RoundedBox args={[1.7, 1.05, 0.05]} radius={0.02} position={[0, 1.35, 0]} material={MAT.screenDark} castShadow />
      <mesh material={MAT.matteSilver} position={[0, 1.35, -0.01]}>
        <boxGeometry args={[1.78, 1.13, 0.03]} />
      </mesh>
      {/* luminous strokes */}
      <mesh material={MAT.neonCyan} position={[-0.3, 1.5, 0.028]}>
        <planeGeometry args={[0.7, 0.03]} />
      </mesh>
      <mesh material={MAT.neonWhite} position={[-0.15, 1.34, 0.028]}>
        <planeGeometry args={[0.95, 0.03]} />
      </mesh>
      <mesh material={MAT.neonMint} position={[0.25, 1.18, 0.028]}>
        <planeGeometry args={[0.5, 0.03]} />
      </mesh>
      {[-0.6, 0.6].map((lx) => (
        <mesh key={lx} material={MAT.matteSilver} position={[lx, 0.55, 0]}>
          <boxGeometry args={[0.05, 1.35, 0.05]} />
        </mesh>
      ))}
      {[-0.6, 0.6].map((lx) => (
        <mesh key={lx} material={MAT.matteSilver} position={[lx, 0.03, 0]}>
          <boxGeometry args={[0.09, 0.05, 0.42]} />
        </mesh>
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
