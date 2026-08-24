"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { rng } from "@/lib/rng";
import { pixelsPerMetre } from "./px";
import { radialSprite } from "./materials";
import { useIncident, BUDGET } from "./use-incident";
import { NOZZLES, FIRE } from "./layout";

/**
 * THE DISCHARGE
 * =============
 *
 * Five nozzles firing high-pressure mist at one seat of fire. The nozzles do
 * not all open together — each carries a delay, so pressure arrives along the
 * manifold and the discharge builds across the frame rather than switching on.
 *
 * Particles are killed at the fire radius instead of flying through it: the
 * spray has to *stop* where the flame is, which is what sells the collision
 * as an impact rather than two effects overlapping.
 */

const VERT = /* glsl */ `
  attribute vec3  aOrigin;
  attribute vec3  aDir;
  attribute vec3  aPerp;
  attribute float aDelay;
  attribute float aSeed;
  attribute vec3  aRand;

  uniform float uTime;
  uniform float uDischarge;
  uniform float uPrime;
  uniform float uReach;
  uniform float uSpread;
  uniform float uScale;
  uniform float uPx;
  uniform vec3  uImpact;
  uniform float uImpactR;

  varying float vLife;
  varying float vHit;
  varying float vDist;

  void main() {
    // Nozzles open in sequence as pressure reaches them.
    float open = smoothstep( aDelay * 0.22, aDelay * 0.22 + 0.3, uDischarge );

    // Before release, a handful of particles bead at the tip.
    float prime = uPrime * step( aRand.z, 0.12 );
    float power = max( open * uDischarge, prime * 0.06 );

    float speed = 0.55 + aSeed * 0.55;
    float life  = fract( uTime * speed + aSeed );
    float alive = step( aRand.z, power * 1.15 );

    float travel = life * uReach * ( 0.45 + power * 0.75 );
    vec3 pos = aOrigin + aDir * travel;

    // Cone spread, widening downstream the way an atomising nozzle does.
    float w = uSpread * life * ( 0.35 + aRand.x );
    pos += aPerp * w * sin( aSeed * 44.0 );
    pos += normalize( cross( aDir, aPerp ) ) * w * cos( aSeed * 37.0 );

    // Scatter on contact: inside the fire radius the mist breaks up and
    // deflects instead of passing through.
    float dHit = distance( pos, uImpact );
    float hit = 1.0 - smoothstep( uImpactR * 0.55, uImpactR, dHit );
    pos += normalize( pos - uImpact + vec3( 0.001 ) ) * hit * ( 0.5 + aRand.y ) * 0.9;
    pos.y += hit * life * 1.6;

    vec4 mv = modelViewMatrix * vec4( pos, 1.0 );
    gl_Position = projectionMatrix * mv;

    float size = uScale * ( 0.45 + aRand.y * 1.0 ) * ( 0.35 + life * 1.4 ) * ( 0.4 + power );
    gl_PointSize = min( alive * size * uPx / max( -mv.z, 0.1 ), 200.0 );

    vLife = life;
    vHit = hit;
    vDist = -mv.z;
  }
`;

const FRAG = /* glsl */ `
  precision highp float;
  uniform sampler2D uMap;
  uniform float uOpacity;
  varying float vLife;
  varying float vHit;
  varying float vDist;

  void main() {
    float m = texture2D( uMap, gl_PointCoord ).a;
    // Cold white at the tip, warming very slightly where it meets the flame.
    vec3 cold = vec3( 0.88, 0.95, 1.00 );
    vec3 warm = vec3( 1.00, 0.93, 0.86 );
    vec3 col = mix( cold, warm, vHit * 0.7 );
    float a = m * uOpacity * ( 1.0 - smoothstep( 0.55, 1.0, vLife ) ) * smoothstep( 0.0, 0.06, vLife );
    a *= smoothstep( 0.8, 3.5, vDist );
    if ( a < 0.004 ) discard;
    gl_FragColor = vec4( col, a );
  }
`;

