"use client";

import { useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useIncident } from "./use-incident";

/**
 * THE CAMERA
 * ==========
 *
 * A virtual camera on rails, not an orbit control. Sixteen keyframes carry it
 * from a foreground pipe in a near-black plant, through the detector, down
 * the cable tray, along the inside of the suppression manifold, back for the
 * collision, then out to the full facility.
 *
 * Keyframes are unevenly spaced in scroll — the collision gets far more
 * distance than the approach — so scroll position is mapped onto the spline
 * parameter by its own curve rather than handed over raw. That keeps the
 * film's pacing while letting the Catmull-Rom stay smooth.
 *
 * That mapping has to be C1. An earlier version smoothstepped the weight
 * inside each segment, which pins the camera's velocity to zero at every
 * keyframe: measured across the film it produced a 76,000:1 spread between
 * the slowest and fastest points, so the camera stopped dead seventeen times
 * and lurched between. A monotone cubic through the same keyframes holds each
 * one at the same scroll position but carries continuous velocity across it.
 */

type Key = {
  p: number;
  pos: [number, number, number];
  look: [number, number, number];
  fov: number;
};

const KEYS: Key[] = [
  // opening: already inside the incident, fire low and right behind steel
  { p: 0.0, pos: [3.4, 2.5, 10.6], look: [1.1, 1.9, 1.7], fov: 42 },
  { p: 0.075, pos: [3.0, 2.2, 8.2], look: [1.6, 1.5, 1.7], fov: 40 },
  // escalation: push in on the seat of the fire
  { p: 0.14, pos: [3.0, 1.85, 6.4], look: [2.0, 1.2, 1.7], fov: 38 },
  // x-ray: swing to the inlet duct and look into it
  { p: 0.205, pos: [-2.6, 3.6, 5.6], look: [-4.2, 3.35, 0.6], fov: 36 },
  // detection: the detector, aimed back at the fire
  { p: 0.27, pos: [5.4, 4.6, 5.2], look: [4.5, 4.2, 3.0], fov: 32 },
  // signal: follow the cable tray toward the panel
  { p: 0.335, pos: [-1.6, 5.2, 6.4], look: [-5.6, 4.4, 3.3], fov: 42 },
  // pressurisation: the HRD bottle and its riser
  { p: 0.4, pos: [-6.4, 4.0, 4.6], look: [-5.6, 5.2, 1.9], fov: 40 },
  // inside the manifold, travelling with the agent
  { p: 0.47, pos: [-2.4, 6.5, 3.4], look: [1.8, 6.35, 1.9], fov: 34 },
  // nozzles priming
  { p: 0.53, pos: [2.8, 6.0, 6.8], look: [2.0, 4.6, 2.0], fov: 40 },
  // the collision — far enough back to hold flame and spray in one frame,
  // and almost stationary once they meet
  { p: 0.62, pos: [7.2, 4.1, 12.8], look: [2.2, 2.0, 1.7], fov: 40 },
  { p: 0.7, pos: [6.4, 3.5, 11.0], look: [2.1, 1.7, 1.7], fov: 38 },
  // the last flame
  { p: 0.755, pos: [3.9, 1.45, 6.2], look: [2.05, 0.85, 1.7], fov: 27 },
  // aftermath: slow float over wet steel
  { p: 0.8, pos: [2.6, 3.6, 10.0], look: [1.2, 2.0, 1.2], fov: 44 },
  // pressure heading down the outlet
  { p: 0.865, pos: [5.6, 2.6, 4.2], look: [6.4, 1.75, -0.3], fov: 38 },
  // relief: rise up the vessel
  { p: 0.912, pos: [3.0, 5.4, 5.4], look: [0.2, 5.4, 0.0], fov: 42 },
  // the pull-back
  { p: 0.95, pos: [4.0, 6.4, 15.0], look: [1.0, 3.6, 0.0], fov: 46 },
  { p: 1.0, pos: [6.5, 10.5, 30.0], look: [1.5, 3.4, -0.5], fov: 50 },
];

/**
 * Monotone cubic (Fritsch-Carlson) through the keyframes' scroll positions.
 *
 * Maps scroll p onto the spline's own parameter so that key i always lands at
 * exactly p = KEYS[i].p — the shots stay locked to the chapters they were cut
 * for — while the first derivative stays continuous across every boundary.
 * The monotonicity filter is what makes it safe here: a plain Catmull-Rom on
 * these knots can overshoot, and an overshooting playhead runs the film
 * backwards for a frame.
 */
