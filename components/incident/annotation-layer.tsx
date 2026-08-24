"use client";

/**
 * The DOM half of the spatial labelling.
 *
 * Deliberately free of any three.js import. This module renders on every
 * visit — including the reduced-motion path, which never creates a canvas —
 * so anything it touches lands in the initial bundle. Keeping the label text
 * here and the world anchors next door is what lets the renderer stay a
 * runtime download instead of a 900 kB tax on first paint.
 */

export type AnnoLabel = { id: string; code: string; label: string };

/** Order matters: it is the order the protection points light up. */
export const ANNO_LABELS: readonly AnnoLabel[] = [
  { id: "det", code: "01", label: "Alev dedektörü" },
  { id: "spark", code: "02", label: "Kıvılcım algılama" },
  { id: "press", code: "03", label: "Basınç dedektörü · dP/dt" },
  { id: "panel", code: "04", label: "Kontrol paneli" },
  { id: "hrd", code: "05", label: "HRD bastırma ünitesi" },
  { id: "noz", code: "06", label: "Söndürme nozülleri" },
  { id: "relief", code: "07", label: "Patlama tahliye kapağı" },
  { id: "valve", code: "08", label: "İzolasyon vanası" },
  { id: "silo", code: "09", label: "Korunan proses hattı" },
];

export type AnnoNodes = { label: HTMLDivElement | null; line: SVGLineElement | null };
export type AnnoRegistry = Map<string, AnnoNodes>;

/** Rendered once. The projector inside the canvas writes to these nodes. */
export function AnnotationLayer({ registry }: { registry: AnnoRegistry }) {
  const ensure = (id: string): AnnoNodes => {
    let n = registry.get(id);
    if (!n) {
      n = { label: null, line: null };
      registry.set(id, n);
    }
    return n;
  };

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <svg className="absolute inset-0 h-full w-full">
        {ANNO_LABELS.map((a) => (
          <line
            key={a.id}
            ref={(el) => {
              ensure(a.id).line = el;
            }}
            stroke="var(--color-amber)"
            strokeWidth="1"
            opacity="0"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
      {ANNO_LABELS.map((a) => (
        <div
          key={a.id}
          ref={(el) => {
            ensure(a.id).label = el;
          }}
          className="absolute left-0 top-0 -translate-y-1/2 whitespace-nowrap opacity-0 will-change-transform"
        >
          <div className="flex items-baseline gap-2 border-b border-amber/70 pb-1 pl-1 pr-3">
            <span className="mono-label text-amber">{a.code}</span>
            <span className="text-[0.8rem] text-chalk">{a.label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
