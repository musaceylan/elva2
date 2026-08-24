"use client";

import Image from "next/image";
import { motion, useInView, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useRef, type ReactNode } from "react";

/* Photography is treated as a material here, not decoration: every frame is
   masked, tinted toward the graphite ground, and revealed by a wipe rather
   than a fade, so images arrive with the same precision as the diagrams. */

/**
 * RevealImage — a clip-path wipe paired with a slow scale-down.
 *
 * The wipe reads as a shutter opening, which suits an industrial subject far
 * better than a plain fade, and both properties stay on the compositor.
 *
 * The viewport observer watches the OUTER frame, never the clipped element.
 * Putting `whileInView` on the element that carries the closed clip deadlocks
 * it: `inset(0 100% 0 0)` collapses the element's visible area to zero, an
 * IntersectionObserver on it reports `intersectionRatio: 0`, so the animation
 * that would open the clip never starts. Chrome then compounds it by refusing
 * to fetch a `loading="lazy"` image with no visible area, so the frame stays
 * empty forever — which is exactly what shipped here until it was caught.
 */
export function RevealImage({
  src,
  alt,
  width = 1200,
  height = 600,
  className = "",
  priority = false,
  from = "bottom",
  delay = 0,
  tint = true,
}: {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  from?: "bottom" | "left";
  delay?: number;
  tint?: boolean;
}) {
  const reduced = useReducedMotion();
  const frame = useRef<HTMLDivElement>(null);
  const inView = useInView(frame, { once: true, margin: "0px 0px -12% 0px" });

  const closed =
    from === "left" ? "inset(0 100% 0 0)" : "inset(100% 0 0 0)";
  const open = { clipPath: "inset(0 0 0 0)", scale: 1 };

  return (
    <div ref={frame} className={`relative overflow-hidden ${className}`}>
      <motion.div
        initial={reduced ? false : { clipPath: closed, scale: 1.14 }}
        animate={reduced || inView ? open : { clipPath: closed, scale: 1.14 }}
        transition={{
          clipPath: { duration: 1.1, delay, ease: [0.16, 1, 0.3, 1] },
          scale: { duration: 1.6, delay, ease: [0.16, 1, 0.3, 1] },
        }}
        className="h-full w-full"
      >
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          priority={priority}
          loading={priority ? undefined : "lazy"}
          className="h-full w-full object-cover"
        />
      </motion.div>
      {tint && (
        <div
          className="pointer-events-none absolute inset-0 bg-graphite/35 mix-blend-multiply"
          aria-hidden
        />
      )}
    </div>
  );
}

/**
 * ParallaxFrame — the frame is fixed, the image drifts inside it.
 *
 * The image is over-sized so the drift never exposes an edge.
 */
export function ParallaxFrame({
  src,
  alt,
  className = "",
  distance = 12,
  width = 1200,
  height = 600,
}: {
  src: string;
  alt: string;
  className?: string;
  distance?: number;
  width?: number;
  height?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [`-${distance}%`, `${distance}%`]);

  return (
    <div ref={ref} className={`relative overflow-hidden ${className}`}>
      <motion.div
        className="absolute inset-0"
        style={reduced ? undefined : { y }}
        // grown by twice the drift so no edge is ever revealed
        initial={false}
      >
        <div className="relative h-[calc(100%+2*var(--drift))] -top-[var(--drift)] w-full"
             style={{ ["--drift" as string]: `${distance}%` }}>
          <Image
            src={src}
            alt={alt}
            width={width}
            height={height}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        </div>
      </motion.div>
      <div className="pointer-events-none absolute inset-0 bg-graphite/40" aria-hidden />
    </div>
  );
}

/** A hairline-framed figure with a mono caption, matching the drawing style. */
export function Plate({
  children,
  caption,
  className = "",
}: {
  children: ReactNode;
  caption?: string;
  className?: string;
}) {
  return (
    <figure className={`border border-steel-line ${className}`}>
      {children}
      {caption && (
        <figcaption className="mono-label text-slate-ink px-4 py-3 border-t border-steel-line">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
