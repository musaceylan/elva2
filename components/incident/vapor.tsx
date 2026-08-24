"use client";

import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { rng } from "@/lib/rng";
import { pixelsPerMetre } from "./px";
import { radialSprite } from "./materials";
import { useIncident, BUDGET } from "./use-incident";
import { FIRE } from "./layout";

/**
 * Smoke, steam and sparks.
 *
 * The atmosphere layer is what keeps the scene alive between events — black
 * smoke rolling off the fire before anything happens, grey vapour still
 * drifting long after it is out. All three share one shader because they are
 * the same physics with different mass: rise, spread, cool, fade.
 */

const VERT = /* glsl */ `
  attribute float aSeed;
  attribute vec3  aRand;

  uniform float uTime;
  uniform float uAmount;
  uniform float uRise;
  uniform float uSpread;
  uniform float uScale;
  uniform float uPx;
  uniform float uDrift;

  varying float vLife;
  varying float vSeed;
  varying float vDist;

  void main() {
    float speed = 0.09 + aSeed * 0.13;
    float life  = fract( uTime * speed + aSeed );

    // Density is a cull, not a fade — thinning smoke should mean fewer
    // plumes, not the same plumes going transparent.
    float alive = step( aRand.z, uAmount );

    vec3 pos = position;
    pos.y += life * uRise;
    float s = life * uSpread;
    pos.x += ( aRand.x - 0.5 ) * s + sin( life * 2.6 + aSeed * 30.0 ) * 0.5 * life * uDrift;
    pos.z += ( aRand.y - 0.5 ) * s + cos( life * 2.1 + aSeed * 21.0 ) * 0.5 * life * uDrift;

    vec4 mv = modelViewMatrix * vec4( pos, 1.0 );
    gl_Position = projectionMatrix * mv;

    float size = uScale * ( 0.5 + aRand.x ) * ( 0.35 + life * 1.5 );
    // Capped so one near particle can never wash the whole frame.
    gl_PointSize = min( alive * size * uPx / max( -mv.z, 0.1 ), 260.0 );

    vLife = life;
    vSeed = aSeed;
    vDist = -mv.z;
  }
`;

const FRAG = /* glsl */ `
  precision highp float;
  uniform sampler2D uMap;
  uniform vec3  uColor;
  uniform float uOpacity;
  uniform vec3  uGlow;
  uniform float uGlowAmt;
  varying float vLife;
  varying float vSeed;
  varying float vDist;

  void main() {
    float m = texture2D( uMap, gl_PointCoord ).a;
    float a = m * uOpacity;
    a *= smoothstep( 0.0, 0.14, vLife ) * ( 1.0 - smoothstep( 0.45, 1.0, vLife ) );
    // Anything drifting between the lens and the action dissolves rather than
    // smearing across the shot.
    a *= smoothstep( 1.4, 5.2, vDist );
    if ( a < 0.004 ) discard;

    // Soot leaving a fire is lit by it. Without this the plume is black on
    // black and the most dramatic part of the hero simply is not there.
    vec3 col = uColor * ( 0.75 + vSeed * 0.5 );
    col += uGlow * uGlowAmt * ( 1.0 - smoothstep( 0.0, 0.42, vLife ) );
    gl_FragColor = vec4( col, a );
  }
`;

type VaporProps = {
  origin: THREE.Vector3;
  count: number;
  color: string;
  radius: number;
  rise: number;
  spread: number;
  scale: number;
  opacity: number;
  channel: "smoke" | "steam";
  drift?: number;
  additive?: boolean;
  /** Start offset, so stacked layers never pulse in lockstep. */
  phase?: number;
  /** Colour the plume picks up from the fire beneath it. */
  glow?: string;
  glowStrength?: number;
};

function Vapor({
  origin, count, color, radius, rise, spread, scale, opacity, channel,
  drift = 1, additive = false, phase = 0, glow = "#ff5a12", glowStrength = 0,
}: VaporProps) {
  const { ch } = useIncident();
  const map = useMemo(() => radialSprite(), []);

  const geometry = useMemo(() => {
    const rand01 = rng(0x5ea70c);
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const seed = new Float32Array(count);
    const rand = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const a = rand01() * Math.PI * 2;
      const r = Math.sqrt(rand01()) * radius;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = rand01() * 0.3;
      pos[i * 3 + 2] = Math.sin(a) * r;
      seed[i] = rand01();
      rand[i * 3] = rand01();
      rand[i * 3 + 1] = rand01();
      rand[i * 3 + 2] = rand01();
    }
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    g.setAttribute("aRand", new THREE.BufferAttribute(rand, 3));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, rise * 0.5, 0), rise + spread + 6);
    return g;
  }, [count, radius, rise, spread]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: phase },
      uAmount: { value: 0 },
      uRise: { value: rise },
      uSpread: { value: spread },
      uScale: { value: scale },
      uOpacity: { value: opacity },
      uPx: { value: 800 },
      uDrift: { value: drift },
      uColor: { value: new THREE.Color(color) },
      uGlow: { value: new THREE.Color(glow) },
      uGlowAmt: { value: 0 },
      uMap: { value: map },
    }),
    [rise, spread, scale, opacity, drift, color, map, phase, glow],
  );

  useFrame((state, dt) => {
    const amount = ch.current[channel];
    uniforms.uTime.value += dt;
    uniforms.uAmount.value = amount;
    uniforms.uGlowAmt.value = ch.current.heat * glowStrength;
    uniforms.uPx.value = pixelsPerMetre(state);
  });

  return (
    <points position={origin} geometry={geometry} frustumCulled={false} renderOrder={1}>
      <shaderMaterial
        args={[{ uniforms, vertexShader: VERT, fragmentShader: FRAG }]}
        transparent
        depthWrite={false}
        blending={additive ? THREE.AdditiveBlending : THREE.NormalBlending}
      />
    </points>
  );
}

