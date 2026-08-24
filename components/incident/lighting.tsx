"use client";

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useIncident } from "./use-incident";
import { FIRE, PANEL, SILO } from "./layout";

/**
 * LIGHT AS NARRATIVE
 * ==================
 *
 * The colour conflict is the story: the plant is lit almost entirely by the
 * fire it is trying to survive, and as the suppressant wins, a cold light
 * takes over. Those two lights cross over during the collision, so the frame
 * physically changes temperature at the moment the agent starts to win —
 * without a single fade between assets.
 */
export function Lighting() {
  const { ch } = useIncident();
  const { scene } = useThree();

  const fireLight = useRef<THREE.PointLight>(null);
  const emberBounce = useRef<THREE.PointLight>(null);
  const coldLight = useRef<THREE.PointLight>(null);
  const panelGlow = useRef<THREE.PointLight>(null);
  const facility = useRef<THREE.Group>(null);
  const key = useRef<THREE.DirectionalLight>(null);

  const fog = useMemo(() => new THREE.FogExp2(0x0a0c0f, 0.026), []);
  scene.fog = fog;

  useFrame((state) => {
    const c = ch.current;
    const t = state.clock.elapsedTime;

    // Industrial fires do not pulse on a sine wave; two detuned frequencies
    // plus a fast jitter reads far closer to the real thing.
    const flicker =
      0.82 + Math.sin(t * 11.3) * 0.11 + Math.sin(t * 27.9) * 0.06 + Math.sin(t * 53.1) * 0.03;

    if (fireLight.current) {
      fireLight.current.intensity = c.heat * 165 * flicker;
      fireLight.current.position.set(
        FIRE.x + Math.sin(t * 3.1) * 0.18,
        FIRE.y + 1.1 + c.fire * 0.7,
        FIRE.z + Math.cos(t * 2.4) * 0.15,
      );
    }
    if (emberBounce.current) emberBounce.current.intensity = c.heat * 26 * (0.9 + flicker * 0.2);
    if (coldLight.current) coldLight.current.intensity = c.cold * 46;
    if (panelGlow.current) panelGlow.current.intensity = c.controlOn * 9;

    // The plant lights come up for the pull-back: the viewer has to be able
    // to read the whole installation once the incident is over.
    if (facility.current) {
      facility.current.children.forEach((l) => {
        (l as THREE.PointLight).intensity = 14 + c.reveal * 130;
      });
    }
    if (key.current) key.current.intensity = 0.3 + c.reveal * 1.5;

    // Smoke thickens the air; steam thins and brightens it. Haze also has to
    // clear for the wide shot, or the facility reads as a grey silhouette.
    fog.density = (0.019 + c.smoke * 0.02 - c.steam * 0.004) * (1 - c.reveal * 0.72);
    // Haze picks up whatever is lighting the room, but never enough to lift
    // the far floor into a false horizon.
    fog.color.setRGB(
      0.022 + c.heat * 0.055 + c.cold * 0.012,
      0.026 + c.heat * 0.017 + c.cold * 0.022,
      0.032 + c.cold * 0.032,
    );
  });

  return (
    <>
      {/* Base fill — barely there. The plant is dark until something lights it. */}
      <ambientLight intensity={0.22} color="#2a3648" />
      <hemisphereLight args={["#334252", "#0b0d10", 0.5]} />

      {/* The fire, and its bounce off the floor plate */}
      <pointLight ref={fireLight} color="#ff6a12" distance={44} decay={2} />
      {/* Lifted well off the deck: a bounce light sitting on the floor puts a
          hard ellipse under the fire instead of a wash. */}
      <pointLight
        ref={emberBounce}
        color="#ff4a12"
        position={[FIRE.x, 1.6, FIRE.z]}
        distance={26}
        decay={1.6}
      />

      {/* Cold light rises with the suppressant and owns the frame afterwards */}
      <pointLight
        ref={coldLight}
        color="#9fd8ee"
        position={[FIRE.x - 0.5, 6.0, FIRE.z + 1.2]}
        distance={34}
        decay={2}
      />

      {/* Control panel throws its own light once it is live */}
      <pointLight ref={panelGlow} color="#f0902b" position={[PANEL.x, PANEL.y + 1.3, PANEL.z + 0.5]} distance={9} decay={2} />

      {/* Plant work lights: a silhouette during the incident, full facility
          lighting once the camera pulls back. */}
      <group ref={facility}>
        <pointLight color="#6f8ea8" position={[-9, 7.6, -2]} distance={42} decay={2} />
        <pointLight color="#5d7c96" position={[SILO.x - 1, 6.4, 2]} distance={40} decay={2} />
        <pointLight color="#66869f" position={[0, 8.4, 6]} distance={44} decay={2} />
      </group>
      <directionalLight ref={key} color="#8ea7bd" position={[-10, 16, 14]} />
    </>
  );
}
