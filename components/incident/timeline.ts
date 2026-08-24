/**
 * THE INCIDENT TIMELINE
 * =====================
 *
 * One normalized scroll value drives one continuous physical event. There are
 * no independent section animations anywhere in the film: every flame, light,
 * particle, valve and label reads a channel out of `channels(p)`.
 *
 * Channels are continuous, not boolean. At p = 0.57 the fire is still 72% of
 * its peak while suppression is already at 48% and steam is climbing — that
 * overlap is the entire point. Stopping mid-scroll leaves a coherent frame;
 * scrolling back plays the event in reverse.
 */

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Normalized position inside a window, clamped at both ends. */
export const seg = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));

const smooth = (t: number) => t * t * (3 - 2 * t);

/**
 * Keyframe interpolator. The timeline is written as tables of [p, value] pairs
 * so the whole event is readable as data rather than buried in conditionals.
 * Smoothstep between keys keeps velocity continuous — a linear table reads as
 * mechanical, which is wrong for fire and right for a valve.
 */
export function track(
  p: number,
  keys: readonly (readonly [number, number])[],
  linear = false,
): number {
  const n = keys.length;
  if (p <= keys[0][0]) return keys[0][1];
  if (p >= keys[n - 1][0]) return keys[n - 1][1];
  let i = 0;
  while (i < n - 2 && p > keys[i + 1][0]) i++;
  const [x0, y0] = keys[i];
  const [x1, y1] = keys[i + 1];
  const k = (p - x0) / (x1 - x0 || 1);
  return y0 + (y1 - y0) * (linear ? k : smooth(k));
}

/** A 0 → 1 → 0 impulse across a window. Used for impacts and snaps. */
export function pulse(p: number, a: number, b: number): number {
  const k = seg(p, a, b);
  return Math.sin(k * Math.PI);
}

/* ------------------------------------------------------------------
   Chapter table — drives the caption layer and nothing else.
   The physics below does not branch on chapters.
   ------------------------------------------------------------------ */
export type Chapter = {
  at: number;
  tag: string;
  line: string;
};

export const CHAPTERS: readonly Chapter[] = [
  { at: 0.0, tag: "", line: "" },
  { at: 0.075, tag: "Alev büyüyor", line: "Toz bulutu tutuştu. Kap içindeki basınç yükselmeye başladı." },
  { at: 0.14, tag: "Hattın içi", line: "Çelik saydamlaşıyor. Basınç dalgası hattın içinde ilerliyor." },
  { at: 0.205, tag: "Algılama", line: "Optik dedektör alevi görüyor." },
  { at: 0.27, tag: "Sinyal", line: "Karar 15’inci milisaniyede kontrol paneline ulaşıyor." },
  { at: 0.335, tag: "Basınçlanma", line: "HRD şişesi açıldı. Söndürme hattı yükleniyor." },
  { at: 0.4, tag: "Hat içinde", line: "Bastırıcı madde nozüllere doğru koşuyor." },
  { at: 0.47, tag: "Nozüller", line: "Basınç uçlara ulaştı. İlk damlacıklar görünüyor." },
  { at: 0.53, tag: "Çarpışma", line: "Bastırıcı aleve çarpıyor. Alev direniyor." },
  { at: 0.62, tag: "Parçalanma", line: "Alev cepleri ayrışıyor ve tek tek sönüyor." },
  { at: 0.7, tag: "Son alev", line: "Geriye tek bir alev kaldı." },
  { at: 0.755, tag: "Kontrol sağlandı", line: "Yangın bitti. Ekipman ıslak, buhar yükseliyor." },
  { at: 0.8, tag: "Basınç hâlâ yolda", line: "Ama hat içindeki basınç ilerlemeye devam ediyor." },
  { at: 0.865, tag: "İzolasyon", line: "Hızlı kapanan vana hattı kesiyor." },
  { at: 0.912, tag: "Tahliye", line: "Artık basınç kontrollü yönde boşaltılıyor." },
  { at: 0.95, tag: "", line: "" },
];

export function chapterAt(p: number): number {
  let i = 0;
  for (let k = 0; k < CHAPTERS.length; k++) if (p >= CHAPTERS[k].at) i = k;
  return i;
}

