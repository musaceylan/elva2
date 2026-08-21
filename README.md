# ELVA — landing page concept

A redesigned landing page for [ELVA Mühendislik](https://www.elva.com.tr), an
Istanbul-based engineering firm working in industrial fire, explosion and
overpressure protection.

This is an independent design concept, not an official ELVA property.

**Live:** https://musaceylan.github.io/elva2/

## The idea

Explosion protection is defined by one artifact: the pressure–time curve.
Unprotected, a dust deflagration drives vessel pressure to roughly 9 bar and the
vessel fails. With suppression, detection happens on the rate of pressure rise
(dP/dt) within milliseconds and pressure is clamped at P_red, well under the
vessel's design strength.

That curve is the product, so it is the hero. Scrolling advances the time axis
from 0 to 300 ms and both traces draw in real time against live readouts. A
second scroll-linked section walks through a dust collector protection scheme —
spark detection, isolation, pressure detector, vent panel, HRD bottle.

Every figure on the page (20+ years, 2000+ projects, nine industries, the
partner list) comes from elva.com.tr. Nothing is invented.

## Stack

- Next.js 16 (App Router, static export)
- TypeScript, Tailwind CSS 4
- Motion for React
- Archivo (display) + IBM Plex Sans/Mono, self-hosted via `next/font`

No images are bundled: the hero curve and the schematic are both generated SVG,
so the page ships no photographic assets and has no third-party rights concerns.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
```

```bash
npm run build      # static export to ./out
```

`basePath` is applied only when `GITHUB_PAGES=true`, so local development stays
at the root of localhost:3000 while the deployed site sits under `/elva2`.

## Deployment

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds the
static export and publishes it to GitHub Pages.

## Accessibility

Semantic landmarks, a skip link, visible focus rings, labelled SVG figures, and
`prefers-reduced-motion` honoured throughout — under reduced motion the traces
render at their final state instead of animating, and no content is gated behind
an animation.
