"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion, useInView, useMotionValueEvent, animate, useMotionValue, useReducedMotion } from "motion/react";
import { useEffect } from "react";
import { PressureCurve } from "./pressure-curve";
import { useScrubbed } from "./motion-primitives";
import { useIsDesktop, useIsSmallScreen } from "./use-breakpoint";

/* The incident you just watched, as the record an engineer would be handed.
   The film shows what happens; this is the datasheet the film is built on,
   and it is where the numbers can be read carefully instead of in passing. */

const PHASES = [
  {
    id: "ignition",
    tag: "0 – 15 ms",
    title: "Tutuşma",
    body: "Kap içindeki toz bulutu tutuşur. Basınç yükselmeye başlar; henüz hiçbir şey duyulmaz, görülmez.",
  },
  {
    id: "detect",
    tag: "15 ms",
    title: "Algılama",
    body: "Basınç yükselme hızı (dP/dt) eşiği aşar. Sistem kararını burada verir — alev kabı terk etmeden önce.",
  },
  {
    id: "suppress",
    tag: "55 ms",
    title: "Bastırma",
    body: "Bastırıcı madde kaba boşalır. Basınç Pred değerinde sınırlanır: kap sağlam kalır, hat izole edilir, personel korunur.",
  },
];

export function Record() {
  const wrap = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const isDesktop = useIsDesktop();
  const isSmall = useIsSmallScreen();
  const reduced = useReducedMotion();

  const scrubbed = useScrubbed(wrap);
  const played = useMotionValue(0);
  const inView = useInView(chartRef, { once: true, margin: "0px 0px -20% 0px" });

  useEffect(() => {
    if (isDesktop || !inView) return;
    if (reduced) {
      played.set(1);
      return;
    }
    const controls = animate(played, 1, { duration: 3.4, ease: [0.33, 0, 0.15, 1] });
    return () => controls.stop();
  }, [isDesktop, inView, reduced, played]);

  const progress = isDesktop ? scrubbed : played;

  const [phase, setPhase] = useState(0);
  useMotionValueEvent(progress, "change", (v) => {
    const t = v * 300;
    const next = t >= 55 ? 2 : t >= 15 ? 1 : 0;
    setPhase((p) => (p === next ? p : next));
  });

  const active = PHASES[phase];

  return (
    <section
      ref={wrap}
      id="olay-kaydi"
      className="relative border-t border-steel-line lg:h-[260vh]"
      aria-labelledby="rec-h"
    >
      <div className="flex items-center py-20 md:py-24 lg:sticky lg:top-0 lg:min-h-screen lg:py-0">
        <div className="pointer-events-none absolute inset-0 tech-grid opacity-[0.3]" aria-hidden />
        <div className="relative mx-auto w-full max-w-[1400px] px-6 lg:px-10">
          <p className="mono-label mb-5 text-amber">Olayın kaydı</p>
          <h2 id="rec-h" className="display max-w-3xl text-[clamp(1.8rem,4vw,3.2rem)] text-chalk">
            300 milisaniyenin tamamı, ölçülmüş hâliyle.
          </h2>

          <div className="mt-10 grid items-center gap-10 lg:mt-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-14">
            <div>
              <p className="max-w-lg text-[0.95rem] leading-relaxed text-slate-ink">
                ELVA, toz ve gaz patlamalarını basınç yükselme hızından
                algılayıp bastıran sistemleri tasarlar, projelendirir ve devreye
                alır. Yangın algılama ve söndürmeden aşırı basınç korumasına
                kadar tesisin tamamı için tek mühendislik sorumluluğu.
              </p>

              <div className="mt-8 min-h-[128px] border-l-2 border-amber pl-5">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={active.id}
                    initial={{ opacity: 0, y: 10, filter: "blur(8px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, y: -8, filter: "blur(8px)" }}
                    transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <div className="mono-label mb-1.5 text-amber">
                      {active.tag} · {active.title}
                    </div>
                    <p className="max-w-xl text-sm leading-relaxed text-slate-ink">
                      {active.body}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            <div ref={chartRef}>
              <div className="mb-3 flex items-baseline justify-between border-b border-steel-line pb-3">
                <span className="mono-label text-chalk">Kap basıncı / zaman</span>
                <span className="mono-label hidden text-slate-ink sm:block">
                  ST1 toz · 25 m³ kap
                </span>
              </div>
              <PressureCurve progress={progress} compact={isSmall} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
