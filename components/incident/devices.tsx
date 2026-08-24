"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { createSteel } from "./materials";
import { useIncident } from "./use-incident";
import {
  NOZZLES, HRD, VALVE, RELIEF, FLAME_DET, SPARK_DET, PRESS_DET, PANEL, MANIFOLD_Y,
} from "./layout";

/**
 * The parts that move.
 *
 * Every one of these is driven off a channel, so the mechanical chain — light
 * comes on, signal arrives, bottle fires, nozzles prime, valve slams, vent
 * opens — plays as one continuous causal sequence instead of a set of
 * independent reveals.
 */

const AMBER = new THREE.Color("#f0902b");
const EMBER = new THREE.Color("#d9342b");
const COLD = new THREE.Color("#7fd4e8");
const OFF = new THREE.Color("#1b1f25");

/** An indicator lamp whose emissive tracks a channel. */
function Lamp({
  position,
  size = 0.09,
  color,
}: {
  position: THREE.Vector3 | [number, number, number];
  size?: number;
  color: THREE.Color;
}) {
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  return (
    <mesh position={position as THREE.Vector3}>
      <sphereGeometry args={[size, 12, 12]} />
      <meshStandardMaterial
        ref={mat}
        color={OFF}
        emissive={color}
        emissiveIntensity={0}
        toneMapped={false}
        userData={{ lamp: true }}
      />
    </mesh>
  );
}

