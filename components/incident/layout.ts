import * as THREE from "three";

/**
 * THE PLANT
 * =========
 *
 * One world, in metres, shared by the geometry, the camera rig, the particle
 * systems and the spatial annotations. Nothing in the film positions itself
 * independently — if the nozzles move, the spray, the labels and the camera
 * move with them.
 *
 * Layout, left to right:
 *   inlet duct → process vessel → outlet duct → isolation valve → silo
 * with the suppression manifold overhead and the HRD bottle off to the left.
 */

export const FIRE = new THREE.Vector3(2.0, 0.55, 1.7);

/* ---- process vessel ---- */
export const VESSEL = {
  center: new THREE.Vector3(0, 3.1, 0),
  radius: 1.7,
  height: 3.4,
  hopperBottom: 0.75,
  domeTop: 5.2,
};

/* ---- inlet duct: dusty air arrives here. The x-ray chapter lives inside it. ---- */
export const INLET = {
  from: new THREE.Vector3(-12.5, 3.35, 0.35),
  to: new THREE.Vector3(-1.55, 3.35, 0.35),
  radius: 0.46,
};

/* ---- outlet duct: where the pressure keeps travelling after the fire is out ---- */
export const OUTLET = {
  from: new THREE.Vector3(1.55, 1.75, -0.3),
  to: new THREE.Vector3(11.5, 1.75, -0.3),
  radius: 0.4,
};

export const VALVE = new THREE.Vector3(6.4, 1.75, -0.3);
export const SILO = new THREE.Vector3(13.6, 2.6, -0.3);
export const RELIEF = new THREE.Vector3(0, 5.3, 0);

/**
 * The framing pipe. It exists only to sit between the camera and the
 * incident in the opening shot — depth is what puts the viewer inside the
 * plant instead of in front of a diagram. Low and close, so it crosses the
 * bottom of the frame rather than blocking it.
 */
export const FOREGROUND = {
  from: new THREE.Vector3(-18, 0.62, 8.0),
  to: new THREE.Vector3(18, 0.62, 8.0),
  radius: 0.44,
};

/* ---- suppression side ---- */
export const HRD = new THREE.Vector3(-5.6, 1.55, 1.9);
export const MANIFOLD_Y = 6.35;
export const MANIFOLD = {
  from: new THREE.Vector3(-5.6, MANIFOLD_Y, 1.9),
  to: new THREE.Vector3(5.2, MANIFOLD_Y, 1.9),
  radius: 0.2,
};

export type Nozzle = { pos: THREE.Vector3; dir: THREE.Vector3; delay: number };

/**
 * Five nozzles on the manifold. They do not all point straight down — the
 * ones nearest the seat of the fire are angled into it, which is what makes
 * the collision read as aimed rather than incidental.
 */
export const NOZZLES: Nozzle[] = [-4.1, -2.0, 0.2, 2.3, 4.2].map((x, i) => {
  const pos = new THREE.Vector3(x, MANIFOLD_Y - 0.62, 1.9);
  const dir = FIRE.clone().sub(pos).normalize().lerp(new THREE.Vector3(0, -1, 0), 0.34).normalize();
  return { pos, dir, delay: i * 0.13 };
});

/* ---- instrumentation ---- */
export const FLAME_DET = new THREE.Vector3(4.5, 4.3, 3.0);
export const SPARK_DET = new THREE.Vector3(-7.4, 3.9, 0.35);
export const PRESS_DET = new THREE.Vector3(1.75, 4.2, 0.55);
export const PANEL = new THREE.Vector3(-7.8, 1.5, 3.3);

/**
 * The signal path: what the detector sees has to physically travel to the
 * controller. Routed through the cable tray rather than cutting across space,
 * because that is how a real plant is wired.
 */
export const SIGNAL_PATH = new THREE.CatmullRomCurve3([
  FLAME_DET.clone().add(new THREE.Vector3(0, -0.25, 0)),
  new THREE.Vector3(4.4, 5.6, 3.1),
  new THREE.Vector3(0.5, 5.85, 3.4),
  new THREE.Vector3(-4.5, 5.7, 3.4),
  new THREE.Vector3(-7.7, 4.4, 3.35),
  PANEL.clone().add(new THREE.Vector3(0.1, 0.9, 0.2)),
]);

/** HRD bottle → manifold → the far nozzle. The agent's route through steel. */
export const AGENT_PATH = new THREE.CatmullRomCurve3([
  HRD.clone().add(new THREE.Vector3(0, 1.15, 0)),
  new THREE.Vector3(-5.6, MANIFOLD_Y - 0.5, 1.9),
  new THREE.Vector3(-5.35, MANIFOLD_Y, 1.9),
  new THREE.Vector3(-2.0, MANIFOLD_Y, 1.9),
  new THREE.Vector3(2.3, MANIFOLD_Y, 1.9),
  new THREE.Vector3(5.05, MANIFOLD_Y, 1.9),
]);

/** Pressure leaving the vessel, heading for the next unit down the line. */
export const WAVE_PATH = new THREE.CatmullRomCurve3([
  OUTLET.from.clone(),
  new THREE.Vector3(3.5, 1.75, -0.3),
  VALVE.clone(),
  new THREE.Vector3(9.0, 1.75, -0.3),
  OUTLET.to.clone(),
]);

/** Samples a curve to a flat array once, so per-frame lookups are a lerp. */
export function sampleCurve(curve: THREE.Curve<THREE.Vector3>, n = 512): Float32Array {
  const out = new Float32Array(n * 3);
  const v = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    curve.getPointAt(i / (n - 1), v);
    out[i * 3] = v.x;
    out[i * 3 + 1] = v.y;
    out[i * 3 + 2] = v.z;
  }
  return out;
}

/** Reads a sampled curve at u ∈ [0,1] into `target`. */
export function readCurve(samples: Float32Array, u: number, target: THREE.Vector3) {
  const n = samples.length / 3 - 1;
  const f = Math.min(Math.max(u, 0), 1) * n;
  const i = Math.floor(f);
  const j = Math.min(i + 1, n);
  const k = f - i;
  target.set(
    samples[i * 3] + (samples[j * 3] - samples[i * 3]) * k,
    samples[i * 3 + 1] + (samples[j * 3 + 1] - samples[i * 3 + 1]) * k,
    samples[i * 3 + 2] + (samples[j * 3 + 2] - samples[i * 3 + 2]) * k,
  );
  return target;
}
