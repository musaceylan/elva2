"use client";

import {
  useEffect, useMemo, useRef, useState, useSyncExternalStore, type ComponentType,
} from "react";
import { channels, type Channels } from "./timeline";
import { IncidentContext, type IncidentClock } from "./use-incident";
import { Overlay } from "./overlay";
import { Telemetry } from "./telemetry";
import { AnnotationLayer, type AnnoRegistry } from "./annotation-layer";
import { IncidentFallback } from "./fallback";

type SceneProps = {
  clock: IncidentClock;
  registry: AnnoRegistry;
  live: boolean;
};

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Scroll spent holding the first and last frames, as a fraction of the film. */
const HOLD_IN = 0.015;
const HOLD_OUT = 0.045;

/* Capability probes are cached: they are read during render through
   useSyncExternalStore, which must be cheap and must return a stable value. */
let webglMemo: boolean | null = null;
function hasWebGL(): boolean {
  if (webglMemo !== null) return webglMemo;
  try {
    const c = document.createElement("canvas");
    webglMemo = !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    webglMemo = false;
  }
  return webglMemo;
}

function pickTier(): "high" | "low" {
  // The clock is built during prerender too, where none of this exists. The
  // tier only ever reaches the canvas, which is client-only, so the server
  // answer is never the one that renders.
  if (typeof window === "undefined") return "low";
  const wide = window.matchMedia("(min-width: 1024px)").matches;
  const cores = navigator.hardwareConcurrency ?? 4;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  return wide && !coarse && cores >= 4 ? "high" : "low";
}

const REDUCED = "(prefers-reduced-motion: reduce)";

/**
 * Whether this visitor gets the film or the written record.
 *
 * Read through useSyncExternalStore rather than probed in an effect: an
 * effect-plus-setState pair would render the film, tear it down and render
 * the fallback, which is both a wasted WebGL context and a visible jump. The
 * server snapshot is "film" because that is what almost everyone gets; a
 * reduced-motion visitor resolves to the static record during hydration,
 * before the canvas is ever created.
 */
function useRenderMode(): "film" | "static" {
  return useSyncExternalStore(
    (onChange) => {
      const m = window.matchMedia(REDUCED);
      m.addEventListener("change", onChange);
      return () => m.removeEventListener("change", onChange);
    },
    () => (window.matchMedia(REDUCED).matches || !hasWebGL() ? "static" : "film"),
    () => "film" as const,
  );
}

/**
 * SCROLL IS TIME
 * ==============
 *
 * One driver, one tick. Scroll position becomes a smoothed progress value,
 * progress becomes the channel snapshot, and the snapshot is handed to both
 * the WebGL scene and the DOM overlay in the same frame. Nothing in the film
 * animates on its own schedule, which is what lets the viewer stop anywhere,
 * examine the frame, and scroll back through the event in reverse.
 */
