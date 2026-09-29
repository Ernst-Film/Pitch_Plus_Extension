// Persisted user choices (chrome.storage.local) and the loading graphic file.
import { LOADER_GIF_BASE64 } from './loader-data.js';

const KEY = 'previs.settings';
export const MAX_CUSTOM_BYTES = 4 * 1024 * 1024;

async function raw() {
  return (await chrome.storage.local.get(KEY))[KEY] || {};
}

export async function loadSettings() {
  const s = await raw();
  return { loaderEnabled: !!s.loaderEnabled, customLoader: s.customLoader || null };
}

export async function saveSettings(patch) {
  await chrome.storage.local.set({ [KEY]: { ...(await raw()), ...patch } });
}

function base64ToBlob(b64, type) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type });
}

export function dataUrlToBlob(dataUrl) {
  const [head, body] = dataUrl.split(',');
  const type = (head.match(/^data:([^;]+)/) || [])[1] || 'application/octet-stream';
  return base64ToBlob(body, type);
}

export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(new Error('Datei konnte nicht gelesen werden'));
    r.readAsDataURL(file);
  });
}

// The loading graphic as a File ready to drop into Pitch.
export function loaderFile(settings) {
  if (settings.customLoader) {
    const blob = dataUrlToBlob(settings.customLoader.dataUrl);
    return new File([blob], settings.customLoader.name, { type: blob.type });
  }
  return new File([base64ToBlob(LOADER_GIF_BASE64, 'image/gif')], 'previs-loader.gif', { type: 'image/gif' });
}
