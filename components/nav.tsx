"use client";

import { motion, useMotionValueEvent, useScroll } from "motion/react";
import { useState } from "react";
import { Menu, X } from "lucide-react";

const LINKS = [
  { href: "#sistemler", label: "Sistemler" },
  { href: "#endustriler", label: "Endüstriler" },
  { href: "#hizmetler", label: "Hizmetler" },
  { href: "#kurum", label: "Kurumsal" },
];

export function Nav() {
  const { scrollY } = useScroll();
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);

  useMotionValueEvent(scrollY, "change", (v) => setSolid(v > 40));

  return (
    <motion.header
      className="fixed inset-x-0 top-0 z-50 transition-colors duration-300"
      style={{
        backgroundColor: solid ? "rgba(14,16,19,0.88)" : "transparent",
        backdropFilter: solid ? "blur(12px)" : "none",
        borderBottom: solid
          ? "1px solid var(--color-steel-line)"
          : "1px solid transparent",
      }}
    >
      <nav
        className="mx-auto max-w-[1400px] px-6 lg:px-10 h-16 flex items-center justify-between"
        aria-label="Ana menü"
      >
        <a href="#main" className="flex items-center gap-2.5" aria-label="ELVA ana sayfa">
          <Wordmark />
        </a>

        <div className="hidden md:flex items-center gap-8">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm text-slate-ink hover:text-chalk transition-colors duration-200"
            >
              {l.label}
            </a>
          ))}
          <a
            href="#iletisim"
            className="bg-amber px-5 py-2.5 text-sm font-semibold text-graphite hover:bg-amber-soft transition-colors duration-200"
          >
            Risk analizi
          </a>
        </div>

        <button
          className="md:hidden text-chalk p-2 -mr-2"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={open ? "Menüyü kapat" : "Menüyü aç"}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      {open && (
        <motion.div
          className="md:hidden border-t border-steel-line bg-graphite-deep px-6 py-5"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          transition={{ duration: 0.25 }}
        >
          <ul className="flex flex-col gap-1">
            {LINKS.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="block py-3 text-chalk"
                >
                  {l.label}
                </a>
              </li>
            ))}
            <li className="pt-3">
              <a
                href="#iletisim"
                onClick={() => setOpen(false)}
                className="block bg-amber px-5 py-3 text-center font-semibold text-graphite"
              >
                Risk analizi talep edin
              </a>
            </li>
          </ul>
        </motion.div>
      )}
    </motion.header>
  );
}

/* ELVA wordmark rebuilt as type + the logo's stacked-bar motif */
function Wordmark() {
  return (
    <span className="flex items-center gap-2">
      <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden>
        <rect x="0" y="1" width="22" height="4.5" fill="var(--color-amber)" />
        <rect x="0" y="8.75" width="16" height="4.5" fill="var(--color-amber)" />
        <rect x="0" y="16.5" width="22" height="4.5" fill="var(--color-amber)" />
      </svg>
      <span className="display text-xl tracking-tight text-chalk">ELVA</span>
    </span>
  );
}
