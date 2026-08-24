"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Pipe, Flange, Ribs, Column } from "./parts";
import { createShell, createSteel, applyWetness, type ShellMaterial } from "./materials";
import { useIncident } from "./use-incident";
import { INLET, OUTLET, MANIFOLD, VESSEL, SILO, MANIFOLD_Y, HRD, FOREGROUND } from "./layout";

/**
 * The installation.
 *
 * Three pipe runs get their own shell material so the x-ray can be opened one
 * run at a time — the inlet while the pressure wave is inside it, the
 * manifold while the agent is racing along it, the outlet while the residual
 * pressure travels toward the next unit. Everything else stays opaque steel,
 * which is what keeps the cutaway feeling like an instrument rather than a
 * gimmick.
 */
export function Plant() {
  const { ch } = useIncident();

  const mats = useMemo(
    () => ({
      inlet: createShell({ color: 0x5a626d }),
      manifold: createShell({ color: 0x6b7683, metalness: 0.95, roughness: 0.3 }),
      outlet: createShell({ color: 0x545c66 }),
      vessel: createShell({ color: 0x4e555f, roughness: 0.5 }),
      steel: createSteel(),
      dark: createSteel({ color: 0x23272d, metalness: 0.6, roughness: 0.8 }),
      trim: createSteel({ color: 0x6a7280, metalness: 0.9, roughness: 0.35 }),
    }),
    [],
  );

  const shells = useMemo(
    () => [mats.inlet, mats.manifold, mats.outlet, mats.vessel] as ShellMaterial[],
    [mats],
  );

  const shakeRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const c = ch.current;

    const set = (m: ShellMaterial, v: number) => {
      m.userData.uXray.value = v;
      // While the shell is dissolved it must stop occluding what is inside it.
      m.depthWrite = v < 0.35;
      m.opacity = 1;
    };
    set(mats.inlet, c.xrayInlet);
    set(mats.manifold, c.xrayManifold);
    set(mats.outlet, c.xrayOutlet);
    // The vessel opens whenever either duct beside it does, so the cutaway
    // never stops halfway across a joint.
    set(mats.vessel, Math.max(c.xrayInlet, c.xrayOutlet) * 0.8);

    // Evidence of the suppression event: steel comes out of it wet.
    applyWetness(mats.steel, c.wet);
    applyWetness(mats.trim, c.wet * 0.8);
    for (const s of shells) s.roughness = THREE.MathUtils.lerp(0.42, 0.14, c.wet);

    // Vibration: strongest while it burns, plus the impact and the valve snap.
    if (shakeRef.current) {
      const t = state.clock.elapsedTime;
      const a = c.shake * 0.016;
      shakeRef.current.position.set(
        Math.sin(t * 41) * a,
        Math.sin(t * 57 + 1.3) * a * 0.7,
        Math.cos(t * 37) * a * 0.6,
      );
    }
  });

  const inletMid = useMemo(
    () => new THREE.Vector3().addVectors(INLET.from, INLET.to).multiplyScalar(0.5),
    [],
  );

  return (
    <group ref={shakeRef}>
      {/* ---------------- floor + structure ---------------- */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} material={mats.dark}>
        <planeGeometry args={[90, 90]} />
      </mesh>
      {/* Floor plate joints. Kept very low contrast: this is grating catching
          the fire, not a graph paper backdrop. */}
      <gridHelper args={[34, 17, 0x181c21, 0x14171b]} position={[0, 0.012, 0]} />

      {[-9, -4.5, 4.5, 9].map((x) => (
        <Column key={x} x={x} z={-3.4} height={8.2} material={mats.steel} />
      ))}
      {[-6.6, 6.6].map((x) => (
        <Column key={x} x={x} z={3.6} height={7.4} material={mats.steel} />
      ))}
      {/* overhead beams */}
      <mesh position={[0, 7.6, -3.4]} material={mats.steel}>
        <boxGeometry args={[20, 0.22, 0.3]} />
      </mesh>
      <mesh position={[0, 7.1, 3.6]} material={mats.steel}>
        <boxGeometry args={[15, 0.2, 0.28]} />
      </mesh>

      {/* cable tray carrying the control wiring the signal travels down */}
      <mesh position={[-1.6, 5.85, 3.4]} material={mats.dark}>
        <boxGeometry args={[13.5, 0.1, 0.42]} />
      </mesh>

      {/* ---------------- process vessel ---------------- */}
      <mesh position={VESSEL.center} material={mats.vessel}>
        <cylinderGeometry args={[VESSEL.radius, VESSEL.radius, VESSEL.height, 40, 1, true]} />
      </mesh>
      {/* hopper */}
      <mesh position={[0, 1.05, 0]} material={mats.vessel}>
        <cylinderGeometry args={[VESSEL.radius, 0.42, 1.55, 40, 1, true]} />
      </mesh>
      {/* dome */}
      <mesh position={[0, 4.8, 0]} material={mats.vessel}>
        <sphereGeometry args={[VESSEL.radius, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2.6]} />
      </mesh>
      {/* rotary discharge valve under the hopper */}
      <mesh position={[0, 0.5, 0]} material={mats.trim}>
        <cylinderGeometry args={[0.5, 0.5, 0.42, 20]} />
      </mesh>
      {/* filter cartridges, visible once the vessel goes translucent */}
      {[-0.85, -0.28, 0.28, 0.85].map((x) =>
        [-0.6, 0.2].map((z) => (
          <mesh key={`${x}:${z}`} position={[x, 3.3, z]} material={mats.dark}>
            <cylinderGeometry args={[0.2, 0.2, 2.5, 12, 1, true]} />
          </mesh>
        )),
      )}
      {/* vessel bands */}
      {[2.0, 3.4, 4.6].map((y) => (
        <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]} material={mats.trim}>
          <torusGeometry args={[VESSEL.radius * 1.02, 0.045, 6, 40]} />
        </mesh>
      ))}

      {/* ---------------- inlet duct ---------------- */}
      <Pipe {...INLET} material={mats.inlet} open />
      <Ribs {...INLET} material={mats.trim} count={7} />
      <Flange at={inletMid} axis={new THREE.Vector3(1, 0, 0)} radius={INLET.radius} material={mats.trim} />

      {/* ---------------- outlet duct ---------------- */}
      <Pipe {...OUTLET} material={mats.outlet} open />
      <Ribs {...OUTLET} material={mats.trim} count={6} />
      {/* elbow up out of the vessel */}
      <Pipe
        from={new THREE.Vector3(1.55, 1.75, -0.3)}
        to={new THREE.Vector3(0.5, 1.75, -0.3)}
        radius={OUTLET.radius}
        material={mats.outlet}
        open
      />

      {/* ---------------- downstream silo ---------------- */}
      <mesh position={SILO} material={mats.steel}>
        <cylinderGeometry args={[1.25, 1.25, 4.6, 28]} />
      </mesh>
      <mesh position={[SILO.x, 0.9, SILO.z]} material={mats.steel}>
        <cylinderGeometry args={[1.25, 0.5, 1.4, 28]} />
      </mesh>
      <mesh position={[SILO.x, 5.05, SILO.z]} material={mats.trim}>
        <coneGeometry args={[1.3, 0.7, 28]} />
      </mesh>

      {/* ---------------- suppression manifold ---------------- */}
      <Pipe {...MANIFOLD} material={mats.manifold} open />
      <Ribs {...MANIFOLD} material={mats.trim} count={5} />
      {/* riser from the HRD bottle up to the manifold */}
      <Pipe
        from={new THREE.Vector3(HRD.x, HRD.y + 1.0, HRD.z)}
        to={new THREE.Vector3(HRD.x, MANIFOLD_Y, HRD.z)}
        radius={MANIFOLD.radius}
        material={mats.manifold}
        open
      />
      {/* manifold hangers */}
      {[-4.1, -0.5, 3.2].map((x) => (
        <mesh key={x} position={[x, MANIFOLD_Y + 0.55, 1.9]} material={mats.steel}>
          <boxGeometry args={[0.08, 1.1, 0.08]} />
        </mesh>
      ))}

      {/* ---------------- foreground pipe: the framing element ----------------
          It crosses the opening shot in front of everything, which is what
          gives the hero its depth and puts the viewer inside the plant
          rather than in front of a diagram. */}
      <Pipe from={FOREGROUND.from} to={FOREGROUND.to} radius={FOREGROUND.radius} material={mats.steel} />
      <Ribs {...FOREGROUND} material={mats.trim} count={11} />

      {/* ---------------- secondary equipment ---------------- */}
      <group position={[3.9, 0, 2.4]}>
        <mesh position={[0, 0.42, 0]} material={mats.dark}>
          <boxGeometry args={[1.5, 0.84, 1.1]} />
        </mesh>
        {/* frame edges, so it is a machine rather than a black rectangle */}
        <mesh position={[0, 0.85, 0]} material={mats.trim}>
          <boxGeometry args={[1.58, 0.06, 1.18]} />
        </mesh>
        <mesh position={[0, 0.05, 0]} material={mats.trim}>
          <boxGeometry args={[1.62, 0.1, 1.22]} />
        </mesh>
        <mesh position={[0, 1.16, 0]} material={mats.trim}>
          <cylinderGeometry args={[0.34, 0.34, 0.56, 18]} />
        </mesh>
        <mesh position={[0.55, 1.5, 0]} material={mats.trim}>
          <cylinderGeometry args={[0.05, 0.05, 0.7, 10]} />
        </mesh>
      </group>
      <mesh position={[-3.2, 0.4, 2.6]} material={mats.dark}>
        <boxGeometry args={[1.4, 0.8, 1.0]} />
      </mesh>
      <mesh position={[-3.2, 0.83, 2.6]} material={mats.trim}>
        <boxGeometry args={[1.48, 0.06, 1.08]} />
      </mesh>
    </group>
  );
}
