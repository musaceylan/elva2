import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    /**
     * The WebGL film runs an imperative render loop.
     *
     * react-hooks/immutability assumes anything created by a hook is frozen
     * once render finishes. That is the right rule for React state, and the
     * wrong model for react-three-fiber: a `useFrame` callback exists
     * precisely to mutate shader uniforms, object transforms and geometry
     * buffers sixty times a second, and routing that through React state
     * would re-render the tree every frame.
     *
     * Scoped to this directory only, and only to that rule — purity,
     * exhaustive-deps and set-state-in-effect still apply here, and the
     * particle systems use a seeded PRNG (lib/rng.ts) rather than
     * Math.random() so their geometry stays deterministic.
     */
    files: ["components/incident/**"],
    rules: { "react-hooks/immutability": "off" },
  },
]);

export default eslintConfig;
