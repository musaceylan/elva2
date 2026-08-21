"use client";

import {
  motion,
  useInView,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import { useRef, type ReactNode } from "react";

/* ------------------------------------------------------------------
   Reveal — blur + rise on enter, fires once.
   Level-2 motion: supports page rhythm, never announces itself.
   ------------------------------------------------------------------ */
export function Reveal({
  children,
  delay = 0,
  y = 24,
  className,
  as = "div",
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  as?: "div" | "span" | "li";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -12% 0px" });
  const reduced = useReducedMotion();
  const MotionTag = motion[as];

  if (reduced) {
    const Tag = as;
    return (
      <Tag ref={ref as never} className={className}>
        {children}
      </Tag>
    );
  }

  return (
    <MotionTag
      ref={ref as never}
      className={className}
      initial={{ opacity: 0, y, filter: "blur(14px)" }}
      animate={
        inView
          ? { opacity: 1, y: 0, filter: "blur(0px)" }
          : { opacity: 0, y, filter: "blur(14px)" }
      }
      transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </MotionTag>
  );
}

/* ------------------------------------------------------------------
   Stagger — same reveal, applied down a list of children.
   ------------------------------------------------------------------ */
export function Stagger({
  children,
  className,
  each = 0.08,
}: {
  children: ReactNode[];
  className?: string;
  each?: number;
}) {
  return (
    <div className={className}>
      {children.map((child, i) => (
        <Reveal key={i} delay={i * each}>
          {child}
        </Reveal>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------
   SplitWords — per-word rise. Used once, on the H1 only.
   Words rather than chars: Turkish diacritics (ğ, ş, İ) render more
   reliably unsplit, and word-level reads calmer at display size.
   ------------------------------------------------------------------ */
export function SplitWords({
  text,
  className,
  delay = 0,
}: {
  text: string;
  className?: string;
  delay?: number;
}) {
  const reduced = useReducedMotion();
  const words = text.split(" ");

  if (reduced) return <span className={className}>{text}</span>;

  return (
    <span className={className}>
      {words.map((word, i) => (
        <span
          key={i}
          className="inline-block overflow-hidden align-bottom"
          style={{ paddingBottom: "0.08em" }}
        >
          <motion.span
            className="inline-block"
            initial={{ y: "108%" }}
            animate={{ y: "0%" }}
            transition={{
              duration: 0.9,
              delay: delay + i * 0.06,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            {word}
            {i < words.length - 1 ? " " : ""}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

/* ------------------------------------------------------------------
   useScrubbed — scroll progress smoothed by a spring.
   This is the Motion equivalent of the lerp loop that makes a
   scroll-scrubbed video feel liquid instead of stepped.
   ------------------------------------------------------------------ */
export function useScrubbed(ref: React.RefObject<HTMLElement | null>) {
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });
  const smooth = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    restDelta: 0.0005,
  });
  return reduced ? scrollYProgress : smooth;
}

/* ------------------------------------------------------------------
   ParallaxY — depth on scroll. Transform only.
   ------------------------------------------------------------------ */
export function ParallaxY({
  children,
  distance = 60,
  className,
}: {
  children: ReactNode;
  distance?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [distance, -distance]);

  return (
    <div ref={ref} className={className}>
      <motion.div style={reduced ? undefined : { y }}>{children}</motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------
   Readout — a MotionValue rendered as a fixed-precision number.
   Instrument panels show numbers, not progress bars.
   ------------------------------------------------------------------ */
export function Readout({
  value,
  precision = 0,
  className,
}: {
  value: MotionValue<number>;
  precision?: number;
  className?: string;
}) {
  const text = useTransform(value, (v) => v.toFixed(precision));
  return <motion.span className={className}>{text}</motion.span>;
}
