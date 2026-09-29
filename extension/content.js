// Entry point (classic content script). Loads the ES modules via the
// extension URL and wires selection watching to the UI.
(async () => {
  const url = (p) => chrome.runtime.getURL(p);
  const [dom, framesMod, insertMod, ui, timeline, settings] = await Promise.all([
    import(url('lib/pitch-dom.js')),
    import(url('lib/frames.js')),
    import(url('lib/insert.js')),
    import(url('lib/ui.js')),
    import(url('lib/timeline.js')),
    import(url('lib/settings.js')),
  ]);

  let currentVideo = null;
  let busy = false;

  const STEP_TEXT = {
    geometry: 'Videoposition lesen …',
    drop: 'Standbild einfügen …',
    position: 'Standbild positionieren …',
    layer: 'Standbild hinter das Video legen …',
    'loader-drop': 'Ladegrafik einfügen …',
    'loader-position': 'Ladegrafik positionieren …',
    'loader-layer': 'Ladegrafik zwischen Standbild und Video legen …',
    reselect: 'Fertig.',
  };

  // ----- loading graphic state for the popup -----
  let previewUrl = null;
  async function loaderState() {
    const s = await settings.loadSettings();
    const file = settings.loaderFile(s);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = URL.createObjectURL(file);
    return {
      enabled: s.loaderEnabled,
      custom: !!s.customLoader,
      name: s.customLoader ? s.customLoader.name : 'Standard-Spinner',
      previewUrl,
    };
  }

  async function onLoaderChange(action, value) {
    if (action === 'toggle') {
      await settings.saveSettings({ loaderEnabled: !!value });
    } else if (action === 'pick') {
      if (!value.type.startsWith('image/')) throw new Error('Bitte eine Bilddatei wählen (PNG, GIF, WebP, JPG).');
      if (value.size > settings.MAX_CUSTOM_BYTES) throw new Error('Grafik ist größer als 4 MB.');
      const dataUrl = await settings.fileToDataUrl(value);
      await settings.saveSettings({ customLoader: { name: value.name, dataUrl }, loaderEnabled: true });
    } else if (action === 'reset') {
      await settings.saveSettings({ customLoader: null });
    }
    return loaderState();
  }

  // ----- main flow -----
  async function onButtonClick() {
    if (busy || !currentVideo) return;
    const videoBlock = currentVideo;
    const video = dom.videoElement(videoBlock);
    if (!video) return;
    busy = true;
    let frames = null;
    const cleanup = () => {
      ui.closePopup();
      framesMod.revokeFrames(frames);
      busy = false;
    };
    try {
      ui.openPopup({ onCancel: cleanup });
      ui.setProgress('Frames werden gelesen …');
      const started = Date.now();
      for (;;) {
        try { frames = await framesMod.grabFrames(video); break; } catch (e) {
          if (e.message !== 'Video lädt noch' || Date.now() - started > 15000) throw e;
          ui.setProgress('Video lädt noch …');
          await dom.sleep(500);
        }
      }
      const choice = await ui.showFrames(frames, {
        loader: await loaderState(),
        onLoaderChange,
        onTimeline: async () => {
          ui.setProgress('Timeline wird vorbereitet …');
          const ctrl = await timeline.createTimeline(video);
          ui.setProgress('');
          try { return await ui.showTimeline(ctrl); } finally { ctrl.restore(); }
        },
      });
      if (!choice) { cleanup(); return; }
      const loaderFile = choice.loaderEnabled ? settings.loaderFile(await settings.loadSettings()) : null;
      await insertMod.insertFrameBehind(videoBlock, choice.frame.blob,
        (step) => ui.setProgress(STEP_TEXT[step] || step), { loaderFile });
      ui.setProgress(loaderFile ? 'Standbild und Ladegrafik liegen hinter dem Video ✓' : 'Frame liegt hinter dem Video ✓');
      await dom.sleep(1500);
      cleanup();
    } catch (e) {
      console.error('[previs]', e);
      ui.setError(`${e.message} – Bild ggf. manuell prüfen oder mit ⌘Z zurücknehmen.`);
      busy = false;
    }
  }

  let scheduled = false;
  function check() {
    scheduled = false;
    const block = dom.selectedVideoBlock();
    currentVideo = block;
    if (block) ui.showButton(dom.toolbar(), block, onButtonClick);
    else ui.hideButton();
  }
  new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(check);
  }).observe(document.body, { attributes: true, attributeFilter: ['class', 'style'], childList: true, subtree: true });
  check();
})();
