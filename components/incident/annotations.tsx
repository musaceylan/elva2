"use client";

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useIncident } from "./use-incident";
import { seg, type Channels } from "./timeline";
import { ANNO_LABELS, type AnnoRegistry } from "./annotation-layer";
import {
  FLAME_DET, SPARK_DET, PRESS_DET, PANEL, HRD, VALVE, RELIEF, NOZZLES, SILO,
} from "./layout";

/**
 * SPATIAL LABELLING
 * =================
 *
 * Information is attached to the machine, not laid out in cards beside it.
 * A thin leader line runs from the part to a short label — the vernacular of
 * an engineering cutaway, and the thing that makes the final pull-back read
 * as a system rather than a render.
 *
 * Projection is written straight to DOM nodes from inside the render loop.
 * Routing ten labels through React state at 60 fps would cost more than the
 * entire particle budget.
 */

export type Anno = {
  id: string;
  at: THREE.Vector3;
  /** Leader offset in world space — where the label hangs off the part. */
  off: [number, number, number];
  /** Visibility from the channels and raw scroll position. */
  show: (c: Channels, p: number) => number;
};

/** Open across [a,b], hold, close across [c,d]. */
const win = (p: number, a: number, b: number, c: number, d: number) =>
  Math.min(seg(p, a, b), 1 - seg(p, c, d));

/**
 * During the pull-back the protection points light up one after another
 * rather than all at once, so the viewer reads a system being assembled.
 */
const inTurn = (i: number) => (c: Channels) =>
  // ...and clear out again before the wordmark arrives, so the brand moment
  // is never fighting nine leader lines for the same space.
  seg(c.reveal, i * 0.055, i * 0.055 + 0.22) * (1 - seg(c.reveal, 0.72, 0.86));

export const ANNOTATIONS: Anno[] = [
  {
    id: "det",
    at: FLAME_DET,
    off: [2.6, 0.9, 0.4],
    // Called out live at the moment it actually sees the fire, then again in
    // the facility overview.
    show: (c, p) => Math.max(win(p, 0.235, 0.255, 0.3, 0.325), inTurn(0)(c)),
  },
  { id: "spark", at: SPARK_DET, off: [-2.4, 2.7, 0.5], show: inTurn(1) },
  {
    id: "press",
    at: PRESS_DET,
    off: [3.2, -0.7, 0.8],
    show: (c, p) => Math.max(win(p, 0.16, 0.185, 0.23, 0.255), inTurn(2)(c)),
  },
  {
    id: "panel",
    at: PANEL.clone().add(new THREE.Vector3(0, 1.2, 0)),
    off: [-2.6, 0.9, 0.6],
    show: (c, p) => Math.max(win(p, 0.318, 0.336, 0.37, 0.395), inTurn(3)(c)),
  },
  {
    id: "hrd",
    at: HRD,
    off: [-3.0, 3.6, 0.4],
    show: (c, p) => Math.max(win(p, 0.345, 0.365, 0.4, 0.425), inTurn(4)(c)),
  },
  {
    id: "noz",
    at: NOZZLES[2].pos,
    off: [-1.6, 2.4, 0.3],
    show: (c, p) => Math.max(win(p, 0.482, 0.502, 0.525, 0.545), inTurn(5)(c)),
  },
  {
    id: "relief",
    at: RELIEF,
    off: [2.4, 3.4, 0.4],
    show: (c, p) => Math.max(win(p, 0.915, 0.935, 0.955, 0.975), inTurn(6)(c)),
  },
  {
    id: "valve",
    at: VALVE,
    off: [1.9, 4.0, 0.5],
    show: (c, p) => Math.max(win(p, 0.855, 0.875, 0.9, 0.925), inTurn(7)(c)),
  },
  { id: "silo", at: SILO, off: [1.7, 4.8, 0.4], show: inTurn(8) },
];

/** Lives inside the Canvas; owns projection and writes to the DOM layer. */
export function AnnotationProjector({ registry }: { registry: AnnoRegistry }) {
  const { ch, p: progress } = useIncident();
  const { camera, size } = useThree();
  const a = useMemo(() => new THREE.Vector3(), []);
  const b = useMemo(() => new THREE.Vector3(), []);
  const shown = useRef<Record<string, number>>({});

  // Anchors and labels are two halves of one list; this catches them drifting.
  if (ANNOTATIONS.length !== ANNO_LABELS.length) {
    throw new Error("Annotation anchors and labels are out of sync");
  }

  useFrame(() => {
    const c = ch.current;
    for (const anno of ANNOTATIONS) {
      const nodes = registry.get(anno.id);
      if (!nodes?.label) continue;

      const vis = Math.min(1, Math.max(0, anno.show(c, progress.current)));
      // Ease the leader line in so labels draw themselves rather than blink.
      const prev = shown.current[anno.id] ?? 0;
      const eased = prev + (vis - prev) * 0.12;
      shown.current[anno.id] = eased;

      if (eased < 0.01) {
        nodes.label.style.opacity = "0";
        if (nodes.line) nodes.line.style.opacity = "0";
        continue;
      }

      a.copy(anno.at);
      b.set(anno.at.x + anno.off[0], anno.at.y + anno.off[1], anno.at.z + anno.off[2]);
      a.project(camera);
      b.project(camera);

      const ax = (a.x * 0.5 + 0.5) * size.width;
      const ay = (-a.y * 0.5 + 0.5) * size.height;

      // The label is pulled back inside the frame rather than allowed to
      // wander off it — a leader line running to an invisible label is just
      // a stray diagonal across the shot.
      const padX = 190;
      const padY = 40;
      const bx = Math.min(size.width - padX, Math.max(padX, (b.x * 0.5 + 0.5) * size.width));
      const by = Math.min(size.height - padY, Math.max(padY, (-b.y * 0.5 + 0.5) * size.height));

      // Behind the camera, or the part itself off frame: nothing to annotate.
      const off =
        a.z > 1 ||
        ax < -80 || ax > size.width + 80 ||
        ay < -80 || ay > size.height + 80;
      const alpha = off ? 0 : eased;

      nodes.label.style.opacity = String(alpha);
      nodes.label.style.transform = `translate3d(${bx.toFixed(1)}px, ${by.toFixed(1)}px, 0)`;

      if (nodes.line) {
        nodes.line.style.opacity = String(alpha * 0.75);
        nodes.line.setAttribute("x1", ax.toFixed(1));
        nodes.line.setAttribute("y1", ay.toFixed(1));
        // Draw the leader progressively, from the part outward.
        nodes.line.setAttribute("x2", (ax + (bx - ax) * eased).toFixed(1));
        nodes.line.setAttribute("y2", (ay + (by - ay) * eased).toFixed(1));
      }
    }
  });

  return null;
}
