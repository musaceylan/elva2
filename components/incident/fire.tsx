"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { rng } from "@/lib/rng";
import { pixelsPerMetre } from "./px";
import { useIncident, BUDGET } from "./use-incident";
import { FIRE, NOZZLES } from "./layout";

/**
 * THE FIRE
 * ========
 *
 * The one thing on this site that has to be believable. It is a GPU particle
 * system, not a sprite loop, because the fire has to *lose* — it has to bend
 * away from the suppressant, break into separate pockets, and give up those
 * pockets one at a time from the outside in, leaving one stubborn flame at
 * the centre.
 *
 * That is why death order is baked into the geometry: each particle carries
 * `aRank`, derived from how far it sits from the seat of the fire. The shader
 * kills every particle whose rank exceeds the current fire level, so a single
 * falling number collapses the flame envelope inward exactly the way water
 * actually beats a fire back.
 */

/* Direction the agent pushes the flame — derived from where the nozzles
   actually are, so aiming the spray elsewhere would bend the fire elsewhere. */
const BEND = (() => {
  const v = new THREE.Vector3();
  for (const n of NOZZLES) v.add(FIRE.clone().sub(n.pos));
  v.divideScalar(NOZZLES.length);
  v.y = -0.35;
  return v.normalize();
})();

const VERT = /* glsl */ `
  attribute float aSeed;
  attribute float aRank;
  attribute vec3  aPocket;
  attribute vec3  aRand;

  uniform float uTime;
  uniform float uFire;
  uniform float uChaos;
  uniform float uPockets;
  uniform float uBend;
  uniform vec3  uBendDir;
  uniform float uScale;
  uniform float uPx;

  varying float vLife;
  varying float vHeat;

  void main() {
    // Each particle runs its own loop; the spread of speeds is what stops
    // the column reading as a single pulsing blob.
    float speed = 0.34 + aSeed * 0.5;
    float life  = fract( uTime * speed + aSeed );

    // Alive only while the fire is still big enough to reach this particle's
    // rank. Outer ranks go first.
    float alive = step( aRank, uFire );

    vec3 pos = position;

    // Flame pockets pull apart as the fire is broken up. Pocket 0 has a zero
    // offset, so the last flame stays where the fire started.
    pos += aPocket * uPockets;

    // Rise, tapering inward the way a diffusion flame necks down.
    float rise = life * ( 1.15 + 2.6 * uFire );
    pos.xz *= mix( 1.0, 0.42, life );
    pos.y  += rise;

    // Turbulence grows with the fire and dies with it.
    float turb = uChaos * life;
    pos.x += sin( life * 6.1 + aSeed * 41.0 + uTime * 1.7 ) * 0.34 * turb;
    pos.z += cos( life * 5.3 + aSeed * 33.0 + uTime * 1.3 ) * 0.34 * turb;

    // Suppressant impact: the flame folds over instead of simply shrinking.
    pos += uBendDir * uBend * ( 0.35 + life * 1.5 ) * ( 0.6 + aRand.x );

    vec4 mv = modelViewMatrix * vec4( pos, 1.0 );
    gl_Position = projectionMatrix * mv;

    float size = uScale * ( 0.4 + aRand.y * 0.9 ) * ( 0.55 + 0.75 * uFire );
    gl_PointSize = min( alive * size * uPx / max( -mv.z, 0.1 ), 240.0 );

    vLife = life;
    vHeat = uFire;
  }
`;

const FRAG = /* glsl */ `
  precision highp float;
  uniform float uOpacity;
  varying float vLife;
  varying float vHeat;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length( uv );
    if ( d > 0.5 ) discard;

    float a = smoothstep( 0.5, 0.05, d );

    // Temperature ramp: white-hot at the base, orange through the body,
    // deep red as it cools into smoke.
    vec3 core = vec3( 1.00, 0.94, 0.76 );
    vec3 mid  = vec3( 1.00, 0.46, 0.07 );
    vec3 deep = vec3( 0.55, 0.08, 0.02 );

    vec3 col = mix( core, mid, smoothstep( 0.0, 0.32, vLife ) );
    col = mix( col, deep, smoothstep( 0.32, 0.95, vLife ) );

    // A weak fire loses its white core first.
    col = mix( deep * 1.3, col, clamp( vHeat * 1.4, 0.0, 1.0 ) );

    a *= 1.0 - smoothstep( 0.5, 1.0, vLife );
    a *= smoothstep( 0.0, 0.08, vLife );
    gl_FragColor = vec4( col, a * uOpacity );
  }
`;

