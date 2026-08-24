"use client";

import { useMemo } from "react";
import * as THREE from "three";

/**
 * Geometry helpers. Everything industrial in this scene is built from
 * primitives — a pipe run is a cylinder between two points, a vessel is a
 * cylinder with a cone under it. No model files, so nothing to download and
 * nothing to keep in sync with the layout table.
 */

const UP = new THREE.Vector3(0, 1, 0);

/** Places a unit-Y cylinder along the segment from → to. */
export function segmentTransform(from: THREE.Vector3, to: THREE.Vector3) {
  const dir = new THREE.Vector3().subVectors(to, from);
  const len = dir.length();
  const mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
  const quat = new THREE.Quaternion().setFromUnitVectors(UP, dir.clone().normalize());
  return { len, mid, quat };
}

export function Pipe({
  from,
  to,
  radius,
  material,
  segments = 24,
  open = false,
}: {
  from: THREE.Vector3;
  to: THREE.Vector3;
  radius: number;
  material: THREE.Material;
  segments?: number;
  open?: boolean;
}) {
  const { len, mid, quat } = useMemo(() => segmentTransform(from, to), [from, to]);
  return (
    <mesh
      position={mid}
      quaternion={quat}
      material={material}
      castShadow={false}
      receiveShadow={false}
    >
      <cylinderGeometry args={[radius, radius, len, segments, 1, open]} />
    </mesh>
  );
}

/** Bolted flange — the detail that makes a cylinder read as process pipework. */
export function Flange({
  at,
  axis,
  radius,
  material,
}: {
  at: THREE.Vector3;
  axis: THREE.Vector3;
  radius: number;
  material: THREE.Material;
}) {
  const quat = useMemo(
    () => new THREE.Quaternion().setFromUnitVectors(UP, axis.clone().normalize()),
    [axis],
  );
  return (
    <mesh position={at} quaternion={quat} material={material}>
      <cylinderGeometry args={[radius * 1.45, radius * 1.45, radius * 0.28, 20]} />
    </mesh>
  );
}

/** Repeated stiffener rings down a run — reads as pressure-rated ductwork. */
export function Ribs({
  from,
  to,
  radius,
  material,
  count = 6,
}: {
  from: THREE.Vector3;
  to: THREE.Vector3;
  radius: number;
  material: THREE.Material;
  count?: number;
}) {
  // A torus's axis is Z, not Y, so it needs its own rotation.
  const quat = useMemo(
    () =>
      new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        new THREE.Vector3().subVectors(to, from).normalize(),
      ),
    [from, to],
  );
  const points = useMemo(() => {
    const out: THREE.Vector3[] = [];
    for (let i = 1; i <= count; i++) {
      out.push(new THREE.Vector3().lerpVectors(from, to, i / (count + 1)));
    }
    return out;
  }, [from, to, count]);

  return (
    <>
      {points.map((pt, i) => (
        <mesh key={i} position={pt} quaternion={quat} material={material}>
          <torusGeometry args={[radius * 1.06, radius * 0.075, 6, 18]} />
        </mesh>
      ))}
    </>
  );
}

/** A structural column with a base plate. */
export function Column({
  x,
  z,
  height,
  material,
}: {
  x: number;
  z: number;
  height: number;
  material: THREE.Material;
}) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, height / 2, 0]} material={material}>
        <boxGeometry args={[0.24, height, 0.24]} />
      </mesh>
      <mesh position={[0, 0.03, 0]} material={material}>
        <boxGeometry args={[0.6, 0.06, 0.6]} />
      </mesh>
    </group>
  );
}
