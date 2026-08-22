"use client";

import { asset } from "@/lib/asset";

import { Reveal } from "./motion-primitives";
import { ArrowRight, Mail, MapPin, Phone } from "lucide-react";
import { RevealImage } from "./image-primitives";

/* ------------------------------------------------------------------
   Services — the three ELVA sells, presented as the sequence a plant
   actually moves through. Order carries meaning here.
   ------------------------------------------------------------------ */
const SERVICES = [
  {
    step: "Önce",
    title: "Yangın ve patlama risk analizi",
    body: "Tesis, proses ve malzeme bazında risk haritası çıkarılır. Hangi ekipmanın korunması gerektiği, hangi standardın uygulanacağı burada belirlenir.",
  },
  {
    step: "Sonra",
    title: "Toz patlaması testi",
    body: "Numunenizin Kst, Pmax, MIE ve MIT değerleri ölçülür. Koruma hesabı bu verilerle yapılır — varsayımla değil.",
  },
  {
    step: "Sürekli",
    title: "Periyodik bakım ve muayene",
    body: "Kurulan sistemin çalışır kalması denetime tabidir. Devreye alma sonrası bakım, test ve raporlama ELVA sorumluluğundadır.",
  },
];

export function Services() {
  return (
    <section
      id="hizmetler"
      className="bg-paper text-ink py-24 md:py-32"
      aria-labelledby="srv-h"
    >
      <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
        <Reveal>
          <p className="mono-label text-ink/50 mb-5">Servis ve hizmetler</p>
        </Reveal>
        <Reveal delay={0.06}>
          <h2
            id="srv-h"
            className="display text-[clamp(1.9rem,4vw,3.2rem)] max-w-2xl"
          >
            Ürün satmadan önce riski ölçeriz.
          </h2>
        </Reveal>

        <div className="mt-12 grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-10 lg:gap-16 items-start">
          {/* The wipe runs left-to-right here so it reads against the
              top-to-bottom wipes used on the dark sections. */}
          <RevealImage
            src={asset("/img/srv-analiz.webp")}
            alt="ELVA mühendisi tesiste yangın ve patlama risk analizi yaparken"
            from="left"
            tint={false}
            className="aspect-[2/1] lg:aspect-[4/5] border border-paper-line"
          />

          <div className="grid sm:grid-cols-2 lg:grid-cols-1 gap-8 lg:gap-0">
            {SERVICES.map((s, i) => (
              <Reveal key={s.title} delay={0.08 + i * 0.08}>
                <div className="border-t-2 border-ink pt-6 lg:pb-8">
                  <div className="mono-label text-ink/50 mb-3">{s.step}</div>
                  <h3 className="display text-xl md:text-2xl mb-3">{s.title}</h3>
                  <p className="text-sm leading-relaxed text-ink/70 max-w-lg">
                    {s.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------
   Confidentiality — ELVA's genuine differentiator. They deliberately
   do not publish a client list; that is a positioning statement, so
   it gets treated as one rather than hidden on a sub-page.
   ------------------------------------------------------------------ */
export function Confidentiality() {
  return (
    <section
      id="kurum"
      className="py-24 md:py-32 border-t border-steel-line"
      aria-labelledby="conf-h"
    >
      <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div>
            <Reveal>
              <p className="mono-label text-amber mb-5">Referanslar</p>
            </Reveal>
            <Reveal delay={0.06}>
              <h2
                id="conf-h"
                className="display text-[clamp(1.9rem,4vw,3.4rem)] text-chalk"
              >
                Müşteri listemizi
                <br />
                yayınlamıyoruz.
              </h2>
            </Reveal>
            <Reveal delay={0.12}>
              <p className="mt-6 text-slate-ink leading-relaxed max-w-lg">
                İş ortaklarımızın ticari gizliliği ve tesis güvenliği bizim için
                pazarlama malzemesinden önce gelir. Bir tesisin hangi noktalarda
                korunduğu bilgisi, o tesisin güvenlik zafiyeti haritasıdır.
              </p>
            </Reveal>
            <Reveal delay={0.18}>
              <p className="mt-4 text-slate-ink leading-relaxed max-w-lg">
                Sektörel deneyimimizi ve tamamladığımız projeleri, talep üzerine
                size özel hazırlanan referans dosyasıyla paylaşıyoruz.
              </p>
            </Reveal>
            <Reveal delay={0.24}>
              <a
                href="#iletisim"
                className="group mt-8 inline-flex items-center gap-2.5 border border-amber px-6 py-3.5 text-amber hover:bg-amber hover:text-graphite transition-colors duration-200"
              >
                Referans dosyası talep edin
                <ArrowRight
                  size={18}
                  className="transition-transform duration-200 group-hover:translate-x-1"
                />
              </a>
            </Reveal>
          </div>

          <Reveal delay={0.1}>
            <div className="border border-steel-line p-8 md:p-12 tech-grid">
              <div className="display text-[clamp(3.5rem,9vw,7rem)] text-amber leading-none">
                2000+
              </div>
              <div className="mono-label text-chalk mt-3">
                tamamlanan proje
              </div>
              <div className="h-px bg-steel-line my-8" />
              <div className="display text-[clamp(2rem,5vw,3.5rem)] text-chalk leading-none">
                20 yıl+
              </div>
              <div className="mono-label text-slate-ink mt-3">
                saha ve mühendislik tecrübesi
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------
   Final CTA + footer
   ------------------------------------------------------------------ */
export function FinalCta() {
  return (
    <section
      id="iletisim"
      className="border-t border-steel-line py-24 md:py-36"
      aria-labelledby="cta-h"
    >
      <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
        <div className="grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] gap-12 lg:gap-20">
          <div>
            <Reveal>
              <h2
                id="cta-h"
                className="display text-[clamp(2.2rem,5.5vw,4.5rem)] text-chalk"
              >
                Tesisinizde hangi
                <br />
                risk var?
              </h2>
            </Reveal>
            <Reveal delay={0.08}>
              <p className="mt-6 text-slate-ink leading-relaxed max-w-lg">
                Risk analizi talebinizle başlıyoruz. Prosesinizi ve
                malzemenizi inceleyip hangi korumanın gerektiğini, hangi
                standardın uygulanacağını netleştiriyoruz.
              </p>
            </Reveal>
            <Reveal delay={0.14}>
              <a
                href="mailto:info@elva.com.tr?subject=Risk%20analizi%20talebi"
                className="group mt-9 inline-flex items-center gap-3 bg-amber px-8 py-4.5 text-graphite font-semibold text-lg hover:bg-amber-soft transition-colors duration-200"
              >
                Risk analizi talep edin
                <ArrowRight
                  size={20}
                  className="transition-transform duration-200 group-hover:translate-x-1"
                />
              </a>
            </Reveal>
          </div>

          <Reveal delay={0.1}>
            <ul className="space-y-px bg-steel-line border border-steel-line">
              <ContactRow
                icon={<Phone size={18} />}
                label="Telefon"
                value="+90 216 364 35 82"
                href="tel:+902163643582"
              />
              <ContactRow
                icon={<Mail size={18} />}
                label="E-posta"
                value="info@elva.com.tr"
                href="mailto:info@elva.com.tr"
              />
              <ContactRow
                icon={<MapPin size={18} />}
                label="Adres"
                value="Şerifali Mah. Hattat Sok. No: 14/2, 34775 Ümraniye, İstanbul"
              />
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function ContactRow({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href?: string;
}) {
  const inner = (
    <div className="bg-graphite px-6 py-6 flex gap-4 items-start h-full">
      <span className="text-amber mt-0.5 shrink-0" aria-hidden>
        {icon}
      </span>
      <span>
        <span className="mono-label text-slate-ink block mb-1.5">{label}</span>
        <span className="text-chalk leading-relaxed">{value}</span>
      </span>
    </div>
  );
  return (
    <li>
      {href ? (
        <a
          href={href}
          className="block hover:bg-steel transition-colors duration-200"
        >
          {inner}
        </a>
      ) : (
        inner
      )}
    </li>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-steel-line py-12">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="flex items-center gap-2.5">
          <svg width="20" height="20" viewBox="0 0 22 22" aria-hidden>
            <rect x="0" y="1" width="22" height="4.5" fill="var(--color-amber)" />
            <rect x="0" y="8.75" width="16" height="4.5" fill="var(--color-amber)" />
            <rect x="0" y="16.5" width="22" height="4.5" fill="var(--color-amber)" />
          </svg>
          <span className="display text-lg text-chalk">ELVA</span>
          <span className="mono-label text-slate-ink ml-2">
            Daima en güvenlisi için
          </span>
        </div>
        <p className="mono-label text-slate-ink">
          © {new Date().getFullYear()} ELVA Mühendislik · Tüm hakları saklıdır
        </p>
      </div>
    </footer>
  );
}
