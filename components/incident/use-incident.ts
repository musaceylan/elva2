"use client";

import { createContext, useContext, type RefObject } from "react";
import type { Channels } from "./timeline";

/**
 * The film's clock, shared between the WebGL scene and the DOM overlay.
 *
 * Progress is passed as a mutable ref, not React state. The scene samples it
 * once per frame inside useFrame and the overlay writes it straight to DOM
 * nodes — a 60 fps React render loop would make the whole thing stutter.
 * `ch` is the channel snapshot for the current frame, recomputed once per
 * frame by the driver so nothing downstream calls channels() twice.
 */
export type IncidentClock = {
  /** Smoothed scroll progress, 0 → 1 across the whole film. */
  p: RefObject<number>;
  /** Signed scroll velocity, roughly -1 … 1 after damping. */
  v: RefObject<number>;
  /** Channel snapshot for the current frame. */
  ch: RefObject<Channels>;
  /** Pointer position in -1 … 1, already damped. Drives parallax only. */
  pointer: RefObject<{ x: number; y: number }>;
  /** Quality tier chosen from screen size and device capability. */
  tier: "high" | "low";
  reduced: boolean;
  /**
   * The DOM overlay reads the same frame as the scene. Subscribers are called
   * once per driver tick with the already-computed channels, so the caption
   * layer, the telemetry HUD and the WebGL scene can never disagree about
   * what moment the film is on.
   */
  subscribe: (fn: (c: Channels, p: number, v: number) => void) => () => void;
};

export const IncidentContext = createContext<IncidentClock | null>(null);

export function useIncident(): IncidentClock {
  const ctx = useContext(IncidentContext);
  if (!ctx) throw new Error("useIncident must be used inside <IncidentFilm>");
  return ctx;
}

/** Particle budgets. The scene reads these rather than hard-coding counts. */
export const BUDGET = {
  high: { fire: 2600, smoke: 420, steam: 520, spark: 260, agent: 520, burst: 2400 },
  low: { fire: 760, smoke: 150, steam: 190, spark: 90, agent: 200, burst: 700 },
} as const;
