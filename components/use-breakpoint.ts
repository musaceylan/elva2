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

export const useIsDesktop = () => useMediaQuery("(min-width: 1024px)");
