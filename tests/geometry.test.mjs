import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseGeometry, frameTimes, needsBackward, fmt } from '../extension/lib/geometry.js';

test('parseGeometry reads translate/width/height', () => {
  const style = 'transform: translate(1306.75px, 580.324px) rotate(0deg); bottom: auto; right: auto; position: absolute; z-index: 35; width: 533.291px; height: 299.976px;';
  assert.deepEqual(parseGeometry(style), { x: 1306.75, y: 580.324, w: 533.291, h: 299.976 });
});

test('parseGeometry returns null when incomplete', () => {
  assert.equal(parseGeometry('position: absolute;'), null);
  assert.equal(parseGeometry(null), null);
});

test('frameTimes first/mid/last', () => {
  const t = frameTimes(10);
  assert.deepEqual(t.map((f) => f.label), ['First', 'Mid', 'Last']);
  assert.equal(t[0].time, 0.05);
  assert.equal(t[1].time, 5);
  assert.ok(Math.abs(t[2].time - 9.9) < 1e-9);
});

test('frameTimes clamps for very short videos', () => {
  const t = frameTimes(0.08);
  assert.ok(t.every((f) => f.time >= 0 && f.time <= 0.08));
  assert.ok(t[2].time >= t[0].time);
});

test('needsBackward', () => {
  assert.equal(needsBackward(36, 35), true);
  assert.equal(needsBackward(35, 35), true);
  assert.equal(needsBackward(34, 35), false);
});

test('fmt rounds to 2 decimals without trailing zeros', () => {
  assert.equal(fmt(1306.75), '1306.75');
  assert.equal(fmt(580.324), '580.32');
  assert.equal(fmt(300), '300');
});

import { snapFps, frameIndex, frameTime, toTimecode, loaderGeometry, layerSteps } from '../extension/lib/geometry.js';

test('snapFps snaps measured frame durations to common rates', () => {
  assert.equal(snapFps(1 / 25), 25);
  assert.equal(snapFps(0.0334), 29.97);
  assert.equal(snapFps(1 / 60.2), 60);
  assert.equal(snapFps(1 / 23.976), 23.976);
  assert.equal(snapFps(0), 30);
  assert.equal(snapFps(NaN), 30);
});

test('frameIndex / frameTime round-trip mid-frame', () => {
  for (const fps of [24, 25, 29.97, 59.94]) {
    for (const i of [0, 1, 17, 1000]) {
      assert.equal(frameIndex(frameTime(i, fps), fps), i);
    }
  }
  assert.equal(frameIndex(0.04, 25), 1);
  assert.equal(frameIndex(0.039, 25), 0);
});

test('toTimecode', () => {
  assert.equal(toTimecode(0, 25), '00:00:00:00');
  assert.equal(toTimecode(61.52, 25), '00:01:01:13');
  assert.equal(toTimecode(frameTime(29, 29.97), 29.97), '00:00:00:29');
});

test('loaderGeometry centres a square badge on the video', () => {
  const g = loaderGeometry({ x: 100, y: 200, w: 800, h: 450 }, 0.2);
  assert.deepEqual(g, { x: 455, y: 380, w: 90, h: 90 });
});

test('layerSteps: backward needs the full distance, forward one less', () => {
  assert.deepEqual(layerSteps(40, 35), { dir: 'back', count: 5 });
  assert.deepEqual(layerSteps(26, 35), { dir: 'forward', count: 8 });
  assert.deepEqual(layerSteps(34, 35), { dir: 'none', count: 0 });
});
