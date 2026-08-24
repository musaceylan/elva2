/**
 * The pressure–time model behind the incident.
 *
 * Every explosion-protection datasheet plots this curve, so it is the one
 * piece of physics the whole site is built on. Unprotected, a dust
 * deflagration drives vessel pressure to Pmax and the vessel fails. With
 * suppression, detection happens on dP/dt within milliseconds and pressure
 * is clamped at Pred, well under the vessel's design strength.
 *
 * Shared by the in-scene telemetry HUD and the standalone datasheet chart so
 * the two can never disagree.
 */

export const T_MAX = 300; // ms — the whole event
export const P_MAX_AXIS = 10; // bar — chart ceiling
export const P_DESIGN = 1.2; // bar — vessel design strength
export const P_RED = 0.55; // bar — suppressed peak
export const T_DETECT = 15; // ms — dP/dt threshold crossed, decision made
export const T_SUPPRESS = 55; // ms — Pred reached

/** Unprotected deflagration: pressure runs away to Pmax. */
export function pUnprotected(t: number): number {
  return 9 * (1 - Math.exp(-Math.pow(Math.max(t, 0) / 120, 2.2)));
}

/** With HRD suppression: the rise is cut short and clamped at Pred. */
export function pProtected(t: number): number {
  const base = pUnprotected(T_DETECT);
  if (t <= T_DETECT) return pUnprotected(t);
  const k = (t - T_DETECT) / (T_SUPPRESS - T_DETECT);
  const shape = k * Math.exp(1 - k);
  return base + (P_RED - base) * shape;
}

/** Samples a model into an SVG path within the supplied plot box. */
export function buildPath(
  fn: (t: number) => number,
  sx: (t: number) => number,
  sy: (p: number) => number,
  steps = 200,
): string {
  let d = "";
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * T_MAX;
    d += `${i === 0 ? "M" : "L"}${sx(t).toFixed(2)} ${sy(fn(t)).toFixed(2)}`;
  }
  return d;
}
