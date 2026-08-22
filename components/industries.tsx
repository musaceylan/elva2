"use client";

import { asset } from "@/lib/asset";

import Image from "next/image";
import { useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent } from "motion/react";
import { useScrubbed } from "./motion-primitives";
import { useIsDesktop } from "./use-breakpoint";

/* The nine sectors ELVA serves, each with the hazard that actually drives
   protection design there. Scrolling moves through them; the photograph
   behind the type changes with a wipe rather than a dissolve. */
const INDUSTRIES = [
  { name: "Kimya & Petrokimya", risk: "Gaz ve buhar patlaması", img: "/img/ind-kimya.webp", alt: "Kimya ve petrokimya tesisi boru hatları" },
  { name: "Petrol & Doğalgaz", risk: "Hidrokarbon yangını", img: "/img/ind-petrol.webp", alt: "Açık deniz petrol platformu" },
  { name: "Makine & Üretim", risk: "Metal tozu, kıvılcım", img: "/img/ind-makine.webp", alt: "Üretim hattında endüstriyel makineler" },
  { name: "Gıda", risk: "Nişasta, un, şeker tozu", img: "/img/ind-gida.webp", alt: "Gıda üretim tesisi" },
  { name: "İlaç", risk: "API tozu, çözücü buharı", img: "/img/ind-ilac.webp", alt: "İlaç üretim tesisi" },
  { name: "Ağaç & Kağıt", risk: "Ahşap tozu, elyaf", img: "/img/ind-kagit.webp", alt: "Ağaç ve kağıt işleme tesisi" },
  { name: "Demir & Çelik", risk: "Yüksek sıcaklık, cüruf", img: "/img/ind-celik.webp", alt: "Demir çelik fabrikasında ergimiş metal" },
  { name: "Enerji", risk: "Kömür tozu, biyokütle", img: "/img/ind-enerji.webp", alt: "Enerji santrali" },
  { name: "Veri Merkezleri & Kütüphaneler", risk: "Elektriksel yangın", img: "/img/ind-veri.webp", alt: "Veri merkezi sunucu koridoru" },
];

export function Industries() {
  const wrap = useRef<HTMLDivElement>(null);
  const isDesktop = useIsDesktop();
  const progress = useScrubbed(wrap);
  const [active, setActive] = useState(0);

  useMotionValueEvent(progress, "change", (v) => {
    if (!isDesktop) return;
    const idx = Math.min(INDUSTRIES.length - 1, Math.floor(v * INDUSTRIES.length));
    setActive((a) => (a === idx ? a : idx));
  });

  const current = INDUSTRIES[active];

  return (
    <section
      id="endustriler"
      ref={wrap}
      className="relative lg:h-[420vh] border-t border-steel-line"
      aria-labelledby="ind-h"
    >
      <div className="lg:sticky lg:top-0 lg:h-screen flex items-center overflow-hidden py-20 lg:py-0">
        {/* ---------- the plate: photography fills the frame behind the type ---------- */}
        <div className="absolute inset-0" aria-hidden>
          <AnimatePresence initial={false}>
            <motion.div
              key={current.img}
              className="absolute inset-0"
              initial={{ clipPath: "inset(0 0 100% 0)", scale: 1.12 }}
              animate={{ clipPath: "inset(0 0 0% 0)", scale: 1 }}
              exit={{ opacity: 1 }}
              transition={{
                clipPath: { duration: 0.9, ease: [0.16, 1, 0.3, 1] },
                scale: { duration: 1.8, ease: [0.16, 1, 0.3, 1] },
              }}
            >
              <Image
                src={asset(current.img)}
                alt=""
                width={1200}
                height={600}
                loading="lazy"
                // Stripped of colour so nine unrelated stock frames read as
                // one system rather than nine different palettes.
                className="h-full w-full object-cover grayscale contrast-125"
              />
            </motion.div>
          </AnimatePresence>
          {/* hold the type legible over any frame, from every direction */}
          <div className="absolute inset-0 bg-graphite/82" />
          <div className="absolute inset-0 bg-gradient-to-r from-graphite via-graphite/85 to-graphite/60" />
          <div className="absolute inset-0 bg-gradient-to-t from-graphite via-transparent to-graphite" />
          {/* a breath of brand warmth over the monochrome plate */}
          <div className="absolute inset-0 bg-amber/8 mix-blend-overlay" />
        </div>

        <div className="relative mx-auto w-full max-w-[1400px] px-6 lg:px-10">
          <p className="mono-label text-amber mb-5">Endüstriler</p>
          <h2
            id="ind-h"
            className="display text-[clamp(1.8rem,3.6vw,3rem)] text-chalk max-w-xl"
          >
            Her sektörün kendi tozu, kendi riski var.
          </h2>

          <div className="mt-10 grid lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] gap-10 lg:gap-16 items-start">
            {/* ---------- the roll ---------- */}
            <ul className="border-t border-steel-line/60">
              {INDUSTRIES.map((ind, i) => {
                const on = i === active;
                return (
                  <li key={ind.name} className="border-b border-steel-line/60">
                    <button
                      onClick={() => setActive(i)}
                      aria-current={on}
                      className="group w-full flex items-baseline gap-4 py-3.5 min-h-11 text-left cursor-pointer"
                    >
                      <span
                        className={`mono-label transition-colors duration-300 ${
                          on ? "text-amber" : "text-slate-ink"
                        }`}
                      >
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span
                        className={`display text-[clamp(1.05rem,2vw,1.6rem)] transition-all duration-300 ${
                          on
                            ? "text-chalk translate-x-1"
                            : "text-slate-ink group-hover:text-chalk"
                        }`}
                      >
                        {ind.name}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            {/* ---------- the read-out for the active sector ---------- */}
            <div className="lg:pt-4">
              <div className="border border-steel-line bg-graphite/70 backdrop-blur-sm">
                <div className="relative aspect-[2/1] overflow-hidden">
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.div
                      key={current.img}
                      className="absolute inset-0"
                      initial={{ clipPath: "inset(0 100% 0 0)" }}
                      animate={{ clipPath: "inset(0 0% 0 0)" }}
                      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <Image
                        src={asset(current.img)}
                        alt={current.alt}
                        width={1200}
                        height={600}
                        loading="lazy"
                        // The specimen keeps some colour so the sector stays
                        // recognisable, but pulled back into the palette.
                        className="h-full w-full object-cover saturate-[0.45] contrast-110"
                      />
                      <div
                        className="absolute inset-0 bg-graphite/20"
                        aria-hidden
                      />
                    </motion.div>
                  </AnimatePresence>
                </div>
                <div className="px-5 py-4 border-t border-steel-line">
                  <div className="mono-label text-slate-ink mb-1.5">
                    Baskın risk
                  </div>
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={current.risk}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.3 }}
                      className="text-chalk"
                    >
                      {current.risk}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>

              <p className="mt-5 text-sm text-slate-ink leading-relaxed">
                Koruma tasarımı malzemenin patlayabilirlik karakteristiğine göre
                yapılır. Toz numunenizin Kst ve Pmax değerleri belirlenmeden
                doğru sistem seçilemez.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
