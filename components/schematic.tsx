"use client";

import { useRef, useState } from "react";
import { motion, useMotionValueEvent } from "motion/react";
import { useScrubbed } from "./motion-primitives";
import { useIsDesktop } from "./use-breakpoint";

/* A dust collector protection scheme — the arrangement ELVA actually
   engineers. Callouts are keyed to the drawing, which is the standard
   convention for a technical legend. */
const PARTS = [
  {
    key: "01",
    name: "Kıvılcım algılama ve söndürme",
    body: "Emiş hattındaki kıvılcım, filtreye ulaşmadan optik dedektörle yakalanır ve su sisiyle söndürülür.",
  },
  {
    key: "02",
    name: "Patlama izolasyonu",
    body: "Deflagrasyon başlarsa hızlı kapanan vana alevin ve basıncın hat boyunca yayılmasını keser.",
  },
  {
    key: "03",
    name: "Basınç dedektörü",
    body: "Kap içindeki basınç yükselme hızını (dP/dt) izler. Bastırma kararını veren eleman budur.",
  },
  {
    key: "04",
    name: "Patlama kapağı / alevsiz tahliye",
    body: "Basınç tahliye edilir. Kapalı alanlarda alevsiz tahliye ünitesi alevi dışarı vermeden söndürür.",
  },
  {
    key: "05",
    name: "HRD bastırma ünitesi",
    body: "Yüksek hızlı boşaltma şişesi bastırıcı maddeyi kaba enjekte eder; basınç Pred’de sınırlanır.",
  },
];

