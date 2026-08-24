"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  P_DESIGN, P_MAX_AXIS, T_DETECT, T_MAX, T_SUPPRESS,
  buildPath, pProtected, pUnprotected,
} from "@/lib/pressure";
import { useIncident } from "./use-incident";

/* ==================================================================
   LIVE TELEMETRY

   The 300 ms pressure curve was already the strongest idea on the
   site, so it is not a separate infographic any more — it is the
   instrument reading out the incident you are watching. The clock
   ticks because the fire is burning, and every labelled millisecond
   lands on something visible in the frame:

     15 ms  the signal reaches the controller
     40 ms  the nozzles release
     55 ms  pressure is clamped at Pred

   It docks small in the corner during the event and opens up once
   the fire is out, when there is finally room to read it.
   ================================================================== */

const X0 = 46;
const X1 = 306;
const Y0 = 14;
const Y1 = 96;

const sx = (t: number) => X0 + (t / T_MAX) * (X1 - X0);
const sy = (p: number) => Y1 - (p / P_MAX_AXIS) * (Y1 - Y0);

const PATH_RISK = buildPath(pUnprotected, sx, sy, 160);
const PATH_SAFE = buildPath(pProtected, sx, sy, 160);

const MARKS = [
  { t: 0, label: "TUTUŞMA" },
  { t: T_DETECT, label: "KARAR" },
  { t: 40, label: "BOŞALTMA" },
  { t: T_SUPPRESS, label: "Pred" },
];

