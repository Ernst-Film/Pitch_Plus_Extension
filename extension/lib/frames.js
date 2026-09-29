import { frameTimes, snapFps } from './geometry.js';

const JPEG_QUALITY = 0.9;

export function waitSeeked(video) {
  return new Promise((resolve, reject) => {
    const done = () => { cleanup(); resolve(); };
    const fail = () => { cleanup(); reject(new Error('Frame konnte nicht gelesen werden (seek)')); };
    const cleanup = () => { video.removeEventListener('seeked', done); video.removeEventListener('error', fail); };
    video.addEventListener('seeked', done);
    video.addEventListener('error', fail);
  });
}

function seekTo(video, time) {
  const p = waitSeeked(video);
  video.currentTime = time;
  return p;
}

// Full-resolution JPEG of whatever frame the element currently shows.
export async function captureCurrent(video) {
  const c = document.createElement('canvas');
  c.width = video.videoWidth;
  c.height = video.videoHeight;
  c.getContext('2d').drawImage(video, 0, 0);
  const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', JPEG_QUALITY));
  if (!blob) throw new Error('Frame konnte nicht gelesen werden (canvas)');
  return blob;
}

// Grab first/mid/last frames from Pitch's own player element. The player is
// a MediaSource blob and cannot be loaded into a second element, so we seek
// the real one and restore its state afterwards.
export async function grabFrames(video) {
  if (video.readyState < 2 || !video.duration || !video.videoWidth) {
    throw new Error('Video lädt noch');
  }
  const wasPaused = video.paused;
  const t0 = video.currentTime;
  video.pause();
  const frames = [];
  try {
    for (const { label, time } of frameTimes(video.duration)) {
      await seekTo(video, time);
      const blob = await captureCurrent(video);
      frames.push({ label, time, blob, url: URL.createObjectURL(blob) });
    }
  } finally {
    try { video.currentTime = t0; } catch { /* ignore */ }
    if (!wasPaused) video.play().catch(() => {});
  }
  return frames;
}

// The element does not expose its frame rate. Play a few frames muted and
// read the presentation timestamps; the smallest step is one frame.
export async function estimateFps(video, samples = 8, timeoutMs = 1500) {
  if (typeof video.requestVideoFrameCallback !== 'function') return snapFps(0);
  const wasPaused = video.paused;
  const wasMuted = video.muted;
  const t0 = video.currentTime;
  const times = [];
  try {
    video.muted = true;
    await new Promise((resolve) => {
      const timer = setTimeout(resolve, timeoutMs);
      const onFrame = (_now, meta) => {
        times.push(meta.mediaTime);
        if (times.length > samples) { clearTimeout(timer); resolve(); } else video.requestVideoFrameCallback(onFrame);
      };
      video.requestVideoFrameCallback(onFrame);
      video.play().catch(() => { clearTimeout(timer); resolve(); });
    });
  } finally {
    video.pause();
    video.muted = wasMuted;
    try { video.currentTime = t0; } catch { /* ignore */ }
    if (!wasPaused) video.play().catch(() => {});
  }
  const diffs = times.slice(1).map((t, i) => t - times[i]).filter((d) => d > 0.004);
  return snapFps(diffs.length ? Math.min(...diffs) : 0);
}

export function revokeFrames(frames) {
  for (const f of frames || []) URL.revokeObjectURL(f.url);
}