export function Discharge() {
  const { ch, tier } = useIncident();
  const count = BUDGET[tier].burst;
  const map = useMemo(() => radialSprite(), []);
  const pts = useRef<THREE.Points>(null);

  const geometry = useMemo(() => {
    const rand01 = rng(0x2b9d41);
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const origin = new Float32Array(count * 3);
    const dir = new Float32Array(count * 3);
    const perp = new Float32Array(count * 3);
    const delay = new Float32Array(count);
    const seed = new Float32Array(count);
    const rand = new Float32Array(count * 3);

    const up = new THREE.Vector3(0, 1, 0);
    const p = new THREE.Vector3();

    for (let i = 0; i < count; i++) {
      const n = NOZZLES[i % NOZZLES.length];
      origin[i * 3] = n.pos.x;
      origin[i * 3 + 1] = n.pos.y - 0.3;
      origin[i * 3 + 2] = n.pos.z;
      dir[i * 3] = n.dir.x;
      dir[i * 3 + 1] = n.dir.y;
      dir[i * 3 + 2] = n.dir.z;

      p.copy(n.dir).cross(up).normalize();
      perp[i * 3] = p.x;
      perp[i * 3 + 1] = p.y;
      perp[i * 3 + 2] = p.z;

      delay[i] = n.delay;
      seed[i] = rand01();
      rand[i * 3] = rand01();
      rand[i * 3 + 1] = rand01();
      rand[i * 3 + 2] = rand01();
    }

    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aOrigin", new THREE.BufferAttribute(origin, 3));
    g.setAttribute("aDir", new THREE.BufferAttribute(dir, 3));
    g.setAttribute("aPerp", new THREE.BufferAttribute(perp, 3));
    g.setAttribute("aDelay", new THREE.BufferAttribute(delay, 1));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    g.setAttribute("aRand", new THREE.BufferAttribute(rand, 3));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 4, 1.5), 20);
    return g;
  }, [count]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uDischarge: { value: 0 },
      uPrime: { value: 0 },
      uReach: { value: 7.4 },
      uSpread: { value: 0.85 },
      // Metres: atomised mist clumps, finer than the flame it is hitting.
      uScale: { value: tier === "high" ? 0.1 : 0.15 },
      uOpacity: { value: 0 },
      uPx: { value: 800 },
      uMap: { value: map },
      uImpact: { value: new THREE.Vector3(FIRE.x, FIRE.y + 1.0, FIRE.z) },
      uImpactR: { value: 2.1 },
    }),
    [tier, map],
  );

  useFrame((state, dt) => {
    const c = ch.current;
    uniforms.uTime.value += dt * 1.35;
    uniforms.uDischarge.value = c.discharge;
    uniforms.uPrime.value = c.nozzlePrime;
    uniforms.uOpacity.value = Math.min(1, c.discharge * 1.5) * 0.6;
    uniforms.uPx.value = pixelsPerMetre(state);
    // The mist reaches deeper as the flame gives ground.
    uniforms.uImpactR.value = 0.9 + c.fire * 1.6;
    if (pts.current) pts.current.visible = c.discharge > 0.004 || c.nozzlePrime > 0.01;
  });

  return (
    <points ref={pts} geometry={geometry} frustumCulled={false} renderOrder={4}>
      <shaderMaterial
        args={[{ uniforms, vertexShader: VERT, fragmentShader: FRAG }]}
        transparent
        depthWrite={false}
        blending={THREE.NormalBlending}
      />
    </points>
  );
}

/**
 * The pressure shockwave at first contact. One brief expanding ring — the
 * brief asked for impact, not an explosion, so it lasts a fraction of the
 * collision window and never repeats.
 */
