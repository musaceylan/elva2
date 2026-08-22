"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Reports whether a media query currently matches.
 *
 * `matchMedia` is an external store, so it is read through
 * useSyncExternalStore rather than mirrored into state inside an effect —
 * that avoids the cascading render an effect-plus-setState pair causes.
 *
 * The server snapshot is always false, so callers must render a layout that
 * is correct while the answer is still unknown (mobile-first).
 */
export function useMediaQuery(query: string) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    [query],
  );

  const getSnapshot = useCallback(
    () => window.matchMedia(query).matches,
    [query],
  );

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

/** Drives layout behaviour: pinned sections and scroll scrubbing. */
export const useIsDesktop = () => useMediaQuery("(min-width: 1024px)");

/**
 * Drives SVG type scaling, which is a different question from layout.
 * An SVG scaled down to phone width needs larger nominal type; a tablet
 * renders it near 1:1 and does not.
 */
export const useIsSmallScreen = () => !useMediaQuery("(min-width: 768px)");
