"use client";

import { motion, useTransform, type MotionValue } from "motion/react";
import { Readout } from "./motion-primitives";

/* ==================================================================
   The pressure–time curve.

   This is the defining artifact of explosion protection: every
   datasheet in the industry plots it. Unprotected, a dust deflagration
   drives vessel pressure to Pmax (~9 bar) and the vessel fails.
   With suppression, detection happens on dP/dt within milliseconds and
   pressure is clamped at Pred — well under the vessel's design limit.

   Scroll (desktop) or an on-enter playback (mobile) scrubs the time
   axis from 0 to 300 ms.
   ================================================================== */

const T_MAX = 300; // ms
const P_MAX_AXIS = 10; // bar
const P_DESIGN = 1.2; // vessel design strength, bar
const P_RED = 0.55; // suppressed peak, bar
const T_DETECT = 15; // ms — dP/dt threshold crossed
const T_SUPPRESS = 55; // ms — Pred reached

const X0 = 84;
const X1 = 780;
const Y0 = 40;
const Y1 = 382;

const sx = (t: number) => X0 + (t / T_MAX) * (X1 - X0);
const sy = (p: number) => Y1 - (p / P_MAX_AXIS) * (Y1 - Y0);

function pUnprotected(t: number) {
  return 9 * (1 - Math.exp(-Math.pow(t / 120, 2.2)));
}

function pProtected(t: number) {
  const base = pUnprotected(T_DETECT);
  if (t <= T_DETECT) return pUnprotected(t);
  const k = (t - T_DETECT) / (T_SUPPRESS - T_DETECT);
  const shape = k * Math.exp(1 - k);
  return base + (P_RED - base) * shape;
}

function buildPath(fn: (t: number) => number, steps = 240) {
  let d = "";
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * T_MAX;
    d += `${i === 0 ? "M" : "L"}${sx(t).toFixed(2)} ${sy(fn(t)).toFixed(2)}`;
  }
  return d;
}

function buildArea(fn: (t: number) => number, steps = 240) {
  return `${buildPath(fn, steps)}L${X1} ${Y1}L${X0} ${Y1}Z`;
}

const PATH_UNPROTECTED = buildPath(pUnprotected);
const PATH_PROTECTED = buildPath(pProtected);
const AREA_PROTECTED = buildArea(pProtected);

const yTicks = [0, 2, 4, 6, 8, 10];
const xTicks = [0, 50, 100, 150, 200, 250, 300];