/** Black smoke off the seat of the fire, and the grey it decays into. */
export function Smoke() {
  const { tier } = useIncident();
  const n = BUDGET[tier].smoke;
  return (
    <>
      <Vapor
        origin={new THREE.Vector3(FIRE.x, FIRE.y + 0.6, FIRE.z)}
        count={n}
        color="#14161a"
        radius={1.1}
        rise={9.5}
        spread={2.4}
        scale={0.8}
        opacity={0.5}
        channel="smoke"
        phase={0}
        glowStrength={0.55}
      />
      <Vapor
        origin={new THREE.Vector3(FIRE.x - 0.4, FIRE.y + 2.2, FIRE.z - 0.2)}
        count={Math.round(n * 0.6)}
        color="#3d4148"
        radius={1.6}
        rise={7}
        spread={3.4}
        scale={1.15}
        opacity={0.28}
        channel="smoke"
        drift={1.6}
        phase={13.4}
        glowStrength={0.3}
      />
    </>
  );
}

/**
 * Steam. Born at the collision plane rather than at the fire, because it is
 * the product of the two meeting — that is the read the whole climax depends
 * on.
 */
export function Steam() {
  const { tier } = useIncident();
  const n = BUDGET[tier].steam;
  return (
    <>
      <Vapor
        origin={new THREE.Vector3(FIRE.x, FIRE.y + 0.9, FIRE.z)}
        count={n}
        color="#dfe6ea"
        radius={1.5}
        rise={8.5}
        spread={2.8}
        scale={0.9}
        opacity={0.3}
        channel="steam"
        drift={1.2}
        phase={5.1}
      />
      <Vapor
        origin={new THREE.Vector3(FIRE.x + 0.2, FIRE.y + 0.2, FIRE.z + 0.4)}
        count={Math.round(n * 0.5)}
        color="#ffffff"
        radius={2.2}
        rise={3.2}
        spread={4.0}
        scale={1.3}
        opacity={0.16}
        channel="steam"
        drift={2}
        phase={21.7}
      />
    </>
  );
}

/* ------------------------------------------------------------------
   Sparks — small, fast, and the first thing to stop when the agent
   arrives. Their absence is a signal in its own right.
   ------------------------------------------------------------------ */
export function Sparks() {
  const { ch, tier } = useIncident();
  const count = BUDGET[tier].spark;

  const geometry = useMemo(() => {
    const rand01 = rng(0x91be07);
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const seed = new Float32Array(count);
    const rand = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const a = rand01() * Math.PI * 2;
      const r = Math.sqrt(rand01()) * 0.8;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = 0;
      pos[i * 3 + 2] = Math.sin(a) * r;
      seed[i] = rand01();
      rand[i * 3] = rand01();
      rand[i * 3 + 1] = rand01();
      rand[i * 3 + 2] = rand01();
    }
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    g.setAttribute("aRand", new THREE.BufferAttribute(rand, 3));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 4, 0), 10);
    return g;
  }, [count]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uAmount: { value: 0 },
      uPx: { value: 800 },
    }),
    [],
  );

  useFrame((state, dt) => {
    uniforms.uTime.value += dt;
    uniforms.uAmount.value = ch.current.sparks;
    uniforms.uPx.value = pixelsPerMetre(state);
  });

  return (
    <points position={[FIRE.x, FIRE.y + 0.3, FIRE.z]} geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        args={[
          {
            uniforms,
            vertexShader: /* glsl */ `
              attribute float aSeed; attribute vec3 aRand;
              uniform float uTime; uniform float uAmount; uniform float uPx;
              varying float vLife;
              void main(){
                float life = fract( uTime * ( 0.28 + aSeed * 0.4 ) + aSeed );
                float alive = step( aRand.z, uAmount );
                vec3 pos = position;
                pos.y += life * ( 5.5 + aRand.x * 4.0 );
                pos.x += sin( life * 9.0 + aSeed * 50.0 ) * 0.8 * life;
                pos.z += cos( life * 7.0 + aSeed * 44.0 ) * 0.8 * life;
                vec4 mv = modelViewMatrix * vec4( pos, 1.0 );
                gl_Position = projectionMatrix * mv;
                // A spark is a millimetre-scale ember, not a bokeh disc.
                gl_PointSize = alive * ( 0.010 + aRand.y * 0.020 ) * uPx / max( -mv.z, 0.1 );
                vLife = life;
              }`,
            fragmentShader: /* glsl */ `
              precision highp float; varying float vLife;
              void main(){
                vec2 uv = gl_PointCoord - 0.5;
                if ( length( uv ) > 0.5 ) discard;
                float a = ( 1.0 - smoothstep( 0.25, 1.0, vLife ) ) * 0.9;
                vec3 col = mix( vec3(1.0,0.95,0.7), vec3(1.0,0.35,0.05), vLife );
                gl_FragColor = vec4( col, a );
              }`,
          },
        ]}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
