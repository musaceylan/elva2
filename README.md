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

The site opens with that event as a film you scrub. Scroll is time: one
normalized progress value drives a single continuous incident in one 3D scene —
a fire in a dark plant, the detector seeing it, a signal travelling down the
cable tray, the HRD bottle firing, suppressant racing through the manifold, the
nozzles releasing, and the flame bending, breaking into pockets and dying one
pocket at a time. Then the pressure keeps going: an isolation valve slams shut,
the explosion relief panel vents, and the camera pulls back to reveal the whole
installation.

There are no separate fire and suppression sections. Every channel — flame,
smoke, steam, light temperature, pipe contents, valve angle, the millisecond
clock — is a continuous function of the same scroll position, so stopping
anywhere leaves a coherent physical moment and scrolling back plays the event in
reverse. The collision is not authored at all; it is `min(fire, discharge)`.

The 300 ms curve is still there, upgraded from an infographic into the live
telemetry of the incident. Every labelled millisecond lands on something
visible: 15 ms is the signal reaching the controller, 40 ms is the nozzles
releasing, 55 ms is pressure clamped at P_red. The full annotated chart follows
the film as the engineering record.

Every figure on the page (20+ years, 2000+ projects, nine industries, the
partner list) comes from elva.com.tr. Nothing is invented.

## How the film is built

`components/incident/` is the whole thing.

| File | Role |
| --- | --- |
| `timeline.ts` | The single source of truth. `channels(p)` turns one scroll value into ~35 continuous channels, written as keyframe tables. |
| `index.tsx` | The driver: one rAF that smooths scroll into progress, computes the channels, and hands the same frame to the scene and the DOM overlay. |
| `layout.ts` | One shared world — vessel, ducts, manifold, nozzles, valve, detectors, and the curves the signal, agent and pressure wave travel along. |
| `plant.tsx`, `devices.tsx`, `parts.tsx` | Procedural geometry. Pipes are cylinders between two points; there are no model files to download. |
| `materials.ts` | The x-ray shell: a Fresnel term dissolves the face of a pipe while keeping its silhouette, driven per pipe run. |
| `fire.tsx` | The flame. Death order is baked into the geometry, so a single falling number collapses the fire inward and leaves one stubborn central pocket. |
| `flow.tsx`, `burst.tsx`, `vapor.tsx` | Contained flow, nozzle discharge, smoke and steam. |
| `rig.tsx` | Sixteen camera keyframes, with the vertical field widened on portrait so a phone gets the composition rather than a crop. |
| `telemetry.tsx`, `overlay.tsx`, `annotations.tsx` | The instrument, the typography, and the leader lines — all written straight to the DOM from the driver tick. |

Nothing in the film re-renders React per frame.

## Stack

- Next.js 16 (App Router, static export)
- TypeScript, Tailwind CSS 4
- three.js + react-three-fiber for the incident scene
- Motion for React everywhere else
- Archivo (display) + IBM Plex Sans/Mono, self-hosted via `next/font`

No post-processing pass and no model files. The renderer is the only heavy
dependency, and it is imported at runtime from an effect rather than through
`next/dynamic` — `next/dynamic` still emits its chunk as an async script in the
document, which would charge every visitor ~240 kB gzipped for a renderer that
reduced-motion visitors never use. Keeping `annotation-layer.tsx` free of any
three.js import is what makes that split hold.

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
`prefers-reduced-motion` honoured throughout. Under reduced motion — or without
WebGL — the film is replaced by `IncidentFallback`, which tells the same
sequence as a written incident record beside the resolved pressure curve, and no
renderer is downloaded at all. The canvas is decorative by definition, so the
sequence is also available to screen readers as text.