export function PressureCurve({
  progress,
  compact = false,
}: {
  progress: MotionValue<number>;
  compact?: boolean;
}) {
  const tNow = useTransform(progress, [0, 1], [0, T_MAX]);
  const pNow = useTransform(tNow, (t) => pProtected(t));
  const pRisk = useTransform(tNow, (t) => pUnprotected(t));

  const headX = useTransform(tNow, (t) => sx(t));
  const headYProt = useTransform(tNow, (t) => sy(pProtected(t)));
  const headYRisk = useTransform(tNow, (t) => sy(pUnprotected(t)));

  const detectOn = useTransform(tNow, (t) => (t >= T_DETECT ? 1 : 0));
  const suppressOn = useTransform(tNow, (t) => (t >= T_SUPPRESS ? 1 : 0));
  const ruptureOn = useTransform(tNow, (t) =>
    pUnprotected(t) >= P_DESIGN ? 1 : 0,
  );

  // Type scales up on small screens — the SVG is scaled down hard there.
  const fs = compact ? 17 : 11;
  const fsNote = compact ? 18 : 12;
  const ticks = compact ? [0, 100, 200, 300] : xTicks;
  const yt = compact ? [0, 5, 10] : yTicks;

  return (
    <figure className="w-full">
      <svg
        viewBox="0 0 800 440"
        className="w-full h-auto"
        role="img"
        aria-label={`Basınç-zaman grafiği. Korumasız bir toz patlamasında kap basıncı 300 milisaniye içinde 9 bara ulaşarak ${P_DESIGN} bar tasarım basıncını aşar ve kap tahrip olur. ELVA bastırma sistemi ${T_DETECT} milisaniyede algılar ve basıncı ${P_RED} barda sınırlar.`}
      >
        {/* ---- vessel failure region: everything above design strength ---- */}
        <rect
          x={X0}
          y={Y0}
          width={X1 - X0}
          height={sy(P_DESIGN) - Y0}
          fill="var(--color-ember)"
          opacity="0.07"
        />

        {/* ---- grid ---- */}
        <g stroke="var(--color-steel-line)" strokeWidth="1">
          {yTicks.map((p) => (
            <line key={p} x1={X0} x2={X1} y1={sy(p)} y2={sy(p)} opacity={0.45} />
          ))}
          {xTicks.map((t) => (
            <line key={t} x1={sx(t)} x2={sx(t)} y1={Y0} y2={Y1} opacity={0.28} />
          ))}
        </g>

        {/* ---- ghost of the unprotected curve: gives the plot structure at t=0 ---- */}
        <path
          d={PATH_UNPROTECTED}
          fill="none"
          stroke="var(--color-ember)"
          strokeWidth="1.25"
          strokeDasharray="3 6"
          opacity="0.3"
        />

        {/* ---- axes ---- */}
        <g stroke="var(--color-slate-ink)" strokeWidth="1.25">
          <line x1={X0} x2={X0} y1={Y0} y2={Y1} />
          <line x1={X0} x2={X1} y1={Y1} y2={Y1} />
        </g>

        {/* ---- design-strength limit ---- */}
        <line
          x1={X0}
          x2={X1}
          y1={sy(P_DESIGN)}
          y2={sy(P_DESIGN)}
          stroke="var(--color-slate-ink)"
          strokeWidth="1.5"
          strokeDasharray="7 5"
        />
        <text
          x={X1}
          y={sy(P_DESIGN) - 10}
          textAnchor="end"
          fill="var(--color-slate-ink)"
          fontSize={fs}
          fontFamily="var(--font-mono)"
          letterSpacing="0.1em"
        >
          KAP TASARIM BASINCI · {P_DESIGN} BAR
        </text>

        {/* ---- axis ticks ---- */}
        <g
          fill="var(--color-slate-ink)"
          fontSize={fs}
          fontFamily="var(--font-mono)"
          letterSpacing="0.08em"
        >
          {yt.map((p) => (
            <text key={p} x={X0 - 12} y={sy(p) + 5} textAnchor="end">
              {p}
            </text>
          ))}
          {ticks.map((t) => (
            <text key={t} x={sx(t)} y={Y1 + 26} textAnchor="middle">
              {t}
            </text>
          ))}
          <text x={X0 - 12} y={Y0 - 12} textAnchor="end" fill="var(--color-chalk)">
            BAR
          </text>
          <text x={X1} y={Y1 + 26} textAnchor="end" fill="var(--color-chalk)">
            MS
          </text>
        </g>

        {/* ---- contained area under the protected trace ---- */}
        <motion.path
          d={AREA_PROTECTED}
          fill="var(--color-amber)"
          style={{ opacity: useTransform(progress, [0, 0.25], [0, 0.16]) }}
        />

        {/* ---- live traces ---- */}
        <motion.path
          d={PATH_UNPROTECTED}
          fill="none"
          stroke="var(--color-ember)"
          strokeWidth="2.5"
          strokeLinecap="round"
          style={{ pathLength: progress }}
        />
        <motion.path
          d={PATH_PROTECTED}
          fill="none"
          stroke="var(--color-amber)"
          strokeWidth="3.5"
          strokeLinecap="round"
          style={{ pathLength: progress }}
        />

        {/* ---- events ---- */}
        <g>
          <circle cx={sx(0)} cy={sy(0)} r="4" fill="var(--color-chalk)" />
          <text
            x={sx(0) - 4}
            y={Y1 - 14}
            fill="var(--color-chalk)"
            fontSize={fs}
            fontFamily="var(--font-mono)"
            letterSpacing="0.1em"
          >
            TUTUŞMA
          </text>
        </g>

        <motion.g style={{ opacity: detectOn }}>
          <line
            x1={sx(T_DETECT)}
            x2={sx(T_DETECT)}
            y1={Y0}
            y2={Y1}
            stroke="var(--color-amber)"
            strokeWidth="1"
            strokeDasharray="3 4"
            opacity={0.75}
          />
          <text
            x={sx(T_DETECT) + 9}
            y={Y0 + 18}
            fill="var(--color-amber)"
            fontSize={fs}
            fontFamily="var(--font-mono)"
            letterSpacing="0.1em"
          >
            {T_DETECT} ms · ALGILAMA
          </text>
        </motion.g>

        <motion.g style={{ opacity: suppressOn }}>
          <circle cx={sx(T_SUPPRESS)} cy={sy(P_RED)} r="5.5" fill="var(--color-amber)" />
          <line
            x1={sx(T_SUPPRESS)}
            y1={sy(P_RED) - 8}
            x2={sx(T_SUPPRESS) + 26}
            y2={sy(P_RED) - 44}
            stroke="var(--color-amber)"
            strokeWidth="1"
          />
          <text
            x={sx(T_SUPPRESS) + 30}
            y={sy(P_RED) - 48}
            fill="var(--color-amber)"
            fontSize={fsNote}
            fontFamily="var(--font-mono)"
            letterSpacing="0.08em"
          >
            Pred {P_RED} BAR · KAP KORUNDU
          </text>
        </motion.g>

        <motion.g style={{ opacity: ruptureOn }}>
          <text
            x={X1 - 6}
            y={sy(8.6)}
            textAnchor="end"
            fill="var(--color-ember)"
            fontSize={fsNote}
            fontFamily="var(--font-mono)"
            letterSpacing="0.08em"
          >
            KORUMASIZ · KAP TAHRİP OLUR
          </text>
        </motion.g>

        {/* ---- playhead ---- */}
        <motion.line
          y1={Y0}
          y2={Y1}
          stroke="var(--color-chalk)"
          strokeWidth="1"
          opacity={0.3}
          style={{ x: headX }}
        />
        <motion.circle r="5" fill="var(--color-ember)" style={{ cx: headX, cy: headYRisk }} />
        <motion.circle
          r="6.5"
          fill="var(--color-amber)"
          stroke="var(--color-graphite)"
          strokeWidth="2"
          style={{ cx: headX, cy: headYProt }}
        />
      </svg>

      <figcaption className="mt-5 grid grid-cols-3 gap-px bg-steel-line border border-steel-line">
        <ReadoutCell label="Süre" unit="ms">
          <Readout value={tNow} precision={0} />
        </ReadoutCell>
        <ReadoutCell label="ELVA korumalı" unit="bar" tone="amber">
          <Readout value={pNow} precision={2} />
        </ReadoutCell>
        <ReadoutCell label="Korumasız" unit="bar" tone="ember">
          <Readout value={pRisk} precision={2} />
        </ReadoutCell>
      </figcaption>
    </figure>
  );
}

function ReadoutCell({
  label,
  unit,
  children,
  tone,
}: {
  label: string;
  unit: string;
  children: React.ReactNode;
  tone?: "amber" | "ember";
}) {
  const color =
    tone === "amber" ? "text-amber" : tone === "ember" ? "text-ember" : "text-chalk";
  return (
    <div className="bg-graphite px-3 py-3 sm:px-4">
      <div className="mono-label text-slate-ink text-[0.6rem] sm:text-[0.6875rem]">
        {label}
      </div>
      <div className={`font-mono text-xl sm:text-2xl md:text-3xl tabular-nums ${color}`}>
        {children}
        <span className="text-xs sm:text-sm text-slate-ink ml-1">{unit}</span>
      </div>
    </div>
  );
}