export function Devices() {
  const { ch } = useIncident();
  const steel = useMemo(() => createSteel({ color: 0x4c545e, metalness: 0.85, roughness: 0.4 }), []);
  const dark = useMemo(() => createSteel({ color: 0x22262c, roughness: 0.85 }), []);

  const flameLamp = useRef<THREE.MeshStandardMaterial>(null);
  const sparkLamp = useRef<THREE.MeshStandardMaterial>(null);
  const pressLamp = useRef<THREE.MeshStandardMaterial>(null);
  const panelLamps = useRef<THREE.MeshStandardMaterial[]>([]);
  const hrdLamp = useRef<THREE.MeshStandardMaterial>(null);
  const valveGroup = useRef<THREE.Group>(null);
  const valveStem = useRef<THREE.Group>(null);
  const reliefPanel = useRef<THREE.Group>(null);
  const gaugeNeedle = useRef<THREE.Group>(null);
  const nozzleTips = useRef<THREE.Group[]>([]);

  useFrame((state) => {
    const c = ch.current;
    const t = state.clock.elapsedTime;

    // Detectors. The flame detector stays lit through the aftermath — the
    // incident is over but the system has not been reset.
    const blink = 0.65 + Math.sin(t * 9) * 0.35;
    if (flameLamp.current) flameLamp.current.emissiveIntensity = c.detectorOn * 5 * blink;
    if (sparkLamp.current) sparkLamp.current.emissiveIntensity = c.detectorOn * 2.2 * blink;
    if (pressLamp.current)
      pressLamp.current.emissiveIntensity = Math.max(c.inletPressure, c.detectorOn) * 3.4;

    // Control panel: dark until the signal lands, then a row of lit states.
    panelLamps.current.forEach((m, i) => {
      if (!m) return;
      const stagger = Math.min(1, Math.max(0, (c.controlOn - i * 0.12) / 0.2));
      m.emissiveIntensity = stagger * 4;
    });

    if (hrdLamp.current) hrdLamp.current.emissiveIntensity = c.hrdOpen * 4.5;

    // Isolation valve: a quarter turn, and it happens fast enough to read as
    // a snap rather than a rotation.
    if (valveStem.current) valveStem.current.rotation.y = c.valveClose * Math.PI * 0.5;
    if (valveGroup.current) {
      const j = c.valveSnap * 0.045;
      valveGroup.current.position.set(
        VALVE.x + Math.sin(t * 90) * j,
        VALVE.y + Math.sin(t * 71) * j,
        VALVE.z,
      );
    }

    // Explosion relief panel hinges open and stays open.
    if (reliefPanel.current) reliefPanel.current.rotation.x = -c.reliefOpen * 1.15;

    // The gauge is the analogue twin of the telemetry readout.
    if (gaugeNeedle.current) {
      const load = Math.max(c.inletPressure, c.waveHead > 0 ? c.waveOn * 0.9 : 0);
      const relieved = load * (1 - c.reliefOpen * 0.85);
      gaugeNeedle.current.rotation.z = -0.9 + relieved * -2.4 + Math.sin(t * 24) * 0.03 * c.shake;
    }

    // Nozzles twitch as pressure arrives, before anything discharges.
    nozzleTips.current.forEach((g, i) => {
      if (!g) return;
      const prime = c.nozzlePrime * Math.max(0, 1 - Math.abs(i / NOZZLES.length - c.agentHead) * 2);
      g.position.y = -0.62 + Math.sin(t * 60 + i) * 0.012 * (prime + c.discharge * 0.6);
    });
  });

  return (
    <group>
      {/* ---------------- HRD suppression cylinder ---------------- */}
      <group position={HRD}>
        <mesh material={steel}>
          <capsuleGeometry args={[0.42, 1.5, 8, 20]} />
        </mesh>
        <mesh position={[0, 1.05, 0]} material={dark}>
          <cylinderGeometry args={[0.16, 0.2, 0.36, 14]} />
        </mesh>
        <mesh position={[0, 0.2, 0.44]}>
          <sphereGeometry args={[0.075, 12, 12]} />
          <meshStandardMaterial
            ref={hrdLamp}
            color={OFF}
            emissive={AMBER}
            emissiveIntensity={0}
            toneMapped={false}
          />
        </mesh>
      </group>

      {/* ---------------- nozzles ---------------- */}
      {NOZZLES.map((n, i) => (
        <group key={i} position={[n.pos.x, MANIFOLD_Y, n.pos.z]}>
          <group
            ref={(el) => {
              if (el) nozzleTips.current[i] = el;
            }}
            position={[0, -0.62, 0]}
          >
            <mesh position={[0, 0.31, 0]} material={steel}>
              <cylinderGeometry args={[0.07, 0.07, 0.62, 12]} />
            </mesh>
            <mesh
              quaternion={new THREE.Quaternion().setFromUnitVectors(
                new THREE.Vector3(0, 1, 0),
                n.dir.clone().negate(),
              )}
              material={steel}
            >
              <coneGeometry args={[0.15, 0.3, 14]} />
            </mesh>
          </group>
        </group>
      ))}

      {/* ---------------- flame detector, aimed at the seat of the fire ---------------- */}
      <group position={FLAME_DET}>
        <mesh material={dark}>
          <boxGeometry args={[0.3, 0.3, 0.42]} />
        </mesh>
        <mesh position={[-0.14, -0.05, -0.16]} rotation={[0.5, 0.6, 0]}>
          <cylinderGeometry args={[0.09, 0.09, 0.08, 16]} />
          <meshStandardMaterial
            ref={flameLamp}
            color={OFF}
            emissive={EMBER}
            emissiveIntensity={0}
            toneMapped={false}
          />
        </mesh>
        <mesh position={[0, -0.85, 0]} material={dark}>
          <cylinderGeometry args={[0.05, 0.05, 1.4, 8]} />
        </mesh>
      </group>

      {/* ---------------- spark detector on the inlet ---------------- */}
      <group position={SPARK_DET}>
        <mesh material={dark}>
          <boxGeometry args={[0.34, 0.22, 0.22]} />
        </mesh>
        <mesh position={[0, -0.16, 0]}>
          <sphereGeometry args={[0.06, 10, 10]} />
          <meshStandardMaterial
            ref={sparkLamp}
            color={OFF}
            emissive={AMBER}
            emissiveIntensity={0}
            toneMapped={false}
          />
        </mesh>
        <mesh position={[0, -0.35, 0]} material={dark}>
          <cylinderGeometry args={[0.035, 0.035, 0.36, 8]} />
        </mesh>
      </group>

      {/* ---------------- pressure detector + gauge on the vessel ---------------- */}
      <group position={PRESS_DET}>
        <mesh rotation={[0, 0, Math.PI / 2]} material={steel}>
          <cylinderGeometry args={[0.1, 0.1, 0.34, 12]} />
        </mesh>
        <mesh position={[0.28, 0, 0]}>
          <sphereGeometry args={[0.07, 10, 10]} />
          <meshStandardMaterial
            ref={pressLamp}
            color={OFF}
            emissive={AMBER}
            emissiveIntensity={0}
            toneMapped={false}
          />
        </mesh>
        <group position={[0.1, 0.55, 0.3]}>
          <mesh material={dark}>
            <cylinderGeometry args={[0.26, 0.26, 0.07, 20]} />
          </mesh>
          <group ref={gaugeNeedle} position={[0, 0, 0.05]}>
            <mesh position={[0.1, 0, 0]}>
              <boxGeometry args={[0.2, 0.02, 0.01]} />
              <meshStandardMaterial color={OFF} emissive={AMBER} emissiveIntensity={2.5} toneMapped={false} />
            </mesh>
          </group>
        </group>
      </group>

      {/* ---------------- control panel ---------------- */}
      <group position={PANEL}>
        <mesh position={[0, 0.75, 0]} material={dark}>
          <boxGeometry args={[0.9, 1.5, 0.4]} />
        </mesh>
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} position={[-0.28 + i * 0.19, 1.18, 0.22]}>
            <sphereGeometry args={[0.055, 10, 10]} />
            <meshStandardMaterial
              ref={(el) => {
                if (el) panelLamps.current[i] = el;
              }}
              color={OFF}
              emissive={i === 3 ? COLD : AMBER}
              emissiveIntensity={0}
              toneMapped={false}
            />
          </mesh>
        ))}
      </group>

      {/* ---------------- isolation valve ---------------- */}
      <group ref={valveGroup} position={VALVE}>
        <mesh rotation={[0, 0, Math.PI / 2]} material={steel}>
          <cylinderGeometry args={[0.56, 0.56, 0.62, 20]} />
        </mesh>
        <group ref={valveStem}>
          {/* the disc that swings across the bore */}
          <mesh material={steel}>
            <boxGeometry args={[0.06, 0.9, 0.9]} />
          </mesh>
        </group>
        <mesh position={[0, 0.62, 0]} material={dark}>
          <cylinderGeometry args={[0.13, 0.13, 0.55, 12]} />
        </mesh>
        <mesh position={[0, 0.95, 0]} material={steel}>
          <cylinderGeometry args={[0.3, 0.3, 0.22, 16]} />
        </mesh>
      </group>

      {/* ---------------- explosion relief panel on the vessel roof ---------------- */}
      <group position={RELIEF}>
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} material={steel}>
          <ringGeometry args={[0.62, 0.82, 24]} />
        </mesh>
        <group ref={reliefPanel} position={[0, 0.05, -0.7]}>
          <mesh position={[0, 0, 0.7]} rotation={[-Math.PI / 2, 0, 0]} material={steel}>
            <circleGeometry args={[0.72, 24]} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

export { Lamp };
