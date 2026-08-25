"use client";

import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { Plant } from "./plant";
import { Devices } from "./devices";
import { Fire, FireGlow } from "./fire";
import { Smoke, Steam, Sparks } from "./vapor";
import { Discharge, Shockwave, ReliefVent } from "./burst";
import { Flow } from "./flow";
import { Lighting } from "./lighting";
import { CameraRig } from "./rig";
import { AnnotationProjector } from "./annotations";
import type { AnnoRegistry } from "./annotation-layer";
import { IncidentContext, BUDGET, type IncidentClock } from "./use-incident";
import { INLET, SIGNAL_PATH, AGENT_PATH, WAVE_PATH } from "./layout";

/**
 * One scene. One camera world. One incident.
 *
 * Everything below reads the same clock, so at any scroll position the frame
 * is a coherent physical moment rather than a stack of independent
 * animations: at 57% the fire is still three quarters alive, the agent is
 * mid-discharge, steam is climbing, the orange light is falling and the cold
 * light is rising — all from one number.
 */

const INLET_LINE = new THREE.LineCurve3(INLET.from.clone(), INLET.to.clone());
const OUTLET_R = 0.3;

export function Scene({
  clock,
  registry,
  live,
}: {
  clock: IncidentClock;
  registry: AnnoRegistry;
  /** False while the film is scrolled off screen — stops the render loop. */
  live: boolean;
}) {
  const { tier, reduced } = clock;
  const budget = BUDGET[tier];

  return (
    <Canvas
      // 1.5 rather than 1.75. The collision — the camera pulled back with the
      // whole plant lit and fire, mist, steam and smoke all near peak — is the
      // only shot in the film that misses the 16.67 ms frame budget, and it
      // misses it by about a millisecond, which costs half the frame rate.
      // Measured on the worst hardware that still classifies as "high" (Intel
      // HD 630): 1.75 → 18.0 ms and a hard 30 fps, 1.5 → 13.8 ms and ~57.
      // Every other shot has headroom at either setting.
      dpr={tier === "high" ? [1, 1.5] : [1, 1.25]}
      gl={{
        antialias: tier === "high",
        powerPreference: "high-performance",
        alpha: false,
        stencil: false,
        depth: true,
      }}
      camera={{ fov: 42, near: 0.1, far: 320, position: [4.6, 2.4, 11.2] }}
      onCreated={({ gl, scene }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.06;
        scene.background = new THREE.Color(0x080a0c);
      }}
      frameloop={!live || reduced ? "never" : "always"}
      style={{ position: "absolute", inset: 0 }}
    >
      {/* The context has to be re-provided: R3F renders into its own tree. */}
      <IncidentContext.Provider value={clock}>
        <CameraRig />
        <Lighting />

        <Plant />
        <Devices />

        {/* ---- what is happening inside the steel ---- */}
        {/* heat and pressure travelling down the inlet duct */}
        <Flow
          curve={INLET_LINE}
          count={Math.round(budget.agent * 0.8)}
          radius={INLET.radius * 0.72}
          color="#ff7a2b"
          size={0.05}
          tail={1}
          speed={0.55}
          churn={1.5}
          head={(c) => c.inletPressure}
          on={(c) => c.inletPressure * Math.max(0.25, c.xrayInlet)}
        />
        {/* the decision, travelling as an electrical pulse down the tray */}
        <Flow
          curve={SIGNAL_PATH}
          count={90}
          radius={0.045}
          color="#8fe3ff"
          size={0.045}
          tail={0.14}
          speed={1.4}
          churn={0}
          head={(c) => c.signalHead}
          on={(c) => c.signalOn}
        />
        {/* the suppressant racing along the manifold toward the nozzles */}
        <Flow
          curve={AGENT_PATH}
          count={budget.agent}
          radius={0.135}
          color="#d8f3ff"
          size={0.05}
          tail={0.62}
          speed={1.1}
          churn={1.2}
          head={(c) => c.agentHead}
          on={(c) => c.agentOn * Math.max(0.3, c.xrayManifold)}
        />
        {/* residual pressure heading for the next unit down the line */}
        <Flow
          curve={WAVE_PATH}
          count={Math.round(budget.agent * 0.7)}
          radius={OUTLET_R}
          color="#ff8a3a"
          size={0.055}
          tail={0.22}
          speed={0.8}
          churn={1.4}
          head={(c) => c.waveHead}
          on={(c) => c.waveOn * Math.max(0.3, c.xrayOutlet)}
        />

        {/* ---- the incident itself ---- */}
        <Smoke />
        <Fire />
        <Sparks />
        <FireGlow />
        <Discharge />
        <Shockwave />
        <Steam />
        <ReliefVent />

        <AnnotationProjector registry={registry} />
      </IncidentContext.Provider>
    </Canvas>
  );
}
