/**
 * Prefixes a public-folder path with the deployment base path.
 *
 * `next/image` normally rewrites src through its loader, which applies
 * basePath for you — but with `unoptimized: true` (required for a static
 * export) the loader is bypassed and the raw src is emitted verbatim. On a
 * project Pages site that means `/img/x.webp` 404s, because the site is
 * actually served from `/elva2/img/x.webp`. This is invisible locally, where
 * basePath is empty.
 *
 * Every reference to a file in /public must go through here.
 */
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function asset(path: string): string {
  return `${BASE}${path}`;
}
