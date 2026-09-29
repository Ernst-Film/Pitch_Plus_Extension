// Every Pitch-specific selector and DOM interaction lives here. If Pitch
// changes its markup, this is the only file that should need updating.
// Verified against app.pitch.com on 2026-09-16.

import { parseGeometry } from './geometry.js';

export const SEL = {
  slide: '.slide.editable',
  videoBlock: '.slide.editable .position.video',
  selectedVideo: '.slide.editable .position.video.block-selected',
  imageBlock: '.slide.editable .position.image',
  selectedImage: '.slide.editable .position.image.block-selected',
  interactionLayer: '[data-test-id="slide-interaction-layer"]',
  sizeInput: 'input.small[type="text"]',
  sizePanelTitle: 'Size & position',
  toolbarButtonTexts: ['Replace', 'Playback'],
};

export function selectedVideoBlock() {
  return document.querySelector(SEL.selectedVideo);
}

export function videoElement(block) {
  return block?.querySelector('video') || null;
}

export function blockId(block) {
  return block?.dataset?.testId || '';
}

export function blockGeometry(block) {
  return parseGeometry(block?.getAttribute('style'));
}

export function zIndex(block) {
  return parseInt(getComputedStyle(block).zIndex, 10) || 0;
}

// Scoped to the editable slide: the slide thumbnails in the sidebar reuse the
// same data-test-id values, so a document-wide lookup would hit the wrong node.
export function blockInSlide(id) {
  return document.querySelector(`${SEL.slide} .position[data-test-id="${id}"]`);
}

export function sendForward() {
  sendShortcut(']', 'BracketRight', 221);
}

export function imageBlocks() {
  return [...document.querySelectorAll(SEL.imageBlock)];
}

export function interactionLayer() {
  return document.querySelector(SEL.interactionLayer) || document.querySelector(SEL.slide);
}

// Pitch's floating toolbar for the selected block (contains "Replace"/"Playback").
export function toolbar() {
  const btn = [...document.querySelectorAll('button')].find((b) =>
    SEL.toolbarButtonTexts.includes(b.textContent.trim()));
  if (!btn) return null;
  // walk up to the container that holds all toolbar buttons
  let el = btn.parentElement;
  while (el && el.querySelectorAll('button').length < 2) el = el.parentElement;
  return el;
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function waitFor(pred, timeoutMs, intervalMs = 100) {
  const end = Date.now() + timeoutMs;
  for (;;) {
    const v = pred();
    if (v) return v;
    if (Date.now() > end) return null;
    await sleep(intervalMs);
  }
}

export function waitForNewSelectedImage(knownIds, timeoutMs) {
  return waitFor(() => {
    const sel = document.querySelector(SEL.selectedImage);
    return sel && !knownIds.has(blockId(sel)) ? sel : null;
  }, timeoutMs, 150);
}

export function sizeInputs() {
  // Order in the panel: W, H, X, Y (then rotation). Only present when the
  // "Size & position" section is expanded.
  const inputs = [...document.querySelectorAll(SEL.sizeInput)];
  if (inputs.length < 4) return null;
  const [W, H, X, Y] = inputs;
  return { W, H, X, Y };
}

function sizePanelTitle() {
  // The title text node sits next to a lock icon, so match on text nodes.
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    if (node.nodeValue.trim() === SEL.sizePanelTitle) return node.parentElement;
  }
  return null;
}

// The "…" button at the end of the block toolbar opens the inspector panel.
function toolbarMoreButton() {
  const bar = toolbar();
  if (!bar) return null;
  const buttons = [...bar.querySelectorAll('button')];
  return buttons[buttons.length - 1] || null;
}

// Make sure the inspector is open and "Size & position" is expanded so the
// W/H/X/Y inputs exist. Works from a fully collapsed side panel.
export async function openSizePanel() {
  if (sizeInputs()) return true;
  if (!sizePanelTitle()) {
    const more = toolbarMoreButton();
    if (!more) return false;
    more.click();
    if (!(await waitFor(sizePanelTitle, 2000))) return false;
  }
  if (sizeInputs()) return true;
  const chevron = sizePanelTitle()?.closest('.row-headline')?.querySelector('button.accordion-item');
  if (!chevron) return false;
  chevron.click();
  return !!(await waitFor(sizeInputs, 2000));
}

const nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;

// React-controlled input: set through the native setter, then fire the events
// Pitch listens to (input → state, Enter/blur → commit).
export function setInput(el, value) {
  el.focus();
  nativeSetter.call(el, String(value));
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  el.blur();
}

function sendShortcut(key, code, keyCode) {
  const mac = navigator.platform.toUpperCase().includes('MAC');
  const init = { key, code, keyCode, bubbles: true, cancelable: true, metaKey: mac, ctrlKey: !mac };
  // One keydown = exactly one layer step in Pitch (verified); no keyup needed.
  document.body.dispatchEvent(new KeyboardEvent('keydown', init));
}

export function sendBackward() {
  sendShortcut('[', 'BracketLeft', 219);
}

export function clickBlock(block) {
  const r = block.getBoundingClientRect();
  const opts = { bubbles: true, cancelable: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, button: 0 };
  const target = document.elementFromPoint(opts.clientX, opts.clientY) || block;
  target.dispatchEvent(new PointerEvent('pointerdown', { ...opts, pointerId: 1, isPrimary: true }));
  target.dispatchEvent(new MouseEvent('mousedown', opts));
  target.dispatchEvent(new PointerEvent('pointerup', { ...opts, pointerId: 1, isPrimary: true }));
  target.dispatchEvent(new MouseEvent('mouseup', opts));
  target.dispatchEvent(new MouseEvent('click', opts));
}

export function dropFile(file) {
  const target = interactionLayer();
  const slide = document.querySelector(SEL.slide) || target;
  const r = slide.getBoundingClientRect();
  const dt = new DataTransfer();
  dt.items.add(file);
  for (const type of ['dragenter', 'dragover', 'drop']) {
    target.dispatchEvent(new DragEvent(type, {
      bubbles: true, cancelable: true, dataTransfer: dt,
      clientX: r.left + r.width / 2, clientY: r.top + r.height / 2,
    }));
  }
}
