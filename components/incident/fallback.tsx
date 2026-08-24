"use client";

import { useMotionValue } from "motion/react";
import { PressureCurve } from "../pressure-curve";
import { Reveal } from "../motion-primitives";
import { CHAPTERS } from "./timeline";

/**
 * The film without the film.
 *
 * Shown when the visitor has asked for reduced motion, or when WebGL is
 * unavailable. The sequence is the argument, so it is never gated behind the
 * animation — here it reads as the incident report the animation is based on,
 * with the same pressure curve at its resolved state.
 */
export function IncidentFallback() {
  const done = useMotionValue(1);
  const steps = CHAPTERS.filter((c) => c.tag);

  return (
    <section className="relative border-b border-steel-line py-24 md:py-32" aria-labelledby="film-h">
      <div className="pointer-events-none absolute inset-0 tech-grid opacity-25" aria-hidden />
      <div className="relative mx-auto w-full max-w-[1400px] px-6 lg:px-10">
        <p className="mono-label mb-5 text-amber">
          Endüstriyel kazalardan korunma · İstanbul
        </p>
        <h1 id="film-h" className="display max-w-[16ch] text-[clamp(2.4rem,6vw,5rem)] text-chalk">
          Patlama 300 milisaniye sürer.
        </h1>
        <p className="display mt-4 text-[clamp(1.2rem,2.6vw,2.1rem)] text-amber">
          Karar 15’inci milisaniyede verilir.
        </p>

        <div className="mt-14 grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-16">
          <ol className="border-t border-steel-line">
            {steps.map((s, i) => (
              <Reveal key={s.at} delay={i * 0.04} as="li">
                <div className="flex gap-4 border-b border-steel-line py-3.5">
                  <span className="mono-label pt-0.5 text-amber">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="flex-1">
                    <span className="block font-medium text-chalk">{s.tag}</span>
                    <span className="mt-1 block text-sm leading-relaxed text-slate-ink">
                      {s.line}
                    </span>
                  </span>
                </div>
              </Reveal>
            ))}
          </ol>

          <div>
            <div className="mb-3 flex items-baseline justify-between border-b border-steel-line pb-3">
              <span className="mono-label text-chalk">Kap basıncı / zaman</span>
              <span className="mono-label hidden text-slate-ink sm:block">
                ST1 toz · 25 m³ kap
              </span>
            </div>
            <PressureCurve progress={done} />
          </div>
        </div>
      </div>
    </section>
  );
}