/* ------------------------------------------------------------------
   Channels
   ------------------------------------------------------------------ */
export type Channels = {
  /** Incident clock in milliseconds, keyed so every number lands on an event. */
  tMs: number;

  fire: number;
  fireChaos: number;
  firePockets: number;
  fireBend: number;
  sparks: number;
  heat: number;
  smoke: number;
  steam: number;
  cold: number;

  xrayInlet: number;
  xrayManifold: number;
  xrayOutlet: number;
  inletPressure: number;

  detectorOn: number;
  signalHead: number;
  signalOn: number;
  controlOn: number;

  hrdOpen: number;
  pipeCharge: number;
  agentHead: number;
  agentOn: number;
  discharge: number;
  nozzlePrime: number;

  collision: number;
  shock: number;
  wet: number;

  waveHead: number;
  waveOn: number;
  valveClose: number;
  valveSnap: number;
  reliefOpen: number;
  reliefVent: number;

  reveal: number;
  shake: number;
};

export function channels(p: number): Channels {
  /* ---- the clock. 15 ms is signal arrival, 40 ms is nozzle release,
          55 ms is Pred, ~60 ms is the fire starting to collapse. ---- */
  const tMs = track(p, [
    [0, 0], [0.14, 1], [0.245, 8], [0.325, 15], [0.4, 26], [0.47, 34],
    [0.505, 40], [0.53, 48], [0.565, 55], [0.62, 72], [0.7, 120],
    [0.748, 160], [0.8, 200], [0.886, 250], [0.93, 278], [1, 300],
  ], true);

  /* ---- fire. Never a switch: it grows, is struck, resists, breaks into
          pockets, loses them one by one, and holds one last flame. ---- */
  const fire = track(p, [
    [0, 0.55], [0.07, 0.72], [0.14, 1], [0.5, 1], [0.55, 0.93],
    [0.585, 0.74], [0.62, 0.56], [0.655, 0.34], [0.69, 0.16],
    [0.715, 0.1], [0.735, 0.06], [0.748, 0], [1, 0],
  ]);

  const discharge = track(p, [
    [0, 0], [0.5, 0], [0.508, 0.14], [0.522, 0.45], [0.535, 1],
    [0.66, 0.92], [0.705, 0.62], [0.722, 0.48], [0.736, 1],
    [0.752, 0.55], [0.775, 0], [1, 0],
  ]);

  const heat = track(p, [
    [0, 0.5], [0.07, 0.68], [0.14, 1], [0.53, 1], [0.6, 0.66],
    [0.66, 0.4], [0.7, 0.22], [0.748, 0.05], [0.82, 0.02], [1, 0],
  ]);

  return {
    tMs,
    fire,
    fireChaos: track(p, [
      [0, 0.28], [0.07, 0.45], [0.14, 0.72], [0.5, 0.78], [0.56, 1],
      [0.66, 0.8], [0.7, 0.55], [0.75, 0.2], [1, 0],
    ]),
    firePockets: track(p, [
      [0, 0], [0.55, 0], [0.6, 0.45], [0.66, 1], [0.712, 1],
      [0.735, 0.3], [0.75, 0], [1, 0],
    ]),
    fireBend: track(p, [
      [0, 0], [0.528, 0], [0.552, 1], [0.62, 0.82], [0.68, 0.55],
      [0.722, 0.35], [0.74, 1], [0.756, 0], [1, 0],
    ]),
    sparks: track(p, [
      [0, 0.3], [0.07, 0.6], [0.14, 1], [0.5, 1], [0.55, 0.7],
      [0.6, 0.3], [0.66, 0.06], [0.72, 0], [1, 0],
    ]),
    heat,
    smoke: track(p, [
      [0, 0.38], [0.07, 0.52], [0.14, 0.82], [0.5, 0.86], [0.58, 1],
      [0.68, 0.82], [0.755, 0.55], [0.82, 0.3], [0.9, 0.14], [1, 0.05],
    ]),
    steam: track(p, [
      [0, 0], [0.53, 0], [0.548, 0.5], [0.6, 1], [0.7, 0.85],
      [0.74, 1], [0.782, 0.72], [0.84, 0.42], [0.93, 0.5], [0.97, 0.22], [1, 0.12],
    ]),
    cold: track(p, [
      [0, 0], [0.47, 0], [0.53, 0.65], [0.62, 1], [0.782, 0.82],
      [0.9, 0.6], [1, 0.5],
    ]),

    /* ---- x-ray is per pipe run, so the shell only dissolves where the
            camera is actually looking. ---- */
    xrayInlet: track(p, [
      [0, 0], [0.14, 0], [0.185, 1], [0.245, 1], [0.29, 0.3],
      [0.53, 0.15], [0.6, 0], [1, 0],
    ]),
    xrayManifold: track(p, [
      [0, 0], [0.335, 0], [0.375, 1], [0.53, 1], [0.575, 0.25],
      [0.63, 0], [1, 0],
    ]),
    xrayOutlet: track(p, [
      [0, 0], [0.795, 0], [0.83, 1], [0.9, 1], [0.935, 0.4], [0.96, 0], [1, 0],
    ]),
    inletPressure: track(p, [
      [0, 0], [0.14, 0.1], [0.175, 0.7], [0.21, 1], [0.29, 1],
      [0.4, 0.7], [0.55, 0.4], [0.66, 0.15], [0.8, 0], [1, 0],
    ]),

    /* ---- detection and the electrical chain ---- */
    detectorOn: track(p, [[0, 0], [0.232, 0], [0.246, 1], [1, 1]]),
    signalHead: seg(p, 0.268, 0.325),
    signalOn: Math.min(seg(p, 0.262, 0.272), 1 - seg(p, 0.33, 0.352)),
    controlOn: track(p, [[0, 0], [0.322, 0], [0.334, 1], [1, 1]]),

    /* ---- mechanical response ---- */
    hrdOpen: track(p, [
      [0, 0], [0.334, 0], [0.348, 1], [0.755, 1], [0.79, 0.35], [1, 0.2],
    ]),
    pipeCharge: track(p, [[0, 0], [0.34, 0], [0.398, 1], [0.775, 1], [0.82, 0.4], [1, 0.25]]),
    agentHead: seg(p, 0.398, 0.502),
    agentOn: Math.min(seg(p, 0.392, 0.404), 1 - seg(p, 0.78, 0.81)),
    discharge,
    nozzlePrime: Math.min(seg(p, 0.468, 0.5), 1 - seg(p, 0.5, 0.53)),

    /* ---- the collision is derived, never authored: it exists exactly
            where fire and suppressant are both present. ---- */
    collision: Math.min(fire, discharge),
    shock: pulse(p, 0.528, 0.572),
    wet: track(p, [[0, 0], [0.55, 0], [0.66, 0.4], [0.72, 0.7], [0.782, 1], [1, 0.88]]),

    /* ---- pressure continues through the system ---- */
    // Stops at the isolation valve (0.487 along the run) and reflects.
    waveHead: track(p, [
      [0, 0], [0.802, 0], [0.866, 0.462], [0.879, 0.487],
      [0.889, 0.436], [0.902, 0.458], [1, 0.452],
    ]),
    waveOn: Math.min(seg(p, 0.796, 0.808), 1 - seg(p, 0.878, 0.895)),
    valveClose: track(p, [[0, 0], [0.866, 0], [0.879, 1], [1, 1]]),
    valveSnap: pulse(p, 0.868, 0.888),
    reliefOpen: track(p, [[0, 0], [0.911, 0], [0.928, 1], [0.972, 1], [1, 0.92]]),
    reliefVent: track(p, [
      [0, 0], [0.917, 0], [0.936, 1], [0.958, 0.6], [0.978, 0.22], [1, 0.06],
    ]),

    // Wide enough that nine protection points can light in sequence rather
    // than flashing on together.
    reveal: seg(p, 0.928, 1),

    /* ---- vibration: the vessel shakes while it burns, jolts on impact,
            and takes one hard knock when the isolation valve slams. ---- */
    shake:
      track(p, [[0, 0.25], [0.14, 0.7], [0.5, 0.75], [0.6, 0.35], [0.7, 0.12], [0.78, 0], [1, 0]]) +
      pulse(p, 0.53, 0.566) * 0.9 +
      pulse(p, 0.87, 0.886) * 1.1,
  };
}
