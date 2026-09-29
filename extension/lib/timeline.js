// Controller for the "Still aus Timeline wählen" view. Drives Pitch's own
// player element (the only one that can decode the MediaSource blob).
import { frameIndex, frameTime, toTimecode } from './geometry.js';
import { captureCurrent, estimateFps, waitSeeked } from './frames.js';

export async function createTimeline(video) {
  const fps = await estimateFps(video);
  const wasPaused = video.paused;
  const t0 = video.currentTime;
  video.pause();
  const duration = video.duration;
  const lastFrame = Math.max(0, Math.ceil(duration * fps - 1e-6) - 1);
  const clampFrame = (i) => Math.min(Math.max(0, Math.round(i)), lastFrame);

  const ctrl = {
    video,
    fps,
    duration,
    lastFrame,
    get playing() { return !video.paused && !video.ended; },
    get frame() { return clampFrame(frameIndex(video.currentTime, fps)); },
    timecode() { return toTimecode(video.currentTime, fps); },
    togglePlay() {
      if (video.paused || video.ended) {
        if (video.ended || ctrl.frame >= lastFrame) ctrl.seekFrame(0);
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    },
    seekFrame(i) {
      video.pause();
      video.currentTime = Math.min(frameTime(clampFrame(i), fps), duration - 0.001);
    },
    stepFrames(n) { ctrl.seekFrame(ctrl.frame + n); },
    stepSeconds(s) { ctrl.seekFrame(ctrl.frame + Math.round(s * fps)); },
    seekRatio(r) { ctrl.seekFrame(r * lastFrame); },
    async capture() {
      video.pause();
      if (video.seeking) await waitSeeked(video);
      const frame = ctrl.frame;
      const blob = await captureCurrent(video);
      return {
        label: 'Timeline',
        time: video.currentTime,
        frame,
        timecode: ctrl.timecode(),
        blob,
        url: URL.createObjectURL(blob),
      };
    },
    restore() {
      video.pause();
      try { video.currentTime = t0; } catch { /* ignore */ }
      if (!wasPaused) video.play().catch(() => {});
    },
  };
  return ctrl;
}