export function Telemetry() {
  const { subscribe } = useIncident();

  const wrap = useRef<HTMLDivElement>(null);
  const msRef = useRef<HTMLSpanElement>(null);
  const safeRef = useRef<HTMLSpanElement>(null);
  const riskRef = useRef<HTMLSpanElement>(null);
  const headRef = useRef<SVGGElement>(null);
  const dotSafe = useRef<SVGCircleElement>(null);
  const dotRisk = useRef<SVGCircleElement>(null);
  const safePath = useRef<SVGPathElement>(null);
  const riskPath = useRef<SVGPathElement>(null);
  const markRefs = useRef<(SVGGElement | null)[]>([]);
  const stateRef = useRef<HTMLSpanElement>(null);

  const lengths = useMemo(() => ({ safe: 0, risk: 0 }), []);

  useEffect(() => {
    if (safePath.current) lengths.safe = safePath.current.getTotalLength();
    if (riskPath.current) lengths.risk = riskPath.current.getTotalLength();

    return subscribe((c, p) => {
      const el = wrap.current;
      if (!el) return;

      // On screen from the moment the event has a clock worth reading, and
      // it opens out once the fire is out and there is room for it.
      const vis =
        Math.min(1, Math.max(0, (p - 0.1) / 0.05)) *
        (1 - Math.min(1, Math.max(0, (p - 0.925) / 0.02)));
      el.style.opacity = String(vis);
      const open = Math.min(1, Math.max(0, (p - 0.755) / 0.03)) * (1 - Math.min(1, Math.max(0, (p - 0.855) / 0.03)));
      el.style.setProperty("--open", String(open));

      const t = c.tMs;
      if (msRef.current) msRef.current.textContent = t.toFixed(0);
      if (safeRef.current) safeRef.current.textContent = pProtected(t).toFixed(2);
      if (riskRef.current) riskRef.current.textContent = pUnprotected(t).toFixed(2);

      const k = Math.min(1, t / T_MAX);
      if (safePath.current) safePath.current.style.strokeDashoffset = String(lengths.safe * (1 - k));
      if (riskPath.current) riskPath.current.style.strokeDashoffset = String(lengths.risk * (1 - k));

      const x = sx(t);
      if (headRef.current) headRef.current.setAttribute("transform", `translate(${x.toFixed(2)} 0)`);
      if (dotSafe.current) dotSafe.current.setAttribute("cy", sy(pProtected(t)).toFixed(2));
      if (dotRisk.current) dotRisk.current.setAttribute("cy", sy(pUnprotected(t)).toFixed(2));

      markRefs.current.forEach((g, i) => {
        if (g) g.style.opacity = t >= MARKS[i].t ? "1" : "0.18";
      });

      if (stateRef.current) {
        const label =
          c.reliefOpen > 0.5 ? "BASINÇ TAHLİYE EDİLDİ"
          : c.valveClose > 0.5 ? "HAT İZOLE EDİLDİ"
          : c.fire < 0.02 ? "YANGIN SÖNDÜ"
          : c.discharge > 0.05 ? "BASTIRMA AKTİF"
          : c.controlOn > 0.5 ? "KOMUT VERİLDİ"
          : c.detectorOn > 0.5 ? "ALGILANDI"
          : "OLAY DEVAM EDİYOR";
        if (stateRef.current.textContent !== label) stateRef.current.textContent = label;
      }
    });
  }, [subscribe, lengths]);

  return (
    <div
      ref={wrap}
      aria-hidden
      className="pointer-events-none absolute bottom-3 left-3 w-[min(19rem,72vw)] opacity-0 sm:bottom-8 sm:left-8 sm:w-[min(28rem,38vw)]"
      style={{
        // The panel grows when the incident gives it room.
        transform: "scale(calc(1 + var(--open, 0) * 0.16))",
        transformOrigin: "bottom left",
        transition: "transform 120ms linear",
      }}
    >
      <div className="border border-steel-line bg-graphite-deep/80 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-2 border-b border-steel-line px-2.5 py-1.5 sm:px-3 sm:py-2">
          <span className="mono-label truncate text-slate-ink">
            <span className="sm:hidden">Kap basıncı</span>
            <span className="hidden sm:inline">Kap basıncı / zaman</span>
          </span>
          <span ref={stateRef} className="mono-label shrink-0 text-amber">
            OLAY DEVAM EDİYOR
          </span>
        </div>

        <svg viewBox="0 0 320 128" className="w-full">
          {/* vessel failure region */}
          <rect x={X0} y={Y0} width={X1 - X0} height={sy(P_DESIGN) - Y0} fill="var(--color-ember)" opacity="0.08" />
          <g stroke="var(--color-steel-line)" strokeWidth="0.75" opacity="0.6">
            {[0, 2.5, 5, 7.5, 10].map((v) => (
              <line key={v} x1={X0} x2={X1} y1={sy(v)} y2={sy(v)} />
            ))}
          </g>
          <line
            x1={X0} x2={X1} y1={sy(P_DESIGN)} y2={sy(P_DESIGN)}
            stroke="var(--color-slate-ink)" strokeWidth="1" strokeDasharray="5 4"
          />
          <text x={X1} y={sy(P_DESIGN) - 4} textAnchor="end" fill="var(--color-slate-ink)" fontSize="7" fontFamily="var(--font-mono)" letterSpacing="0.12em">
            KAP TASARIM BASINCI {P_DESIGN} BAR
          </text>

          {/* ghost of the unprotected run */}
          <path d={PATH_RISK} fill="none" stroke="var(--color-ember)" strokeWidth="0.75" strokeDasharray="2 4" opacity="0.28" />

          <g stroke="var(--color-slate-ink)" strokeWidth="1">
            <line x1={X0} x2={X0} y1={Y0} y2={Y1} />
            <line x1={X0} x2={X1} y1={Y1} y2={Y1} />
          </g>

          {/* event marks, lighting as the clock passes them */}
          {/* The first four events all happen inside 55 ms, so their marks
              would stack on top of each other at this scale. Stepping the
              labels down keeps every one of them readable. */}
          {MARKS.map((m, i) => (
            <g
              key={m.t}
              ref={(el) => {
                markRefs.current[i] = el;
              }}
              opacity="0.18"
            >
              <line x1={sx(m.t)} x2={sx(m.t)} y1={Y0} y2={Y1} stroke="var(--color-amber)" strokeWidth="0.75" strokeDasharray="2 3" />
              <text
                x={sx(m.t) + 3}
                y={Y0 + 8 + i * 9}
                fill="var(--color-amber)"
                fontSize="6.5"
                fontFamily="var(--font-mono)"
                letterSpacing="0.1em"
              >
                {m.t} ms · {m.label}
              </text>
            </g>
          ))}

          {/* live traces, drawn to the current millisecond */}
          <path
            ref={riskPath}
            d={PATH_RISK}
            fill="none"
            stroke="var(--color-ember)"
            strokeWidth="1.6"
            strokeLinecap="round"
            style={{ strokeDasharray: 1200, strokeDashoffset: 1200 }}
          />
          <path
            ref={safePath}
            d={PATH_SAFE}
            fill="none"
            stroke="var(--color-amber)"
            strokeWidth="2.2"
            strokeLinecap="round"
            style={{ strokeDasharray: 1200, strokeDashoffset: 1200 }}
          />

          <g ref={headRef}>
            <line x1={0} x2={0} y1={Y0} y2={Y1} stroke="var(--color-chalk)" strokeWidth="0.75" opacity="0.35" />
            <circle ref={dotRisk} cx={0} cy={Y1} r="2.6" fill="var(--color-ember)" />
            <circle ref={dotSafe} cx={0} cy={Y1} r="3.4" fill="var(--color-amber)" stroke="var(--color-graphite)" strokeWidth="1.2" />
          </g>

          <g fill="var(--color-slate-ink)" fontSize="7" fontFamily="var(--font-mono)" letterSpacing="0.1em">
            <text x={X0 - 6} y={Y1 + 3} textAnchor="end">0</text>
            <text x={X0 - 6} y={sy(5) + 3} textAnchor="end">5</text>
            <text x={X0 - 6} y={Y0 + 6} textAnchor="end">10</text>
            <text x={X0 - 6} y={Y0 - 4} textAnchor="end" fill="var(--color-chalk)">BAR</text>
            <text x={X1} y={Y1 + 14} textAnchor="end" fill="var(--color-chalk)">MİLİSANİYE</text>
          </g>
        </svg>

        <div className="grid grid-cols-3 gap-px border-t border-steel-line bg-steel-line">
          <Cell label="Süre" unit="ms" tone="chalk">
            <span ref={msRef}>0</span>
          </Cell>
          <Cell label="Korumalı" unit="bar" tone="amber">
            <span ref={safeRef}>0.00</span>
          </Cell>
          <Cell label="Korumasız" unit="bar" tone="ember">
            <span ref={riskRef}>0.00</span>
          </Cell>
        </div>
      </div>
    </div>
  );
}

function Cell({
  label, unit, tone, children,
}: {
  label: string;
  unit: string;
  tone: "chalk" | "amber" | "ember";
  children: React.ReactNode;
}) {
  const color = tone === "amber" ? "text-amber" : tone === "ember" ? "text-ember" : "text-chalk";
  return (
    <div className="bg-graphite-deep px-2 py-1.5 sm:px-2.5 sm:py-2">
      {/* Never wraps: a two-line label doubles the panel height on a phone. */}
      <div className="mono-label truncate text-[0.5rem] leading-tight text-slate-ink sm:text-[0.55rem]">
        {label}
      </div>
      <div className={`font-mono text-sm tabular-nums sm:text-lg ${color}`}>
        {children}
        <span className="ml-0.5 text-[0.55rem] text-slate-ink sm:ml-1 sm:text-[0.6rem]">{unit}</span>
      </div>
    </div>
  );
}
