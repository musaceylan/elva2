import type { NextConfig } from "next";

/**
 * GitHub Pages serves this project at /elva2, so the base path is applied
 * only in CI. Local `npm run dev` stays at the root of localhost:3000.
 */
const isPages = process.env.GITHUB_PAGES === "true";
const repo = "/elva2";

const nextConfig: NextConfig = {
  // Pinned so the build never walks up into the home directory, which is
  // itself a git repo and holds an unrelated package-lock.json.
  turbopack: { root: __dirname },
  output: "export",
  basePath: isPages ? repo : undefined,
  assetPrefix: isPages ? repo : undefined,
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
