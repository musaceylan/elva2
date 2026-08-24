"use client";

import { useEffect, useRef } from "react";
import { CHAPTERS, chapterAt } from "./timeline";
import { useIncident } from "./use-incident";

/**
 * THE TYPOGRAPHY LAYER
 * ====================
 *
 * Deliberately thin. The rule for the whole film is that the visuals carry
 * the argument and the words only name what is already on screen — if the
 * caption is doing the explaining, the scene has failed.
 *
 * Everything here is written straight to the DOM from the driver tick. None
 * of it re-renders.
 */

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const ramp = (v: number, a: number, b: number) => clamp01((v - a) / (b - a));

export function Overlay() {
  const { subscribe } = useIncident();

  const hero = useRef<HTMLDivElement>(null);
  const cue = useRef<HTMLDivElement>(null);
  const capWrap = useRef<HTMLDivElement>(null);
  const capTag = useRef<HTMLDivElement>(null);
  const capLine = useRef<HTMLParagraphElement>(null);
  const brand = useRef<HTMLDivElement>(null);
  const brandA = useRef<HTMLDivElement>(null);
  const brandB = useRef<HTMLDivElement>(null);
  const brandC = useRef<HTMLDivElement>(null);
  const railFill = useRef<HTMLDivElement>(null);
  const railMs = useRef<HTMLSpanElement>(null);

  const lastChapter = useRef(-1);

  useEffect(
    () =>
      subscribe((c, p) => {
        /* ---- hero: holds the opening frame, then gets out of the way ---- */
        if (hero.current) {
          const o = 1 - ramp(p, 0.03, 0.085);
          hero.current.style.opacity = String(o);
          hero.current.style.transform = `translate3d(0, ${(-ramp(p, 0.0, 0.09) * 40).toFixed(1)}px, 0)`;
          hero.current.style.visibility = o < 0.01 ? "hidden" : "visible";
        }
        if (cue.current) cue.current.style.opacity = String((1 - ramp(p, 0.005, 0.03)) * 0.85);

        /* ---- chapter captions ---- */
        const idx = chapterAt(p);
        if (capWrap.current) {
          const active = CHAPTERS[idx].tag !== "";
          // Fade across the chapter boundary rather than swapping instantly.
          const next = CHAPTERS[Math.min(idx + 1, CHAPTERS.length - 1)];
          const toEdge = Math.min(1, (next.at - p) / 0.012);
          const fromEdge = Math.min(1, (p - CHAPTERS[idx].at) / 0.012);
          const o = active ? clamp01(Math.min(toEdge, fromEdge)) : 0;
          capWrap.current.style.opacity = String(o);
          capWrap.current.style.transform = `translate3d(0, ${((1 - o) * 12).toFixed(1)}px, 0)`;
        }
        if (idx !== lastChapter.current) {
          lastChapter.current = idx;
          if (capTag.current) capTag.current.textContent = CHAPTERS[idx].tag;
          if (capLine.current) capLine.current.textContent = CHAPTERS[idx].line;
        }

        /* ---- brand reveal, only after the viewer has watched it work ---- */
        if (brand.current) {
          const o = ramp(p, 0.952, 0.972);
          brand.current.style.opacity = String(o);
          brand.current.style.visibility = o < 0.01 ? "hidden" : "visible";
        }
        if (brandA.current) {
          const a = ramp(p, 0.955, 0.972) * (1 - ramp(p, 0.982, 0.992));
          brandA.current.style.opacity = String(a);
          brandA.current.style.transform = `translate3d(0, ${((1 - a) * 18).toFixed(1)}px, 0)`;
        }
        if (brandB.current) {
          const b = ramp(p, 0.975, 0.988);
          brandB.current.style.opacity = String(b);
          brandB.current.style.transform = `translate3d(0, ${((1 - b) * 18).toFixed(1)}px, 0)`;
        }
        if (brandC.current) {
          const g = ramp(p, 0.986, 1);
          brandC.current.style.opacity = String(g);
          brandC.current.style.letterSpacing = `${(0.5 - g * 0.42).toFixed(3)}em`;
        }

        /* ---- the scrub rail: this is a film, so show the playhead ---- */
        if (railFill.current) railFill.current.style.transform = `scaleY(${p.toFixed(4)})`;
        if (railMs.current) {
          const v = `${c.tMs.toFixed(0)} ms`;
          if (railMs.current.textContent !== v) railMs.current.textContent = v;
        }
      }),
    [subscribe],
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* ---------------- opening ---------------- */}
      <div
        ref={hero}
        className="absolute inset-x-0 top-[18vh] px-6 sm:top-[20vh] lg:px-14"
      >
        <div className="mx-auto max-w-[1400px]">
          <p className="mono-label mb-5 text-amber">
            Endüstriyel kazalardan korunma · İstanbul
          </p>
          <h1 className="display max-w-[15ch] text-[clamp(2.6rem,7vw,6.4rem)] text-chalk">
            Patlama 300 milisaniye sürer.
          </h1>
          <p className="display mt-4 text-[clamp(1.3rem,3vw,2.4rem)] text-amber">
            Karar 15’inci milisaniyede verilir.
          </p>
        </div>
      </div>

      <div
        ref={cue}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-center"
      >
        <div className="mono-label text-chalk/80">Kaydırın — müdahale edin</div>
        <div className="mt-2 text-chalk/60">↓</div>
      </div>

      {/* ---------------- chapter caption ---------------- */}
      <div
        ref={capWrap}
        className="absolute right-4 top-20 max-w-[15rem] opacity-0 sm:right-6 sm:top-28 sm:max-w-[19rem] lg:right-14"
      >
        <div className="border-r-2 border-amber pr-4 text-right">
          <div ref={capTag} className="mono-label text-amber" />
          <p ref={capLine} className="mt-2 text-[0.8rem] leading-relaxed text-chalk/75 sm:text-sm" />
        </div>
      </div>

      {/* ---------------- brand reveal ----------------
          A scrim rides with the block: the facility behind it is the point of
          the shot, so the type is lifted off it rather than the shot being
          darkened wholesale. */}
      <div
        ref={brand}
        className="absolute inset-x-0 bottom-0 flex items-end justify-center px-6 pb-[9vh] opacity-0"
        style={{ visibility: "hidden" }}
      >
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[52vh]"
          style={{
            background:
              "linear-gradient(to top, rgba(8,10,12,0.92) 8%, rgba(8,10,12,0.72) 38%, transparent 100%)",
          }}
        />
        <div className="relative mx-auto w-full max-w-[1100px] text-center">
          <div ref={brandA} className="display text-[clamp(1.6rem,4.4vw,3.4rem)] text-chalk">
            Tek risk için tek ürün yetmez.
          </div>
          <div ref={brandB} className="display text-[clamp(2rem,5.4vw,4.4rem)] text-amber opacity-0">
            Bütünsel koruma.
          </div>
          <div
            ref={brandC}
            className="display mt-7 text-[clamp(2.6rem,9vw,7rem)] text-chalk opacity-0"
            style={{ letterSpacing: "0.5em" }}
          >
            ELVA
          </div>
        </div>
      </div>

      {/* ---------------- scrub rail ---------------- */}
      <div className="absolute right-3 top-1/2 hidden h-[34vh] -translate-y-1/2 lg:block">
        <div className="relative h-full w-px bg-steel-line">
          <div
            ref={railFill}
            className="absolute inset-x-0 top-0 h-full origin-top bg-amber"
            style={{ transform: "scaleY(0)" }}
          />
          {CHAPTERS.filter((c) => c.tag).map((c) => (
            <span
              key={c.at}
              className="absolute -left-1 h-px w-2.5 bg-slate-ink"
              style={{ top: `${c.at * 100}%` }}
            />
          ))}
        </div>
        <span
          ref={railMs}
          className="mono-label absolute -left-14 top-full mt-3 text-slate-ink"
        >
          0 ms
        </span>
      </div>
    </div>
  );
}
