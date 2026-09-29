import { fmt, layerSteps, loaderGeometry } from './geometry.js';
import * as dom from './pitch-dom.js';

const UPLOAD_TIMEOUT = 20000;
const MAX_LAYER_STEPS = 60;
const STEP_DELAY = 120;
const TOLERANCE = 1;
const SELECTED_CLASS = 'block-selected';
const LOADER_RATIO = 0.2; // badge size relative to the video's shorter side

function close(a, b) { return Math.abs(a - b) <= TOLERANCE; }

function geometryMatches(block, geo) {
  const g = dom.blockGeometry(block);
  return g && close(g.x, geo.x) && close(g.y, geo.y) && close(g.w, geo.w) && close(g.h, geo.h);
}

async function applyGeometry(geo) {
  const inputs = dom.sizeInputs();
  if (!inputs) throw new Error('Pitch-Oberfläche hat sich geändert (Size-Panel)');
  for (const [key, value] of [['W', geo.w], ['H', geo.h], ['X', geo.x], ['Y', geo.y]]) {
    dom.setInput(inputs[key], fmt(value));
    await dom.sleep(150);
  }
}

// Drop `file` onto the slide and return the image block Pitch creates for it.
async function dropImage(file) {
  const known = new Set(dom.imageBlocks().map(dom.blockId));
  dom.dropFile(file);
  const image = await dom.waitForNewSelectedImage(known, UPLOAD_TIMEOUT);
  if (!image) throw new Error('Pitch hat das Bild nicht angelegt');
  return image;
}

async function positionImage(image, geo) {
  if (!(await dom.openSizePanel())) throw new Error('Pitch-Oberfläche hat sich geändert (Size-Panel)');
  for (let attempt = 0; attempt < 2; attempt++) {
    await applyGeometry(geo);
    if (await dom.waitFor(() => geometryMatches(image, geo), 1500)) return;
  }
  throw new Error('Position konnte nicht gesetzt werden');
}

// Move the selected `image` so it sits directly below the video (z = video − 1).
// Pitch keeps a dense ranking; ⌘[ / ⌘] swap the selection with its neighbour.
async function placeDirectlyBelow(image, videoId) {
  const z = () => [dom.zIndex(image), dom.zIndex(dom.blockInSlide(videoId))];
  let [zImg, zVid] = z();
  const before = zImg;
  const { dir, count } = layerSteps(zImg, zVid);
  if (count > MAX_LAYER_STEPS) throw new Error('Ebenen-Abstand zu groß');
  for (let i = 0; i < count; i++) {
    if (dir === 'back') dom.sendBackward(); else dom.sendForward();
    await dom.sleep(STEP_DELAY);
  }
  await dom.sleep(300);
  [zImg, zVid] = z();
  if (count > 0 && zImg === before) throw new Error('Ebenen-Shortcut wirkt nicht');
  for (let i = 0; i < 5 && zImg !== zVid - 1; i++) {
    const fix = layerSteps(zImg, zVid);
    if (fix.dir === 'back') dom.sendBackward(); else dom.sendForward();
    await dom.sleep(STEP_DELAY);
    [zImg, zVid] = z();
  }
  if (zImg !== zVid - 1) throw new Error('Bild konnte nicht hinter das Video gelegt werden');
}

// Insert the still (and optionally the loading graphic) behind the video.
// Final stacking, bottom to top: still → loading graphic → video.
export async function insertFrameBehind(videoBlock, blob, onProgress = () => {}, { loaderFile = null } = {}) {
  onProgress('geometry');
  const geo = dom.blockGeometry(videoBlock);
  if (!geo) throw new Error('Video-Position konnte nicht gelesen werden');
  const videoId = dom.blockId(videoBlock);

  onProgress('drop');
  const still = await dropImage(new File([blob], `previs-${videoId.slice(0, 8)}.jpg`, { type: 'image/jpeg' }));
  onProgress('position');
  await positionImage(still, geo);
  onProgress('layer');
  await placeDirectlyBelow(still, videoId);

  let loader = null;
  if (loaderFile) {
    onProgress('loader-drop');
    loader = await dropImage(loaderFile);
    onProgress('loader-position');
    await positionImage(loader, loaderGeometry(geo, LOADER_RATIO));
    onProgress('loader-layer');
    await placeDirectlyBelow(loader, videoId); // pushes the still one further down
  }

  const zVid = dom.zIndex(dom.blockInSlide(videoId));
  const zStill = dom.zIndex(still);
  const expectedStill = loader ? zVid - 2 : zVid - 1;
  if (zStill !== expectedStill || (loader && dom.zIndex(loader) !== zVid - 1)) {
    throw new Error('Ebenen-Reihenfolge stimmt nicht (Standbild / Ladegrafik / Video)');
  }

  onProgress('reselect');
  const video = dom.blockInSlide(videoId) || videoBlock;
  dom.clickBlock(video);
  await dom.waitFor(() => video.classList.contains(SELECTED_CLASS), 1000);
  return { imageId: dom.blockId(still), loaderId: loader ? dom.blockId(loader) : null };
}
