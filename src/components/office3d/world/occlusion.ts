"use client";

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { LabSim } from "../LabSim";
import { WORLD_UNIT_TO_METERS } from "./scale";

// Camera-relative dollhouse occlusion. The chase camera now swings to
// sit behind the walking direction, so "between the avatar and the
// camera" must be evaluated against the camera's actual position, on
// both world axes — not the old fixed south-of-avatar assumption.

/** Is `p` on the segment between avatar coord `a` and camera coord `cam`
 * (world units), with a little slack past the camera plane? */
export function axisBetween(a: number, cam: number, p: number): boolean {
  const lo = Math.min(a, cam);
  const hi = Math.max(a, cam);
  return p > lo + 8 && p < hi + 80;
}

/** Would a set-piece anchored at (px,py) sit between avatar and camera? */
export function pointOccluded(
  ax: number,
  ay: number,
  camUx: number,
  camUy: number,
  px: number,
  py: number,
  halfWidth = 340,
): boolean {
  return (
    (axisBetween(ay, camUy, py) && Math.abs(px - ax) < halfWidth) ||
    (axisBetween(ax, camUx, px) && Math.abs(py - ay) < halfWidth)
  );
}

/** Hides the returned group while its anchor sits between avatar and
 * camera (any approach direction). */
export function useViewOcclusion(
  sim: LabSim,
  xUnits: number,
  yUnits: number,
  halfWidth = 340,
) {
  const camera = useThree((s) => s.camera);
  const group = useRef<THREE.Group>(null);
  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const camUx = camera.position.x / WORLD_UNIT_TO_METERS;
    const camUy = camera.position.z / WORLD_UNIT_TO_METERS;
    g.visible = !pointOccluded(
      sim.avatar.x,
      sim.avatar.y,
      camUx,
      camUy,
      xUnits,
      yUnits,
      halfWidth,
    );
  });
  return group;
}
