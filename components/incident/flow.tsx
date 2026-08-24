"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { rng } from "@/lib/rng";
import { pixelsPerMetre } from "./px";
import { readCurve, sampleCurve } from "./layout";
import { useIncident, type IncidentClock } from "./use-incident";
import type { Channels } from "./timeline";

/**
 * FLOW THROUGH STEEL
 * ==================
 *
 * The x-ray only means something if there is something to see inside. This
 * drives every contained flow in the film off one mechanism: a curve sampled
 * once, a head position from the timeline, and a tail of particles trailing
 * behind it inside the pipe bore.
 *
 * It is used four times — the pressure wave inside the inlet duct, the
 * electrical pulse down the cable tray, the suppressant racing along the
 * manifold, and the residual pressure heading for the isolation valve. Same
 * physics, different mass and colour, which is exactly the relationship those
 * four things have in the real system.
 */

export type FlowProps = {
  curve: THREE.Curve<THREE.Vector3>;
  count: number;
  /** Bore radius the flow is confined to. */
  radius: number;
  color: string;
  size: number;
  /** How far behind the head the tail reaches, in curve fraction. */
  tail: number;
  head: (c: Channels) => number;
  on: (c: Channels) => number;
  additive?: boolean;
  /** Turbulence across the bore, 0 = laminar. */
  churn?: number;
  /**
   * How fast the medium moves through its own tail. With a stationary head
   * this alone produces a continuous stream; with a moving head it is the
   * churn behind an advancing front.
   */
  speed?: number;
};

export function Flow({
  curve, count, radius, color, size, tail, head, on, additive = true, churn = 1, speed = 0.4,
}: FlowProps) {
  const { ch } = useIncident();
  const pointsRef = useRef<THREE.Points>(null);

  const samples = useMemo(() => sampleCurve(curve, 512), [curve]);

  const { geometry, offsets, jitter } = useMemo(() => {
    const rand01 = rng(0x7c3fa9);
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const rand = new Float32Array(count);
    const offs = new Float32Array(count);
    const jit = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // Bias the tail so the flow front is dense and it thins out behind —
      // a pressure front, not an evenly spaced conveyor of dots.
      offs[i] = Math.pow(rand01(), 0.6);
      const a = rand01() * Math.PI * 2;
      const r = Math.sqrt(rand01());
      jit[i * 3] = Math.cos(a) * r;
      jit[i * 3 + 1] = Math.sin(a) * r;
      jit[i * 3 + 2] = rand01();
      rand[i] = 0.45 + rand01() * 0.9;
      pos[i * 3 + 1] = -9999;
    }
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aRand", new THREE.BufferAttribute(rand, 1));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 4, 0), 60);
    return { geometry: g, offsets: offs, jitter: jit };
  }, [count]);

  const uniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color(color) },
      uSize: { value: size },
      uOpacity: { value: 0 },
      uPx: { value: 800 },
    }),
    [color, size],
  );

  const tmp = useMemo(() => new THREE.Vector3(), []);
  const tmpB = useMemo(() => new THREE.Vector3(), []);
  const phase = useRef(0);

  useFrame((state, dt) => {
    const c = ch.current;
    phase.current = (phase.current + dt * speed) % 1;
    const amount = on(c);
    uniforms.uOpacity.value = amount;
    uniforms.uPx.value = pixelsPerMetre(state);

    const pts = pointsRef.current;
    if (!pts) return;
    pts.visible = amount > 0.004;
    if (!pts.visible) return;

    const h = head(c);
    const attr = geometry.getAttribute("position") as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    const t = state.clock.elapsedTime;

    for (let i = 0; i < count; i++) {
      // Offsets advance so the medium flows through its own tail rather than
      // sitting frozen behind the front.
      const o = (offsets[i] + phase.current) % 1;
      const u = h - o * tail;
      if (u < 0 || u > 1) {
        arr[i * 3 + 1] = -9999;
        continue;
      }
      readCurve(samples, u, tmp);
      // A second sample just ahead gives the local direction, so the bore
      // offset is applied across the pipe rather than along it.
      readCurve(samples, Math.min(1, u + 0.004), tmpB);
      tmpB.sub(tmp).normalize();

      // Any axis not parallel to the flow works as a basis seed.
      const ax = Math.abs(tmpB.y) > 0.9 ? 1 : 0;
      const nx = ax === 1 ? tmpB.z : tmpB.y;
      const ny = ax === 1 ? 0 : -tmpB.x;
      const nz = ax === 1 ? -tmpB.x : 0;
      const nl = Math.hypot(nx, ny, nz) || 1;
      const bx = nx / nl, by = ny / nl, bz = nz / nl;
      const cx = tmpB.y * bz - tmpB.z * by;
      const cy = tmpB.z * bx - tmpB.x * bz;
      const cz = tmpB.x * by - tmpB.y * bx;

      const swirl = churn * 0.35 * Math.sin(t * 6 + jitter[i * 3 + 2] * 30 + u * 24);
      const jx = jitter[i * 3] * (1 + swirl);
      const jy = jitter[i * 3 + 1] * (1 + swirl);

      arr[i * 3] = tmp.x + (bx * jx + cx * jy) * radius;
      arr[i * 3 + 1] = tmp.y + (by * jx + cy * jy) * radius;
      arr[i * 3 + 2] = tmp.z + (bz * jx + cz * jy) * radius;
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} geometry={geometry} frustumCulled={false} renderOrder={3}>
      <shaderMaterial
        args={[
          {
            uniforms,
            vertexShader: /* glsl */ `
              attribute float aRand;
              uniform float uSize; uniform float uPx;
              varying float vR;
              void main(){
                vec4 mv = modelViewMatrix * vec4( position, 1.0 );
                gl_Position = projectionMatrix * mv;
                gl_PointSize = uSize * aRand * uPx / max( -mv.z, 0.1 );
                vR = aRand;
              }`,
            fragmentShader: /* glsl */ `
              precision highp float;
              uniform vec3 uColor; uniform float uOpacity; varying float vR;
              void main(){
                vec2 uv = gl_PointCoord - 0.5;
                float d = length( uv );
                if ( d > 0.5 ) discard;
                float a = smoothstep( 0.5, 0.02, d ) * uOpacity * ( 0.5 + vR * 0.5 );
                gl_FragColor = vec4( uColor, a );
              }`,
          },
        ]}
        transparent
        depthWrite={false}
        blending={additive ? THREE.AdditiveBlending : THREE.NormalBlending}
      />
    </points>
  );
}

/** Convenience accessor factories, so call sites stay declarative. */
export const chan =
  (k: keyof Channels) =>
  (c: Channels): number =>
    c[k] as number;

export type { IncidentClock };
