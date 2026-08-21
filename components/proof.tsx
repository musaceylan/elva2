"use client";

import { Reveal } from "./motion-primitives";

/* Verified from elva.com.tr — no invented figures. */
const STATS = [
  { value: "20+", label: "yıl saha tecrübesi" },
  { value: "2000+", label: "tamamlanan proje" },
  { value: "9", label: "hizmet verilen endüstri" },
  { value: "İstanbul", label: "merkez · Türkiye geneli saha" },
];

/* Solution partners named on elva.com.tr/hakkimizda */
const PARTNERS = [
  "RSBP",
  "Honeywell",
  "Eaton",
  "Tyco",
  "Zook",
  "Det-Tronics",
  "Araani",
  "Ultrafog",
  "Ramco",
];

export function Proof() {
  return (
    <section className="bg-paper text-ink py-20 md:py-28" aria-labelledby="proof-h">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
        <h2 id="proof-h" className="sr-only">
          Kurumsal güvenilirlik
        </h2>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-paper-line border border-paper-line">
          {STATS.map((s, i) => (
            <Reveal key={s.label} delay={i * 0.07}>
              <div className="bg-paper px-6 py-8 h-full">
                <div className="display text-[clamp(2.2rem,4vw,3.4rem)] text-ink">
                  {s.value}
                </div>
                <div className="mono-label text-ink/55 mt-2">{s.label}</div>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.15}>
          <div className="mt-14 flex flex-col lg:flex-row lg:items-center gap-6 lg:gap-12">
            <p className="mono-label text-ink/50 shrink-0 lg:max-w-[9rem]">
              Çözüm ortaklarımız
            </p>
            <ul className="flex flex-wrap items-center gap-x-9 gap-y-4">
              {PARTNERS.map((p) => (
                <li
                  key={p}
                  className="display text-lg md:text-xl text-ink/70 tracking-tight"
                >
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