export function Fire() {
  const { ch, tier } = useIncident();
  const count = BUDGET[tier].fire;
  const mat = useRef<THREE.ShaderMaterial>(null);

  const geometry = useMemo(() => {
    const rand01 = rng(0x1f1e33);
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const seed = new Float32Array(count);
    const rank = new Float32Array(count);
    const pocket = new Float32Array(count * 3);
    const rand = new Float32Array(count * 3);

    // Five pockets. Pocket 0 sits at the origin and never moves — it is the
    // flame that survives to the end of the sequence.
    const pockets = [
      [0, 0, 0],
      [-0.95, 0.1, 0.35],
      [0.85, 0.05, -0.4],
      [-0.4, 0.15, -0.8],
      [0.55, 0.2, 0.75],
    ];

    const R = 0.95;
    for (let i = 0; i < count; i++) {
      // Base positions on a disc, denser toward the middle.
      const a = rand01() * Math.PI * 2;
      const r = Math.sqrt(rand01()) * R;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = rand01() * 0.18;
      pos[i * 3 + 2] = Math.sin(a) * r * 0.8;

      seed[i] = rand01();

      // Death order: the edge of the fire goes first, the seat goes last.
      rank[i] = Math.min(0.999, (r / R) * 0.82 + rand01() * 0.18);

      const pk = pockets[i % pockets.length];
      // Only the outer ranks get pulled into satellite pockets; the core
      // stays as one mass.
      const w = Math.min(1, rank[i] * 1.4);
      pocket[i * 3] = pk[0] * w;
      pocket[i * 3 + 1] = pk[1] * w;
      pocket[i * 3 + 2] = pk[2] * w;

      rand[i * 3] = rand01();
      rand[i * 3 + 1] = rand01();
      rand[i * 3 + 2] = rand01();
    }

    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    g.setAttribute("aRank", new THREE.BufferAttribute(rank, 1));
    g.setAttribute("aPocket", new THREE.BufferAttribute(pocket, 3));
    g.setAttribute("aRand", new THREE.BufferAttribute(rand, 3));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 2, 0), 8);
    return g;
  }, [count]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uFire: { value: 0.55 },
      uChaos: { value: 0.3 },
      uPockets: { value: 0 },
      uBend: { value: 0 },
      uBendDir: { value: BEND },
      // Metres. Small and numerous: a flame is structure, and big soft
      // discs read as bokeh no matter how good the colour ramp is.
      uScale: { value: tier === "high" ? 0.105 : 0.16 },
      uOpacity: { value: 1 },
      uPx: { value: 800 },
    }),
    [tier],
  );

  useFrame((state, dt) => {
    const c = ch.current;
    const u = uniforms;
    u.uTime.value += dt * (0.55 + c.fireChaos * 0.5);
    u.uFire.value = c.fire;
    u.uChaos.value = 0.35 + c.fireChaos * 0.85;
    u.uPockets.value = c.firePockets;
    u.uBend.value = c.fireBend * 0.85;
    u.uPx.value = pixelsPerMetre(state);
    u.uOpacity.value = Math.min(1, c.fire * 3.2);
    if (mat.current) mat.current.visible = c.fire > 0.002;
  });

  return (
    <points position={FIRE} geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={mat}
        args={[{ uniforms, vertexShader: VERT, fragmentShader: FRAG }]}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/**
 * The glow the fire throws onto the scene. Cheaper and steadier than a bloom
 * pass, and it keeps the whole film inside a single render target.
 */
export function FireGlow() {
  const { ch } = useIncident();
  const ref = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(() => ({ uAlpha: { value: 0.5 }, uTint: { value: new THREE.Color("#ff7a1e") } }), []);

  useFrame((state) => {
    const c = ch.current;
    const t = state.clock.elapsedTime;
    const flicker = 0.86 + Math.sin(t * 13.7) * 0.09 + Math.sin(t * 31.3) * 0.05;
    if (ref.current) {
      const s = (2.4 + c.fire * 4.2) * flicker;
      ref.current.scale.setScalar(s);
      ref.current.quaternion.copy(state.camera.quaternion);
      ref.current.visible = c.heat > 0.004;
    }
    uniforms.uAlpha.value = c.heat * 0.34 * flicker;
  });

  return (
    <mesh ref={ref} position={[FIRE.x, FIRE.y + 0.9, FIRE.z]} renderOrder={2}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        ref={mat}
        args={[
          {
            uniforms,
            vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
            fragmentShader: `
              precision highp float;
              uniform float uAlpha; uniform vec3 uTint; varying vec2 vUv;
              void main(){
                float d = length( vUv - 0.5 ) * 2.0;
                float a = pow( max( 0.0, 1.0 - d ), 2.6 );
                gl_FragColor = vec4( uTint, a * uAlpha );
              }`,
          },
        ]}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}