function monotoneSlopes(P: number[], U: number[]): number[] {
  const n = P.length;
  const d: number[] = [];
  for (let i = 0; i < n - 1; i++) d.push((U[i + 1] - U[i]) / (P[i + 1] - P[i]));

  const m: number[] = new Array(n);
  m[0] = d[0];
  m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = (d[i - 1] + d[i]) / 2;

  // Fritsch-Carlson: keep each slope inside the circle of radius 3 so the
  // segment cannot overshoot its own endpoints.
  for (let i = 0; i < n - 1; i++) {
    const a = m[i] / d[i];
    const b = m[i + 1] / d[i];
    const s = a * a + b * b;
    if (s > 9) {
      const t = 3 / Math.sqrt(s);
      m[i] = t * a * d[i];
      m[i + 1] = t * b * d[i];
    }
  }
  return m;
}

/**
 * Keyframe focal lengths are authored for a wide desktop frame. A phone in
 * portrait has a much narrower horizontal field at the same vertical fov, so
 * a straight crop would cut the fire off the side of every shot. Widening the
 * vertical fov until the horizontal field matches gives the phone the same
 * composition the shot was framed for, rather than a slice of it.
 */
const REF_ASPECT = 16 / 9;

function fitFov(fov: number, aspect: number): number {
  if (aspect >= REF_ASPECT) return fov;
  const wide = (2 * Math.atan(Math.tan((fov * Math.PI) / 360) * (REF_ASPECT / aspect)) * 180) / Math.PI;
  return Math.min(wide, 82);
}

export function CameraRig() {
  const { ch, p: progress, v: velocity, pointer, reduced } = useIncident();
  const { camera, size } = useThree();

  // Knots for the scroll -> spline-parameter mapping. Key i sits at u = i/(n-1).
  const { P, U, M } = useMemo(() => {
    const p0 = KEYS.map((k) => k.p);
    const u0 = KEYS.map((_, i) => i / (KEYS.length - 1));
    return { P: p0, U: u0, M: monotoneSlopes(p0, u0) };
  }, []);

  const { posCurve, lookCurve } = useMemo(
    () => ({
      posCurve: new THREE.CatmullRomCurve3(
        KEYS.map((k) => new THREE.Vector3(...k.pos)),
        false,
        "catmullrom",
        0.5,
      ),
      lookCurve: new THREE.CatmullRomCurve3(
        KEYS.map((k) => new THREE.Vector3(...k.look)),
        false,
        "catmullrom",
        0.5,
      ),
    }),
    [],
  );

  const pos = useMemo(() => new THREE.Vector3(), []);
  const look = useMemo(() => new THREE.Vector3(), []);
  const smoothLook = useMemo(() => new THREE.Vector3(...KEYS[0].look), []);

  useFrame((state, dt) => {
    const c = ch.current;
    const p = progress.current;
    const n = KEYS.length;

    // Locate the scroll segment, then evaluate the monotone cubic across it.
    let i = 0;
    while (i < n - 2 && p > P[i + 1]) i++;
    const h = P[i + 1] - P[i] || 1;
    const k = Math.min(1, Math.max(0, (p - P[i]) / h));
    const k2 = k * k;
    const k3 = k2 * k;
    const u =
      (2 * k3 - 3 * k2 + 1) * U[i] +
      (k3 - 2 * k2 + k) * h * M[i] +
      (-2 * k3 + 3 * k2) * U[i + 1] +
      (k3 - k2) * h * M[i + 1];

    posCurve.getPoint(u, pos);
    lookCurve.getPoint(u, look);

    // Focal length rides the same mapping, so it cannot kink at a boundary
    // the position sails smoothly through.
    const g = u * (n - 1);
    const gi = Math.min(n - 2, Math.max(0, Math.floor(g)));
    const gf = Math.min(1, Math.max(0, g - gi));

    // Pointer parallax: a few centimetres of drift, never a look-around.
    if (!reduced) {
      pos.x += pointer.current.x * 0.42;
      pos.y += pointer.current.y * 0.26;
    }

    camera.position.copy(pos);

    // Damp the look target so fast scrolling cannot snap the framing around.
    // This sits on top of the driver's own damping of the playhead (~143 ms),
    // so the two compound into what the viewer feels as trail. Now that the
    // path no longer stalls at each keyframe there is less for this to hide:
    // 154 ms -> ~101 ms, which keeps the guard against a snap while giving
    // back about a fifth of a second of lag.
    const lerp = reduced ? 1 : 1 - Math.pow(0.00005, dt);
    smoothLook.lerp(look, lerp);
    camera.lookAt(smoothLook);

    const cam = camera as THREE.PerspectiveCamera;
    const fov = fitFov(
      KEYS[gi].fov + (KEYS[gi + 1].fov - KEYS[gi].fov) * gf,
      size.width / size.height,
    );
    // Scroll velocity nudges the focal length — the frame widens slightly
    // when the viewer moves fast and settles when they stop to look. It never
    // changes what happens, only how the scene reacts to being driven.
    const target = fov + Math.min(3, Math.abs(velocity.current) * 26);
    if (Math.abs(cam.fov - target) > 0.01) {
      cam.fov += (target - cam.fov) * Math.min(1, dt * 6);
      cam.updateProjectionMatrix();
    }
  });

  return null;
}