export function Shockwave() {
  const { ch } = useIncident();
  const mesh = useRef<THREE.Mesh>(null);
  const uniforms = useMemo(() => ({ uAlpha: { value: 0 } }), []);

  useFrame((state) => {
    const s = ch.current.shock;
    const m = mesh.current;
    if (!m) return;
    m.visible = s > 0.01;
    if (!m.visible) return;
    m.scale.setScalar(0.6 + s * 6.5);
    m.quaternion.copy(state.camera.quaternion);
    uniforms.uAlpha.value = Math.sin(s * Math.PI) * 0.5;
  });

  return (
    <mesh ref={mesh} position={[FIRE.x, FIRE.y + 1.0, FIRE.z]} renderOrder={5}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        args={[
          {
            uniforms,
            vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
            fragmentShader: /* glsl */ `
              precision highp float;
              uniform float uAlpha; varying vec2 vUv;
              void main(){
                float d = length( vUv - 0.5 ) * 2.0;
                // A thin shell, brightest at the leading edge.
                float ring = smoothstep( 0.62, 0.9, d ) * ( 1.0 - smoothstep( 0.9, 1.0, d ) );
                gl_FragColor = vec4( vec3( 0.85, 0.94, 1.0 ), ring * uAlpha );
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

/**
 * Controlled venting through the explosion relief device. Directed upward and
 * away, which is the entire point of a relief panel — the pressure leaves in
 * a direction the plant designer chose.
 */
export function ReliefVent() {
  const { ch, tier } = useIncident();
  const count = tier === "high" ? 520 : 200;
  const map = useMemo(() => radialSprite(), []);
  const pts = useRef<THREE.Points>(null);

  const geometry = useMemo(() => {
    const rand01 = rng(0x51c0de);
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const seed = new Float32Array(count);
    const rand = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const a = rand01() * Math.PI * 2;
      const r = Math.sqrt(rand01()) * 0.65;
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
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 5, 0), 14);
    return g;
  }, [count]);

  const uniforms = useMemo(
    () => ({ uTime: { value: 0 }, uAmount: { value: 0 }, uPx: { value: 800 }, uMap: { value: map } }),
    [map],
  );

  useFrame((state, dt) => {
    uniforms.uTime.value += dt * 1.5;
    uniforms.uAmount.value = ch.current.reliefVent;
    uniforms.uPx.value = pixelsPerMetre(state);
    if (pts.current) pts.current.visible = ch.current.reliefVent > 0.004;
  });

  return (
    <points ref={pts} position={[0, 5.4, 0]} geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        args={[
          {
            uniforms,
            vertexShader: /* glsl */ `
              attribute float aSeed; attribute vec3 aRand;
              uniform float uTime; uniform float uAmount; uniform float uPx;
              varying float vLife;
              void main(){
                float life = fract( uTime * ( 0.3 + aSeed * 0.35 ) + aSeed );
                float alive = step( aRand.z, uAmount );
                vec3 pos = position;
                // Fast and narrow at the throat, spreading once it is clear.
                pos.y += life * 7.5 * ( 0.6 + aRand.x * 0.8 );
                float w = life * 2.6;
                pos.x += ( aRand.x - 0.5 ) * w - life * 1.4;
                pos.z += ( aRand.y - 0.5 ) * w;
                vec4 mv = modelViewMatrix * vec4( pos, 1.0 );
                gl_Position = projectionMatrix * mv;
                gl_PointSize = alive * ( 0.14 + aRand.y * 0.2 ) * ( 0.3 + life * 1.6 ) * uPx / max( -mv.z, 0.1 );
                vLife = life;
              }`,
            fragmentShader: /* glsl */ `
              precision highp float;
              uniform sampler2D uMap; varying float vLife;
              void main(){
                float m = texture2D( uMap, gl_PointCoord ).a;
                float a = m * 0.4 * smoothstep(0.0,0.08,vLife) * ( 1.0 - smoothstep( 0.4, 1.0, vLife ) );
                if ( a < 0.004 ) discard;
                gl_FragColor = vec4( vec3( 0.92, 0.96, 0.99 ), a );
              }`,
          },
        ]}
        transparent
        depthWrite={false}
        blending={THREE.NormalBlending}
      />
    </points>
  );
}
