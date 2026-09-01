"use client";

import { useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useIncident } from "./use-incident";

/**
 * THE CAMERA
 * ==========
 *
 * A virtual camera on rails, not an orbit control. Seventeen keyframes carry
 * it from a foreground pipe in a near-black plant, through the detector, down
 * the cable tray, along the inside of the suppression manifold, back for the
 * collision, then out to the full facility.
 *
 * Keyframes are unevenly spaced in scroll — the collision gets far more
 * distance than the approach — so scroll position is mapped onto the spline
 * parameter by its own curve rather than handed over raw. That keeps the
 * film's pacing while letting the Catmull-Rom stay smooth.
 *
 * That mapping has to be C1. An early version smoothstepped the weight inside
 * each segment, which pins the camera's velocity to zero at every keyframe:
 * measured across the film it produced a 76,000:1 spread between the slowest
 * and fastest points, so the camera stopped dead seventeen times and lurched
 * between. A monotone cubic through the same keyframes holds each one at the
 * same scroll position but carries continuous velocity across it.
 *
 *
 * WHERE THE MOTION ACTUALLY HURT
 * ------------------------------
 * All of the above governs the camera *body*. Its aim was never authored at
 * all — orientation fell out of lookAt() of one Catmull-Rom minus another, so
 * angular velocity was the derivative of a difference of two splines and
 * nobody controlled it. Measured across the film that ran to a 13.5:1 spread,
 * peaking at 2,128 deg per unit scroll where the worst *authored* key-to-key
 * turn only asks for 1,328 — the extra 60% was spline artifact, rotation the
 * shot list never called for. At a normal scroll flick the manifold-to-
 * collision move slewed about 345 deg/second. That is the swim, and no amount
 * of smoothing the position curve could reach it.
 *
 * So aim is now its own track: a quaternion per keyframe, slerped. Rotation
 * goes exactly key to key with nothing added, and its ease is separate from
 * the body's, set to settle the frame before the dolly finishes — the shot
 * composes and holds still while the last of the move runs out under it.
 *
 *
 * HOLD, MOVE, HOLD
 * ----------------
 * Removing the smoothstep left the camera never at rest anywhere in fifteen
 * screens, which is its own failure: a frame that is always drifting is never
 * quite readable. The fix is not to put the zero-velocity points back. It is
 * to give the keyframes that deserve a beat a *plateau* — the camera parks on
 * the composed frame for a real fraction of the segment while the event keeps
 * animating, then leaves. A stall is a zero-width stop; a held shot is a wide
 * one. Keys that are only passed through keep derivative 1 at their boundary
 * and stay exactly as continuous as they are today.
 */

type Key = {
  p: number;
  pos: [number, number, number];
  look: [number, number, number];
  fov: number;
  /**
   * Fraction of each adjacent segment this frame is held at rest. 0 (the
   * default) flows straight through and preserves C1 continuity across the
   * key; anything above 0 is a deliberate beat and stops the camera there.
   */
  hold?: number;
};