export function Schematic() {
  const wrap = useRef<HTMLDivElement>(null);
  const isDesktop = useIsDesktop();
  const progress = useScrubbed(wrap);
  const [active, setActive] = useState(0);

  // Desktop drives the callout from scroll; on mobile the list is tappable.
  useMotionValueEvent(progress, "change", (v) => {
    if (!isDesktop) return;
    const idx = Math.min(PARTS.length - 1, Math.floor(v * PARTS.length));
    setActive((a) => (a === idx ? a : idx));
  });

  return (
    <section
      ref={wrap}
      className="relative lg:h-[300vh] border-t border-steel-line"
      aria-labelledby="sch-h"
    >
      <div className="lg:sticky lg:top-0 lg:min-h-screen flex items-center py-20 md:py-24">
        <div className="mx-auto w-full max-w-[1400px] px-6 lg:px-10">
          <p className="mono-label text-amber mb-5">Koruma şeması</p>
          <h2
            id="sch-h"
            className="display text-[clamp(1.8rem,4vw,3.2rem)] text-chalk max-w-2xl"
          >
            Bir toz toplama ünitesi böyle korunur.
          </h2>

          <div className="mt-10 lg:mt-12 grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] gap-10 lg:gap-14 items-center">
            <Drawing active={active} compact={!isDesktop} />

            <ul>
              {PARTS.map((p, i) => {
                const on = i === active;
                return (
                  <li key={p.key}>
                    <button
                      onClick={() => setActive(i)}
                      className="w-full text-left flex gap-4 py-4 border-b border-steel-line cursor-pointer"
                      aria-current={on}
                    >
                      <span
                        className={`mono-label pt-1 transition-colors duration-300 ${
                          on ? "text-amber" : "text-slate-ink"
                        }`}
                      >
                        {p.key}
                      </span>
                      <span className="flex-1">
                        <span
                          className={`block font-medium transition-colors duration-300 ${
                            on ? "text-chalk" : "text-slate-ink"
                          }`}
                        >
                          {p.name}
                        </span>
                        <motion.span
                          initial={false}
                          animate={{ height: on ? "auto" : 0, opacity: on ? 1 : 0 }}
                          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                          className="block overflow-hidden"
                        >
                          <span className="block pt-2 text-sm leading-relaxed text-slate-ink">
                            {p.body}
                          </span>
                        </motion.span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function Drawing({ active, compact }: { active: number; compact: boolean }) {
  const lit = (i: number) =>
    active === i ? "var(--color-amber)" : "var(--color-steel-line)";
  const litW = (i: number) => (active === i ? 2.5 : 1.5);
  const tagSize = compact ? 22 : 14;

  return (
    <svg
      viewBox="46 56 700 448"
      className="w-full h-auto"
      role="img"
      aria-label="Toz toplama ünitesi koruma şeması: emiş hattında kıvılcım algılama ve patlama izolasyonu, kap üzerinde basınç dedektörü, patlama kapağı ve HRD bastırma ünitesi."
    >
      {/* ---------- process equipment ---------- */}
      <g stroke="var(--color-slate-ink)" strokeWidth="1.75" fill="none">
        <path d="M60 250 H340" />
        <path d="M60 290 H340" />
        <path d="M340 150 H560 V330 H340 Z" />
        <path d="M340 330 L440 440 H460 L560 330" />
        <rect x="418" y="440" width="64" height="30" />
        <circle cx="450" cy="455" r="10" />
        <path d="M424 150 V70" />
        <path d="M476 150 V70" />
      </g>

      <g stroke="var(--color-steel-line)" strokeWidth="1" opacity="0.85">
        {[370, 400, 430, 460, 490, 520].map((x) => (
          <line key={x} x1={x} y1={170} x2={x} y2={300} />
        ))}
      </g>

      <g fill="var(--color-slate-ink)" opacity="0.6">
        <path d="M150 262 l14 8 -14 8 Z" />
        <path d="M230 262 l14 8 -14 8 Z" />
        <path d="M443 120 l7 -14 7 14 Z" />
      </g>

      {/* ---------- 01 spark detection ---------- */}
      <g>
        <circle cx="130" cy="250" r="9" fill="none" stroke={lit(0)} strokeWidth={litW(0)} />
        <line x1="130" y1="241" x2="130" y2="205" stroke={lit(0)} strokeWidth={litW(0)} />
        <rect x="112" y="185" width="36" height="20" fill="none" stroke={lit(0)} strokeWidth={litW(0)} />
        <Tag x={130} y={172} n="01" on={active === 0} size={tagSize} />
      </g>

      {/* ---------- 02 isolation valve ---------- */}
      <g>
        <rect x="272" y="240" width="36" height="60" fill="var(--color-graphite)" stroke={lit(1)} strokeWidth={litW(1)} />
        <path d="M272 240 L308 300 M308 240 L272 300" stroke={lit(1)} strokeWidth={litW(1)} />
        <Tag x={290} y={224} n="02" on={active === 1} size={tagSize} />
      </g>

      {/* ---------- 03 pressure detector ---------- */}
      <g>
        <circle cx="340" cy="185" r="10" fill="var(--color-graphite)" stroke={lit(2)} strokeWidth={litW(2)} />
        <line x1="330" y1="185" x2="272" y2="185" stroke={lit(2)} strokeWidth={litW(2)} />
        <Tag x={262} y={190} n="03" on={active === 2} size={tagSize} anchor="end" />
      </g>

      {/* ---------- 04 vent panel ---------- */}
      <g>
        <path d="M500 150 H560" stroke={lit(3)} strokeWidth={litW(3) + 1.5} />
        <path d="M505 150 L520 108 M530 150 L545 108" stroke={lit(3)} strokeWidth={litW(3)} />
        <path d="M512 108 H553" stroke={lit(3)} strokeWidth={litW(3)} />
        <Tag x={580} y={114} n="04" on={active === 3} size={tagSize} />
      </g>

      {/* ---------- 05 HRD suppression bottle ---------- */}
      <g>
        <rect x="620" y="210" width="42" height="96" rx="20" fill="var(--color-graphite)" stroke={lit(4)} strokeWidth={litW(4)} />
        <line x1="641" y1="210" x2="641" y2="196" stroke={lit(4)} strokeWidth={litW(4)} />
        <path d="M620 240 H560" stroke={lit(4)} strokeWidth={litW(4)} />
        <circle cx="641" cy="258" r="6" fill={lit(4)} />
        <Tag x={690} y={264} n="05" on={active === 4} size={tagSize} />
      </g>

      <text
        x="60"
        y="492"
        fill="var(--color-slate-ink)"
        fontSize={compact ? 19 : 12}
        fontFamily="var(--font-mono)"
        letterSpacing="0.14em"
      >
        ATEX ZONE 20 / 21 — İÇ ORTAM
      </text>
    </svg>
  );
}

function Tag({
  x,
  y,
  n,
  on,
  size,
  anchor = "middle",
}: {
  x: number;
  y: number;
  n: string;
  on: boolean;
  size: number;
  anchor?: "middle" | "end";
}) {
  return (
    <motion.text
      x={x}
      y={y}
      textAnchor={anchor}
      fontSize={size}
      fontFamily="var(--font-mono)"
      letterSpacing="0.1em"
      animate={{
        fill: on ? "var(--color-amber)" : "var(--color-slate-ink)",
        opacity: on ? 1 : 0.55,
      }}
      transition={{ duration: 0.3 }}
    >
      {n}
    </motion.text>
  );
}
