"use client";

import { asset } from "@/lib/asset";

import {
  AnimatePresence,
  animate,
  motion,
  useInView,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { PressureCurve } from "./pressure-curve";
import { SplitWords, useScrubbed } from "./motion-primitives";
import { useIsDesktop, useIsSmallScreen } from "./use-breakpoint";

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

export function Hero() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const isDesktop = useIsDesktop();
  const isSmall = useIsSmallScreen();
  const reduced = useReducedMotion();

  // Desktop: scroll scrubs the trace across a pinned section.
  const scrubbed = useScrubbed(wrapRef);

  // Mobile: the section is not pinned, so the trace plays once on entry.
  const played = useMotionValue(0);
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInView = useInView(chartRef, { once: true, margin: "0px 0px -20% 0px" });

  useEffect(() => {
    if (isDesktop || !chartInView) return;
    if (reduced) {
      played.set(1);
      return;
    }
    const controls = animate(played, 1, { duration: 3.4, ease: [0.33, 0, 0.15, 1] });
    return () => controls.stop();
  }, [isDesktop, chartInView, reduced, played]);

  const progress = isDesktop ? scrubbed : played;

  // The plate settles and fades as the event advances.
  const plateY = useTransform(scrubbed, [0, 1], [0, -60]);
  const plateOpacity = useTransform(scrubbed, [0, 0.7], [1, 0.25]);

  const [phase, setPhase] = useState(0);
  useMotionValueEvent(progress, "change", (v) => {
    const t = v * 300;
    const next = t >= 55 ? 2 : t >= 15 ? 1 : 0;
    setPhase((p) => (p === next ? p : next));
  });

  const active = PHASES[phase];

  return (
    <div ref={wrapRef} className="relative lg:h-[320vh]">
      <div className="lg:sticky lg:top-0 lg:h-screen flex items-center overflow-hidden pt-28 pb-16 lg:py-0">
        {/* Atmospheric plate: the equipment sits low and dark behind the
            content, giving the section depth without competing with the
            trace. It drifts on scroll and is masked out before it reaches
            the type. */}
        <motion.div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[62%] hidden md:block"
          style={reduced ? undefined : { y: plateY, opacity: plateOpacity }}
          aria-hidden
        >
          <Image
            src={asset("/img/hero-equipment.webp")}
            alt=""
            width={1800}
            height={469}
            priority
            className="h-full w-full object-cover object-center opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-graphite via-graphite/70 to-graphite" />
        </motion.div>

        <div
          className="pointer-events-none absolute inset-0 tech-grid opacity-[0.35]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-graphite via-transparent to-graphite"
          aria-hidden
        />

        <div className="relative mx-auto w-full max-w-[1400px] px-6 lg:px-10">
          <div className="grid lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] gap-12 lg:gap-16 items-center">
            {/* ---------------- left: thesis ---------------- */}
            <div>
              <motion.p
                className="mono-label text-amber mb-5"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.15, duration: 0.6 }}
              >
                Endüstriyel kazalardan korunma · İstanbul
              </motion.p>

              <h1 className="display text-[clamp(2.5rem,6.2vw,5.2rem)] text-chalk">
                <SplitWords text="Patlama 300" delay={0.25} />
                <br />
                <SplitWords text="milisaniye sürer." delay={0.35} />
              </h1>

              <motion.p
                className="display text-[clamp(1.25rem,2.6vw,2.1rem)] text-amber mt-5"
                initial={{ opacity: 0, filter: "blur(12px)" }}
                animate={{ opacity: 1, filter: "blur(0px)" }}
                transition={{ delay: 0.85, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              >
                Karar 15’inci milisaniyede verilir.
              </motion.p>

              <motion.p
                className="mt-6 max-w-lg text-[0.95rem] leading-relaxed text-slate-ink"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              >
                ELVA, toz ve gaz patlamalarını basınç yükselme hızından algılayıp
                bastıran sistemleri tasarlar, projelendirir ve devreye alır.
                Yangın algılama ve söndürmeden aşırı basınç korumasına kadar
                tesisin tamamı için tek mühendislik sorumluluğu.
              </motion.p>

              <motion.div
                className="mt-8 flex flex-wrap items-center gap-3 sm:gap-4"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.15, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              >
                <a
                  href="#iletisim"
                  className="group inline-flex items-center gap-2.5 bg-amber px-6 py-3.5 text-graphite font-semibold hover:bg-amber-soft transition-colors duration-200"
                >
                  Risk analizi talep edin
                  <ArrowRight
                    size={18}
                    className="transition-transform duration-200 group-hover:translate-x-1"
                  />
                </a>
                <a
                  href="#sistemler"
                  className="inline-flex items-center gap-2 border border-steel-line px-6 py-3.5 text-chalk hover:border-amber hover:text-amber transition-colors duration-200"
                >
                  Sistemleri inceleyin
                </a>
              </motion.div>
            </div>

            {/* ---------------- right: the instrument ---------------- */}
            <motion.div
              ref={chartRef}
              initial={{ opacity: 0, filter: "blur(18px)" }}
              animate={{ opacity: 1, filter: "blur(0px)" }}
              transition={{ delay: 0.5, duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="flex items-baseline justify-between mb-3 border-b border-steel-line pb-3">
                <span className="mono-label text-chalk">Kap basıncı / zaman</span>
                <span className="mono-label text-slate-ink hidden sm:block">
                  ST1 toz · 25 m³ kap
                </span>
              </div>

              <PressureCurve progress={progress} compact={isSmall} />

              <div className="mt-5 min-h-[112px] sm:min-h-[104px] border-l-2 border-amber pl-5">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={active.id}
                    initial={{ opacity: 0, y: 10, filter: "blur(8px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, y: -8, filter: "blur(8px)" }}
                    transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <div className="mono-label text-amber mb-1.5">
                      {active.tag} · {active.title}
                    </div>
                    <p className="text-sm leading-relaxed text-slate-ink max-w-xl">
                      {active.body}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        </div>

        {/* scroll affordance — desktop only; on mobile the trace self-plays */}
        <motion.div
          className="hidden lg:block absolute bottom-6 left-1/2 -translate-x-1/2 mono-label text-slate-ink"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 1, 0.4] }}
          transition={{ delay: 1.6, duration: 2.4, times: [0, 0.3, 0.7, 1] }}
        >
          Kaydırın — olayı ilerletin
        </motion.div>
      </div>
    </div>
  );
}
