"use client";

import { useEffect, useState } from "react";

/**
 * Reports whether a media query currently matches.
 *
 * Starts false and resolves after mount so server and client markup agree;
 * callers must render a layout that is correct while the answer is still
 * unknown (mobile-first), not one that flashes.
 */
export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

/** Drives layout behaviour: pinned sections and scroll scrubbing. */
export const useIsDesktop = () => useMediaQuery("(min-width: 1024px)");

/**
 * Drives SVG type scaling, which is a different question from layout.
 * An SVG scaled down to phone width needs larger nominal type; a tablet
 * renders it near 1:1 and does not.
 */
export const useIsSmallScreen = () => !useMediaQuery("(min-width: 768px)");
