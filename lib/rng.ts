/**
 * A tiny deterministic PRNG (mulberry32).
 *
 * Particle systems need thousands of random values, but `Math.random()` is
 * impure — it makes the geometry a component builds unstable across renders,
 * and React's compiler rules rightly reject it. Seeding instead makes every
 * flame, spark and droplet layout reproducible: the same build always
 * produces the same scene, which matters when the visual is the product.
 */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
