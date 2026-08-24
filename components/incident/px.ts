import type { RootState } from "@react-three/fiber";
import type * as THREE from "three";

/**
 * Converts a world-space radius into device pixels for gl_PointSize.
 *
 * Without this every particle size is an arbitrary constant that changes
 * meaning with viewport height, focal length and pixel ratio — which is how
 * you end up with flames the size of dinner plates on one screen and
 * invisible on another. With it, a particle written as 0.02 is two
 * centimetres across and stays two centimetres across everywhere.
 */
export function pixelsPerMetre(state: RootState): number {
  const cam = state.camera as THREE.PerspectiveCamera;
  return (state.size.height / (2 * Math.tan((cam.fov * Math.PI) / 360))) * state.viewport.dpr;
}