export function IncidentFilm() {
  const wrap = useRef<HTMLDivElement>(null);

  const mode = useRenderMode();
  const [live, setLive] = useState(true);
  const [Scene, setScene] = useState<ComponentType<SceneProps> | null>(null);

  /* Stable per mount. Both are written outside render — the registry by DOM
     ref callbacks, the subscriber set by child effects. */
  const registry = useMemo<AnnoRegistry>(() => new Map(), []);
  const subscribers = useMemo(
    () => new Set<(c: Channels, p: number, v: number) => void>(),
    [],
  );

  const p = useRef(0);
  const v = useRef(0);
  const ch = useRef<Channels>(channels(0));
  const pointer = useRef({ x: 0, y: 0 });

  const clock = useMemo<IncidentClock>(
    () => ({
      p,
      v,
      ch,
      pointer,
      tier: mode === "film" ? pickTier() : "low",
      reduced: mode === "static",
      subscribe: (fn) => {
        subscribers.add(fn);
        return () => subscribers.delete(fn);
      },
    }),
    [mode, subscribers],
  );

  /**
   * Three.js is fetched at runtime rather than through next/dynamic.
   *
   * next/dynamic still emits the chunk as an async script in the document, so
   * every visitor pays for ~900 kB of renderer — including reduced-motion
   * visitors who get the written record and never create a canvas. Importing
   * it from an effect keeps it out of the initial document entirely: the
   * first paint is typography on a dark plate, and the plant arrives behind
   * it a moment later.
   */
  useEffect(() => {
    if (mode !== "film") return;
    let alive = true;
    import("./scene").then((m) => {
      if (alive) setScene(() => m.Scene);
    });
    return () => {
      alive = false;
    };
  }, [mode]);

  /* ---- pause the scene while the film is off screen ---- */
  useEffect(() => {
    if (!wrap.current) return;
    const io = new IntersectionObserver(([e]) => setLive(e.isIntersecting), {
      rootMargin: "10% 0px",
    });
    io.observe(wrap.current);
    return () => io.disconnect();
  }, []);

  /* ---- the driver ---- */
  useEffect(() => {
    const onPointer = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", onPointer, { passive: true });

    let raf = 0;
    let last = performance.now();
    let target = 0;
    let prev = 0;

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      const el = wrap.current;
      if (el) {
        const rect = el.getBoundingClientRect();
        const travel = rect.height - window.innerHeight;
        const raw = travel > 0 ? -rect.top / travel : 0;
        // Holds at both ends. Without the tail the film is still a frame or
        // two short of the brand reveal when the sticky container releases,
        // because the damped playhead is always chasing the target — and the
        // last shot deserves a beat before the page moves on.
        target = clamp01((raw - HOLD_IN) / (1 - HOLD_IN - HOLD_OUT));
      }

      // Exponential follow rather than a spring: a spring overshoots, and an
      // overshooting playhead means the fire briefly comes back.
      p.current += (target - p.current) * (1 - Math.exp(-dt * 7));

      const raw = (p.current - prev) / (dt || 1 / 60);
      prev = p.current;
      v.current += (raw - v.current) * 0.18;

      ch.current = channels(p.current);
      for (const fn of subscribers) fn(ch.current, p.current, v.current);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onPointer);
    };
  }, [subscribers]);

  if (mode === "static") return <IncidentFallback />;

  return (
    <IncidentContext.Provider value={clock}>
      {/*
        Fifteen screens of scroll on desktop, ten on phones. It is a long
        read on purpose — the collision alone occupies about a sixth of it,
        and rushing that is the one thing the brief rules out.
      */}
      <div ref={wrap} className="relative h-[1000vh] lg:h-[1500vh]">
        <div className="sticky top-0 h-[100svh] w-full overflow-hidden bg-graphite-deep">
          {Scene && <Scene clock={clock} registry={registry} live={live} />}

          {/* vignette + grain: keeps the frame cinematic and hides banding
              in the dark falloff around the fire */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at 58% 62%, transparent 34%, rgba(6,8,10,0.55) 78%, rgba(6,8,10,0.88) 100%)",
            }}
            aria-hidden
          />

          <AnnotationLayer registry={registry} />
          <Telemetry />
          <Overlay />
        </div>
      </div>

      {/* Screen readers and search engines get the sequence as text. The
          film's own headline is the page h1, so this is a description of it,
          not a second heading. */}
      <IncidentTranscript />
    </IncidentContext.Provider>
  );
}

/** The film's content, available without the film. */
function IncidentTranscript() {
  return (
    <p className="sr-only">
      Karar 15’inci milisaniyede verilir. Toz bulutu tutuşur, dedektör alevi
      algılar, kontrol paneline sinyal ulaşır, HRD bastırma ünitesi devreye
      girer, bastırıcı madde hat boyunca nozüllere ulaşır ve alevi söndürür.
      Ardından hızlı kapanan izolasyon vanası basıncı keser ve patlama tahliye
      kapağı artık basıncı kontrollü şekilde boşaltır.
    </p>
  );
}