const KEYS: Key[] = [
  // opening: already inside the incident, fire low and right behind steel
  { p: 0.0, pos: [3.4, 2.5, 10.6], look: [1.1, 1.9, 1.7], fov: 42 },
  { p: 0.075, pos: [3.0, 2.2, 8.2], look: [1.6, 1.5, 1.7], fov: 40 },
  // escalation: push in on the seat of the fire
  { p: 0.14, pos: [3.0, 1.85, 6.4], look: [2.0, 1.2, 1.7], fov: 38 },
  // x-ray: swing to the inlet duct and look into it
  { p: 0.205, pos: [-2.6, 3.6, 5.6], look: [-4.2, 3.35, 0.6], fov: 36, hold: 0.12 },
  // detection: the detector, aimed back at the fire. The 15 ms decision is
  // the thesis of the whole film — it gets the longest beat in the reel.
  { p: 0.27, pos: [5.4, 4.6, 5.2], look: [4.5, 4.2, 3.0], fov: 32, hold: 0.18 },
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
  { p: 0.62, pos: [7.2, 4.1, 12.8], look: [2.2, 2.0, 1.7], fov: 40, hold: 0.16 },
  { p: 0.7, pos: [6.4, 3.5, 11.0], look: [2.1, 1.7, 1.7], fov: 38, hold: 0.18 },
  // the last flame
  { p: 0.755, pos: [3.9, 1.45, 6.2], look: [2.05, 0.85, 1.7], fov: 27, hold: 0.14 },
  // aftermath: slow float over wet steel
  { p: 0.8, pos: [2.6, 3.6, 10.0], look: [1.2, 2.0, 1.2], fov: 44 },
  // pressure heading down the outlet
  { p: 0.865, pos: [5.6, 2.6, 4.2], look: [6.4, 1.75, -0.3], fov: 38 },
  // relief: rise up the vessel
  { p: 0.912, pos: [3.0, 5.4, 5.4], look: [0.2, 5.4, 0.0], fov: 42, hold: 0.12 },
  // the pull-back
  { p: 0.95, pos: [4.0, 6.4, 15.0], look: [1.0, 3.6, 0.0], fov: 46 },
  { p: 1.0, pos: [6.5, 10.5, 30.0], look: [1.5, 3.4, -0.5], fov: 50, hold: 0.15 },
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
 * Dwell remap across one segment: rest for `a` at the head, rest for `b` at
 * the tail, transit the middle.
 *
 * The easing is chosen per end, not applied wholesale, and that asymmetry is
 * the entire point. An end with a plateau leaves and enters it at zero
 * derivative, so the camera settles onto the held frame instead of arriving
 * at it. An end without one keeps derivative exactly 1, which hands the
 * monotone cubic back the continuity it was built for — a symmetric
 * smoothstep here would re-create the original stall at every keyframe,
 * including the ones meant to be passed straight through.
 */
function dwell(k: number, a: number, b: number): number {
  const span = 1 - a - b;
  if (span <= 0) return k;
  if (k <= a) return 0;
  if (k >= 1 - b) return 1;
  const t = (k - a) / span;
  if (a > 0 && b > 0) return t * t * (3 - 2 * t); // rest -> rest
  if (a > 0) return t * t * (2 - t); // rest -> running (f'(1) = 1)
  if (b > 0) return t * (1 + t * (1 - t)); // running -> rest (f'(0) = 1)
  return t;
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

/**
 * How much of a segment's tail the aim has already finished by. Rotation
 * reaching its mark before the body does is what makes a move read as
 * composed rather than as drift: the frame locks, then the last of the dolly
 * runs out underneath it.
 *
 * It has to be spent where there is room for it. Settling early compresses
 * the same turn into less of the segment, so the peak rate rises by about
 * half again — cheap on a shot that barely turns, ruinous on one that already
 * slews. Measured, it was adding ~1.6x to the three worst moves in the film,
 * which are exactly the ones that could least afford it. So the allowance
 * fades out as the segment's authored turn rate climbs, and above SLEW_MAX
 * the aim simply runs at a constant rate across the whole segment: for a turn
 * this big, even sweep is the calmest way through it that still arrives.
 */
const AIM_SETTLE = 0.14;
const SLEW_MAX = 600; // deg per unit scroll

const UP = new THREE.Vector3(0, 1, 0);

export function CameraRig() {
  const { p: progress, v: velocity, pointer, reduced } = useIncident();
  const { camera, size } = useThree();

  // Knots for the scroll -> spline-parameter mapping. Key i sits at u = i/(n-1).
  const { P, U, M } = useMemo(() => {
    const p0 = KEYS.map((k) => k.p);
    const u0 = KEYS.map((_, i) => i / (KEYS.length - 1));
    return { P: p0, U: u0, M: monotoneSlopes(p0, u0) };
  }, []);

  const posCurve = useMemo(
    () =>
      new THREE.CatmullRomCurve3(
        KEYS.map((k) => new THREE.Vector3(...k.pos)),
        false,
        "catmullrom",
        0.5,
      ),
    [],
  );

  /**
   * One orientation per keyframe, built from the aim that key was composed
   * with. Neighbours are sign-matched so every slerp takes the short arc — an
   * unmatched pair spins the camera the long way round and reads as a fault.
   */
  const quats = useMemo(() => {
    const m = new THREE.Matrix4();
    const eye = new THREE.Vector3();
    const at = new THREE.Vector3();
    const out = KEYS.map((k) => {
      m.lookAt(eye.set(...k.pos), at.set(...k.look), UP);
      return new THREE.Quaternion().setFromRotationMatrix(m);
    });
    for (let i = 1; i < out.length; i++) {
      if (out[i].dot(out[i - 1]) < 0) {
        out[i].set(-out[i].x, -out[i].y, -out[i].z, -out[i].w);
      }
    }
    return out;
  }, []);

  /** Per-segment settle allowance, priced off how hard that segment turns. */
  const settle = useMemo(
    () =>
      quats.slice(0, -1).map((q, i) => {
        const turn = (2 * Math.acos(Math.min(1, Math.abs(q.dot(quats[i + 1])))) * 180) / Math.PI;
        const rate = turn / (KEYS[i + 1].p - KEYS[i].p);
        return AIM_SETTLE * Math.max(0, Math.min(1, (SLEW_MAX - rate) / SLEW_MAX));
      }),
    [quats],
  );

  const pos = useMemo(() => new THREE.Vector3(), []);
  const aim = useMemo(() => new THREE.Quaternion(), []);
  const smoothAim = useMemo(() => quats[0].clone(), [quats]);

  useFrame((_state, dt) => {
    const p = progress.current;
    const n = KEYS.length;

    // Locate the scroll segment, then evaluate the monotone cubic across it.
    let i = 0;
    while (i < n - 2 && p > P[i + 1]) i++;
    const h = P[i + 1] - P[i] || 1;
    const k = Math.min(1, Math.max(0, (p - P[i]) / h));

    // Beats at either end of this segment, kept clear of each other so a
    // pair of adjacent holds can never swallow the transit between them.
    let a = KEYS[i].hold ?? 0;
    let b = KEYS[i + 1].hold ?? 0;
    if (a + b > 0.62) {
      const s = 0.62 / (a + b);
      a *= s;
      b *= s;
    }

    const kb = dwell(k, a, b);
    const kb2 = kb * kb;
    const kb3 = kb2 * kb;
    const u =
      (2 * kb3 - 3 * kb2 + 1) * U[i] +
      (kb3 - 2 * kb2 + kb) * h * M[i] +
      (-2 * kb3 + 3 * kb2) * U[i + 1] +
      (kb3 - kb2) * h * M[i + 1];

    posCurve.getPoint(u, pos);

    // Aim runs on the same beats but finishes early, so the frame is composed
    // and still while the body is still closing the last of the distance.
    const ka = dwell(k, a, Math.max(b, settle[i]));
    aim.copy(quats[i]).slerp(quats[i + 1], ka);

    // Focal length rides the body's mapping, so it cannot kink at a boundary
    // the position sails smoothly through, and it holds through every beat.
    const g = u * (n - 1);
    const gi = Math.min(n - 2, Math.max(0, Math.floor(g)));
    const gf = Math.min(1, Math.max(0, g - gi));

    // Pointer parallax: a few centimetres of drift, never a look-around. It
    // moves the body only — letting it swing the aim as well would put an
    // uncomposed rotation back on top of an authored one.
    if (!reduced) {
      pos.x += pointer.current.x * 0.42;
      pos.y += pointer.current.y * 0.26;
    }

    camera.position.copy(pos);

    // Damp the aim so fast scrolling cannot snap the framing around. This sits
    // on top of the driver's own damping of the playhead (~143 ms), so the two
    // compound into what the viewer feels as trail. With rotation authored
    // rather than derived there is far less left for it to hide: ~101 ms ->
    // ~87 ms, still a guard against the snap, a little less lag.
    const t = reduced ? 1 : 1 - Math.pow(0.00001, dt);
    smoothAim.slerp(aim, t);
    camera.quaternion.copy(smoothAim);

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
