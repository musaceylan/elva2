"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Plus } from "lucide-react";
import { Reveal } from "./motion-primitives";

/* Product families exactly as ELVA structures them, grouped by the hazard
   each one answers. The grouping is the information — these are not steps,
   so they are labelled by hazard domain rather than numbered. */
const FAMILIES = [
  {
    hazard: "Patlama",
    title: "Patlama önleme sistemleri",
    lede: "Toz ve gaz deflagrasyonunu kabın içinde bitirir; alevin hatta yayılmasını engeller.",
    items: [
      "Patlama kapakları",
      "Alevsiz tahliye",
      "Patlama izolasyonu",
      "Patlama sönümleme",
      "Kıvılcım algılama ve söndürme",
    ],
  },
  {
    hazard: "Aşırı basınç",
    title: "Aşırı basınçtan korunma",
    lede: "Basınca bağlı plansız duruşları, ekipman hasarını ve zaman kaybını önler.",
    items: ["Patlama diskleri", "Basınç aktivasyon çözümleri", "Flanş koruyucular"],
  },
  {
    hazard: "Yangın",
    title: "Yangın algılama sistemleri",
    lede: "Duman, alev, gaz ve sıcaklığı kaynağında yakalar — her saniye sayılır.",
    items: [
      "Adresli yangın alarm sistemleri",
      "Konvansiyonel yangın alarm sistemleri",
      "Hava örneklemeli algılama",
      "Video yangın algılama",
      "Alev dedektörleri",
      "Kablo tipi dedektörler",
      "Gaz algılama sistemleri",
    ],
  },
  {
    hazard: "Yangın",
    title: "Yangın söndürme sistemleri",
    lede: "Ortama ve riske göre seçilen otomatik söndürme; varlık ve süreklilik koruması.",
    items: [
      "Gazlı söndürme sistemleri",
      "Su sisi sistemleri",
      "Köpüklü söndürme sistemleri",
      "Sulu söndürme sistemleri",
      "Pano içi söndürme sistemleri",
    ],
  },
  {
    hazard: "Zone",
    title: "Ex-proof ürünler",
    lede: "Patlayıcı ortam sınıflandırması yapılmış zonlar için sertifikalı ekipman.",
    items: ["Ex-proof aydınlatma, buat ve ekipman çözümleri"],
  },
];

export function Systems() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section
      id="sistemler"
      className="py-24 md:py-32 border-t border-steel-line"
      aria-labelledby="sys-h"
    >
      <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
        <div className="grid lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-10 lg:gap-20">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <Reveal>
              <p className="mono-label text-amber mb-5">Ürünler & sistemler</p>
            </Reveal>
            <Reveal delay={0.06}>
              <h2
                id="sys-h"
                className="display text-[clamp(2rem,4.4vw,3.6rem)] text-chalk"
              >
                Tek risk için tek
                <br />
                ürün yetmez.
              </h2>
            </Reveal>
            <Reveal delay={0.12}>
              <p className="mt-6 text-slate-ink leading-relaxed max-w-md">
                Bir tesiste yangın, patlama ve aşırı basınç riskleri iç içe
                geçer. ELVA bu risklerin tamamını tek mühendislik sorumluluğu
                altında ele alır: tasarım, projelendirme, uygulama ve devreye
                alma.
              </p>
            </Reveal>
          </div>

          <ul className="border-t border-steel-line">
            {FAMILIES.map((f, i) => {
              const isOpen = open === i;
              return (
                <Reveal key={f.title} delay={i * 0.05} as="li">
                  <div className="border-b border-steel-line">
                    <button
                      onClick={() => setOpen(isOpen ? null : i)}
                      aria-expanded={isOpen}
                      className="group w-full flex items-start gap-5 py-7 text-left cursor-pointer"
                    >
                      <span className="mono-label text-slate-ink pt-2 w-24 shrink-0 group-hover:text-amber transition-colors duration-200">
                        {f.hazard}
                      </span>
                      <span className="flex-1">
                        <span className="display block text-[clamp(1.3rem,2.4vw,2rem)] text-chalk group-hover:text-amber transition-colors duration-200">
                          {f.title}
                        </span>
                        <span className="block mt-2 text-sm text-slate-ink leading-relaxed max-w-lg">
                          {f.lede}
                        </span>
                      </span>
                      <Plus
                        size={20}
                        className="mt-2 shrink-0 text-slate-ink transition-transform duration-300 group-hover:text-amber"
                        style={{
                          transform: isOpen ? "rotate(45deg)" : "rotate(0deg)",
                        }}
                        aria-hidden
                      />
                    </button>

                    <motion.div
                      initial={false}
                      animate={{
                        height: isOpen ? "auto" : 0,
                        opacity: isOpen ? 1 : 0,
                      }}
                      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <ul className="pb-7 pl-0 sm:pl-[7.25rem] flex flex-wrap gap-2">
                        {f.items.map((it) => (
                          <li
                            key={it}
                            className="mono-label border border-steel-line px-3 py-2 text-slate-ink"
                          >
                            {it}
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  </div>
                </Reveal>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
