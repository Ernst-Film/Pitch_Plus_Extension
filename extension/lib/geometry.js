// Pure helpers – no DOM, unit-tested with node --test.

const TRANSLATE = /translate\(\s*(-?[\d.]+)px,\s*(-?[\d.]+)px\s*\)/;
const WIDTH = /(?:^|;|\s)width:\s*(-?[\d.]+)px/;
const HEIGHT = /(?:^|;|\s)height:\s*(-?[\d.]+)px/;

// Slide-space geometry (1920x1080) from a Pitch block's inline style.
export function parseGeometry(style) {
  if (!style) return null;
  const t = style.match(TRANSLATE);
  const w = style.match(WIDTH);
  const h = style.match(HEIGHT);
  if (!t || !w || !h) return null;
  return { x: +t[1], y: +t[2], w: +w[1], h: +h[1] };
}

export function frameTimes(duration) {
  const clamp = (v) => Math.min(Math.max(v, 0), duration);
  const first = clamp(0.05);
  return [
    { label: 'First', time: first },
    { label: 'Mid', time: clamp(duration / 2) },
    { label: 'Last', time: Math.max(first, clamp(duration - 0.1)) },
  ];
}

// The still must sit strictly below the video.
export function needsBackward(zImg, zVideo) {
  return zImg >= zVideo;
}

export function fmt(n) {
  return String(Math.round(n * 100) / 100);
}

const COMMON_FPS = [23.976, 24, 25, 29.97, 30, 48, 50, 59.94, 60];

// Measured frame duration (s) → nearest common frame rate; 30 if unknown.
export function snapFps(frameDuration) {
  if (!(frameDuration > 0)) return 30;
  const fps = 1 / frameDuration;
  return COMMON_FPS.reduce((best, f) => (Math.abs(f - fps) < Math.abs(best - fps) ? f : best));
}

// Index of the frame that contains `t`. Epsilon keeps boundary times stable.
export function frameIndex(t, fps) {
  return Math.max(0, Math.floor(t * fps + 1e-6));
}

// Middle of frame `i` – seeking there shows exactly that frame in every decoder.
export function frameTime(i, fps) {
  return (Math.max(0, i) + 0.5) / fps;
}

export function toTimecode(t, fps) {
  const nominal = Math.round(fps);
  const total = frameIndex(t, fps);
  const ff = total % nominal;
  const whole = Math.floor(total / nominal);
  const parts = [Math.floor(whole / 3600), Math.floor((whole % 3600) / 60), whole % 60, ff];
  return parts.map((n) => String(n).padStart(2, '0')).join(':');
}

// Square loading badge centred on the video, `ratio` of the shorter side.
export function loaderGeometry(geo, ratio) {
  const size = Math.round(Math.min(geo.w, geo.h) * ratio);
  return {
    x: Math.round(geo.x + (geo.w - size) / 2),
    y: Math.round(geo.y + (geo.h - size) / 2),
    w: size,
    h: size,
  };
}

// Pitch keeps a dense z ranking and ⌘[ / ⌘] swap with the neighbour. Moving
// back ends directly below the video after the full distance (the video
// shifts up by one on the last swap); moving forward must stop one short.
export function layerSteps(zImg, zVideo) {
  if (zImg > zVideo) return { dir: 'back', count: zImg - zVideo };
  if (zImg < zVideo - 1) return { dir: 'forward', count: zVideo - zImg - 1 };
  return { dir: 'none', count: 0 };
}
