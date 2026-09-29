// Button next to Pitch's block toolbar, the frame-picker popup and the
// timeline view. Everything lives in a Shadow DOM so Pitch's CSS and ours
// never touch.

const CSS = `
  :host { all: initial; }
  * { box-sizing: border-box; font-family: Lato, "Helvetica Neue", sans-serif; }
  [hidden] { display: none !important; }
  .btn { display: inline-flex; align-items: center; gap: 6px; height: 32px; padding: 0 12px;
    border: 0; border-radius: 8px; background: #6b4eff; color: #fff; font-size: 13px; font-weight: 600; cursor: pointer;
    box-shadow: 0 2px 8px rgba(0,0,0,.18); white-space: nowrap; }
  .btn:hover { background: #5a3ee6; }
  .btn svg { width: 14px; height: 14px; }
  .overlay { position: fixed; inset: 0; background: rgba(20,16,40,.45); display: flex; align-items: center; justify-content: center; z-index: 2147483647; }
  .card { width: 760px; max-width: calc(100vw - 40px); max-height: calc(100vh - 40px); overflow: auto; background: #fff; border-radius: 14px;
    padding: 22px 24px 18px; box-shadow: 0 30px 80px rgba(0,0,0,.35); color: #1e1b2e; }
  .card.wide { width: 900px; }
  h2 { margin: 0 0 4px; font-size: 17px; font-weight: 700; }
  .sub { margin: 0 0 16px; font-size: 13px; color: #6e6a80; }
  .frames { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; }
  .frame { border: 2px solid #e6e3f2; border-radius: 10px; padding: 6px; cursor: pointer; background: #f7f6fc; text-align: center; }
  .frame:hover { border-color: #b8aef7; }
  .frame.on { border-color: #6b4eff; background: #efeaff; }
  .frame img { width: 100%; aspect-ratio: 16/9; object-fit: contain; background: #000; border-radius: 6px; display: block; }
  .frame .label { font-size: 12px; font-weight: 600; margin-top: 6px; }
  .frame .time { font-size: 11px; color: #6e6a80; font-variant-numeric: tabular-nums; }
  .options { margin-top: 16px; padding: 12px 14px; border: 1px solid #ebe8f5; border-radius: 10px; display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
  .toggle { display: inline-flex; align-items: center; gap: 10px; font-size: 13px; font-weight: 600; cursor: pointer; user-select: none; }
  .toggle input { display: none; }
  .switch { width: 34px; height: 20px; border-radius: 10px; background: #d9d5ea; position: relative; transition: background .15s; flex: none; }
  .switch::after { content: ""; position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 50%; background: #fff; transition: left .15s; box-shadow: 0 1px 3px rgba(0,0,0,.25); }
  .toggle input:checked + .switch { background: #6b4eff; }
  .toggle input:checked + .switch::after { left: 16px; }
  .loader-box { display: inline-flex; align-items: center; gap: 8px; margin-left: auto; font-size: 12px; color: #6e6a80; }
  .loader-box.off { opacity: .45; }
  .loader-preview { width: 32px; height: 32px; object-fit: contain; border-radius: 6px;
    background: repeating-conic-gradient(#eee 0 25%, #fff 0 50%) 0 0 / 10px 10px; }
  .link { border: 0; background: none; color: #6b4eff; font-size: 12px; font-weight: 600; cursor: pointer; padding: 2px 4px; }
  .link:hover { text-decoration: underline; }
  .row { display: flex; align-items: center; gap: 10px; margin-top: 18px; }
  .status { flex: 1; font-size: 13px; color: #4b4763; min-height: 1.2em; }
  .status.err { color: #c92a2a; }
  .b { height: 36px; padding: 0 16px; border-radius: 8px; border: 1px solid #d9d5ea; background: #fff; font-size: 13px; font-weight: 600; cursor: pointer; color: #1e1b2e; white-space: nowrap; }
  .b:hover { border-color: #b8aef7; }
  .b.primary { background: #6b4eff; border-color: #6b4eff; color: #fff; }
  .b:disabled { opacity: .45; cursor: default; }
  .spinner { width: 14px; height: 14px; border: 2px solid #c8c2ea; border-top-color: #6b4eff; border-radius: 50%; animation: spin .8s linear infinite; display: inline-block; vertical-align: -2px; margin-right: 6px; }
  @keyframes spin { to { transform: rotate(360deg); } }

  .stage { position: relative; background: #000; border-radius: 10px; overflow: hidden; }
  .stage canvas { display: block; width: 100%; height: auto; }
  .stage .loading { position: absolute; inset: 0; display: grid; place-items: center; color: #fff; font-size: 13px; }
  .track { position: relative; height: 34px; margin-top: 12px; background: #f1eff9; border-radius: 6px; cursor: pointer; user-select: none; touch-action: none; }
  .track .played { position: absolute; left: 0; top: 0; bottom: 0; background: #ddd5ff; border-radius: 6px 0 0 6px; pointer-events: none; }
  .track .head { position: absolute; top: -4px; bottom: -4px; width: 2px; margin-left: -1px; background: #6b4eff; pointer-events: none; }
  .track .head::before { content: ""; position: absolute; top: -4px; left: -5px; width: 12px; height: 8px; border-radius: 2px; background: #6b4eff; }
  .tl-info { display: flex; align-items: center; gap: 16px; margin-top: 12px; }
  .tc { font-family: "SF Mono", Menlo, Consolas, monospace; font-size: 22px; font-weight: 600; letter-spacing: .02em; font-variant-numeric: tabular-nums; }
  .fc { font-size: 13px; color: #4b4763; font-variant-numeric: tabular-nums; }
  .play { width: 40px; padding: 0; font-size: 15px; }
  .keys { margin-left: auto; font-size: 11px; color: #6e6a80; line-height: 1.9; text-align: right; }
  kbd { font-family: "SF Mono", Menlo, monospace; font-size: 10px; border: 1px solid #d9d5ea; border-bottom-width: 2px; border-radius: 4px; padding: 0 5px; margin: 0 2px; color: #1e1b2e; background: #faf9fe; }
`;

const ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M8 5v14"/></svg>';

let host = null;
let shadow = null;
let buttonEl = null;
let clickHandler = null;
let popupEl = null;
let statusEl = null;
let resolveChoice = null;
let viewKeys = null; // (KeyboardEvent) => boolean handled

function ensureHost() {
  if (host) return;
  host = document.createElement('div');
  host.id = 'pitch-previs-host';
  shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = CSS;
  shadow.appendChild(style);
  document.documentElement.appendChild(host);
}

// While the popup is open, real key presses must not reach Pitch (arrow keys
// would move the selected video, space would toggle it). Synthetic events –
// our own layer shortcuts – are not trusted and pass through untouched.
function onKeyCapture(e) {
  if (!popupEl || !e.isTrusted) return;
  e.stopImmediatePropagation();
  if (e.type === 'keydown' && viewKeys && viewKeys(e)) e.preventDefault();
}

function installKeyGuard() {
  window.addEventListener('keydown', onKeyCapture, true);
  window.addEventListener('keyup', onKeyCapture, true);
}

function removeKeyGuard() {
  window.removeEventListener('keydown', onKeyCapture, true);
  window.removeEventListener('keyup', onKeyCapture, true);
}

// ---------- toolbar button ----------

export function showButton(toolbar, block, onClick) {
  ensureHost();
  if (!buttonEl) {
    buttonEl = document.createElement('button');
    buttonEl.className = 'btn';
    buttonEl.innerHTML = `${ICON}<span>Previs Frame</span>`;
    buttonEl.addEventListener('mousedown', (e) => e.stopPropagation());
    buttonEl.addEventListener('click', (e) => { e.stopPropagation(); clickHandler?.(); });
  }
  clickHandler = onClick;
  // Position: right of Pitch's toolbar if we can see it, else above the block.
  const anchor = (toolbar || block).getBoundingClientRect();
  if (!buttonEl.isConnected) shadow.appendChild(buttonEl);
  buttonEl.style.position = 'fixed';
  buttonEl.style.zIndex = '2147483646';
  if (toolbar) {
    buttonEl.style.left = `${anchor.right + 6}px`;
    buttonEl.style.top = `${anchor.top + (anchor.height - 32) / 2}px`;
  } else {
    buttonEl.style.left = `${anchor.right - 130}px`;
    buttonEl.style.top = `${anchor.top - 40}px`;
  }
}

export function hideButton() {
  if (buttonEl?.isConnected) buttonEl.remove();
}

// ---------- popup shell ----------

export function openPopup({ onCancel }) {
  ensureHost();
  closePopup();
  popupEl = document.createElement('div');
  popupEl.className = 'overlay';
  popupEl.innerHTML = `
    <div class="card">
      <section class="view-frames">
        <h2>Previs Frame</h2>
        <p class="sub">Standbild wählen – es wird deckungsgleich direkt hinter das Video gelegt.</p>
        <div class="frames"></div>
        <div class="options" hidden>
          <label class="toggle"><input type="checkbox" class="loader-on"><span class="switch"></span>
            <span>Ladegrafik zwischen Standbild und Video</span></label>
          <div class="loader-box">
            <img class="loader-preview" alt="">
            <span class="loader-name"></span>
            <button class="link pick">Eigene Grafik…</button>
            <button class="link reset" hidden>Standard</button>
            <input type="file" class="file" accept="image/*" hidden>
          </div>
        </div>
        <div class="row">
          <button class="b timeline-btn" disabled>Still aus Timeline wählen</button>
          <div class="status"></div>
          <button class="b cancel">Abbrechen</button>
          <button class="b primary confirm" disabled>Confirm</button>
        </div>
      </section>
      <section class="view-timeline" hidden></section>
    </div>`;
  statusEl = popupEl.querySelector('.status');
  popupEl.querySelector('.cancel').addEventListener('click', () => { resolveChoice?.(null); onCancel?.(); });
  popupEl.addEventListener('mousedown', (e) => e.stopPropagation());
  viewKeys = (e) => {
    if (e.key === 'Escape') { popupEl.querySelector('.cancel').click(); return true; }
    return false;
  };
  installKeyGuard();
  shadow.appendChild(popupEl);
}

function renderLoader(loader) {
  const box = popupEl.querySelector('.options');
  box.hidden = false;
  box.querySelector('.loader-on').checked = loader.enabled;
  box.querySelector('.loader-box').classList.toggle('off', !loader.enabled);
  box.querySelector('.loader-preview').src = loader.previewUrl;
  box.querySelector('.loader-name').textContent = loader.name;
  box.querySelector('.reset').hidden = !loader.custom;
}

// Render thumbnails and resolve with { frame, loaderEnabled } (or null on cancel).
//   loader:         { enabled, previewUrl, name, custom }
//   onLoaderChange: async (action: 'toggle'|'pick'|'reset', value) => loader
//   onTimeline:     async () => frame | null
export function showFrames(frames, { loader, onLoaderChange, onTimeline }) {
  const view = popupEl.querySelector('.view-frames');
  const grid = view.querySelector('.frames');
  const confirm = view.querySelector('.confirm');
  const timelineBtn = view.querySelector('.timeline-btn');
  let selected = frames[0];
  let loaderState = loader;

  const render = () => {
    grid.innerHTML = '';
    for (const f of frames) {
      const el = document.createElement('div');
      el.className = 'frame' + (f === selected ? ' on' : '');
      const detail = f.timecode ? `${f.timecode} · Frame ${f.frame}` : `${f.time.toFixed(2)} s`;
      el.innerHTML = `<img src="${f.url}" alt=""><div class="label">${f.label}</div><div class="time">${detail}</div>`;
      el.addEventListener('click', () => { selected = f; render(); });
      el.addEventListener('dblclick', () => confirm.click());
      grid.appendChild(el);
    }
  };
  render();
  renderLoader(loaderState);

  const opts = view.querySelector('.options');
  const change = async (action, value) => {
    try {
      loaderState = await onLoaderChange(action, value);
      renderLoader(loaderState);
      setProgress('');
    } catch (e) {
      setError(e.message);
      renderLoader(loaderState);
      confirm.disabled = false;
    }
  };
  opts.querySelector('.loader-on').onchange = (e) => change('toggle', e.target.checked);
  opts.querySelector('.pick').onclick = () => opts.querySelector('.file').click();
  opts.querySelector('.file').onchange = (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) change('pick', f); };
  opts.querySelector('.reset').onclick = () => change('reset');

  timelineBtn.disabled = false;
  timelineBtn.onclick = async () => {
    timelineBtn.disabled = true;
    try {
      const frame = await onTimeline();
      if (frame) {
        frames.push(frame); // caller revokes all frame URLs at the end
        selected = frame;
        render();
      }
    } catch (e) {
      statusEl.className = 'status err';
      statusEl.textContent = `Timeline: ${e.message}`;
    } finally {
      timelineBtn.disabled = false;
    }
  };

  confirm.disabled = false;
  setProgress('');
  viewKeys = (e) => {
    if (e.key === 'Escape') { view.querySelector('.cancel').click(); return true; }
    if (e.key === 'Enter' && !confirm.disabled) { confirm.click(); return true; }
    return false;
  };
  return new Promise((resolve) => {
    resolveChoice = resolve;
    confirm.onclick = () => {
      for (const el of view.querySelectorAll('button, input')) if (!el.classList.contains('cancel')) el.disabled = true;
      grid.style.pointerEvents = 'none';
      viewKeys = null;
      resolve({ frame: selected, loaderEnabled: loaderState.enabled });
    };
  });
}

// ---------- timeline view ----------

// Show the timeline for `ctrl` (see timeline.js). Resolves with a captured
// frame when "Frame setzen" is pressed, or null when going back.
export function showTimeline(ctrl) {
  const card = popupEl.querySelector('.card');
  const framesView = popupEl.querySelector('.view-frames');
  const view = popupEl.querySelector('.view-timeline');
  const prevKeys = viewKeys;
  view.innerHTML = `
    <h2>Still aus Timeline wählen</h2>
    <p class="sub">Video abspielen oder framegenau steppen, dann „Frame setzen“.</p>
    <div class="stage"><canvas></canvas></div>
    <div class="track"><div class="played"></div><div class="head"></div></div>
    <div class="tl-info">
      <button class="b play" title="Play/Pause (Space)">▶</button>
      <div>
        <div class="tc">00:00:00:00</div>
        <div class="fc"></div>
      </div>
      <div class="keys">
        <kbd>Space</kbd> Play/Pause · <kbd>←</kbd><kbd>→</kbd> 1 Frame · <kbd>⇧←</kbd><kbd>⇧→</kbd> 1 Sekunde<br>
        <kbd>Home</kbd><kbd>End</kbd> Anfang/Ende · <kbd>⏎</kbd> Frame setzen · <kbd>Esc</kbd> zurück
      </div>
    </div>
    <div class="row">
      <div class="status tl-status"></div>
      <button class="b back">Zurück</button>
      <button class="b primary set">Frame setzen</button>
    </div>`;
  card.classList.add('wide');
  framesView.hidden = true;
  view.hidden = false;

  const video = ctrl.video;
  const canvas = view.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const stage = view.querySelector('.stage');
  const cssW = stage.clientWidth || 852;
  const scale = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.min(video.videoWidth, Math.round(cssW * scale));
  canvas.height = Math.round(canvas.width * video.videoHeight / video.videoWidth);

  const track = view.querySelector('.track');
  const played = track.querySelector('.played');
  const head = track.querySelector('.head');
  const tc = view.querySelector('.tc');
  const fc = view.querySelector('.fc');
  const playBtn = view.querySelector('.play');
  const setBtn = view.querySelector('.set');
  const tlStatus = view.querySelector('.tl-status');

  let raf = 0;
  const draw = () => {
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const r = ctrl.lastFrame ? ctrl.frame / ctrl.lastFrame : 0;
    played.style.width = `${r * 100}%`;
    head.style.left = `${r * 100}%`;
    tc.textContent = ctrl.timecode();
    fc.textContent = `Frame ${ctrl.frame} / ${ctrl.lastFrame} · ${ctrl.fps} fps`;
    playBtn.textContent = ctrl.playing ? '❚❚' : '▶';
    raf = requestAnimationFrame(draw);
  };
  raf = requestAnimationFrame(draw);

  let dragging = false;
  const seekAt = (clientX) => {
    const r = track.getBoundingClientRect();
    ctrl.seekRatio(Math.min(Math.max((clientX - r.left) / r.width, 0), 1));
  };
  track.addEventListener('pointerdown', (e) => { dragging = true; track.setPointerCapture(e.pointerId); seekAt(e.clientX); });
  track.addEventListener('pointermove', (e) => { if (dragging) seekAt(e.clientX); });
  track.addEventListener('pointerup', () => { dragging = false; });
  playBtn.addEventListener('click', () => ctrl.togglePlay());

  return new Promise((resolve) => {
    const finish = (value) => {
      cancelAnimationFrame(raf);
      viewKeys = prevKeys;
      view.hidden = true;
      view.innerHTML = '';
      card.classList.remove('wide');
      framesView.hidden = false;
      resolve(value);
    };
    const setFrame = async () => {
      setBtn.disabled = true;
      try {
        finish(await ctrl.capture());
      } catch (e) {
        tlStatus.className = 'status tl-status err';
        tlStatus.textContent = e.message;
        setBtn.disabled = false;
      }
    };
    view.querySelector('.back').addEventListener('click', () => { ctrl.pause(); finish(null); });
    setBtn.addEventListener('click', setFrame);
    viewKeys = (e) => {
      switch (e.key) {
        case ' ': ctrl.togglePlay(); return true;
        case 'ArrowLeft': e.shiftKey ? ctrl.stepSeconds(-1) : ctrl.stepFrames(-1); return true;
        case 'ArrowRight': e.shiftKey ? ctrl.stepSeconds(1) : ctrl.stepFrames(1); return true;
        case 'Home': ctrl.seekFrame(0); return true;
        case 'End': ctrl.seekFrame(ctrl.lastFrame); return true;
        case 'Enter': if (!setBtn.disabled) setFrame(); return true;
        case 'Escape': ctrl.pause(); finish(null); return true;
        default: return false;
      }
    };
  });
}

// ---------- status ----------

export function setProgress(text) {
  if (!statusEl) return;
  statusEl.className = 'status';
  statusEl.innerHTML = text && !/✓|^$/.test(text) ? `<span class="spinner"></span>${text}` : text;
}

export function setError(text) {
  if (!statusEl) return;
  statusEl.className = 'status err';
  statusEl.textContent = text;
  const confirm = popupEl?.querySelector('.confirm');
  if (confirm) confirm.disabled = true;
}

export function closePopup() {
  resolveChoice = null;
  viewKeys = null;
  removeKeyGuard();
  if (popupEl?.isConnected) popupEl.remove();
  popupEl = null;
  statusEl = null;
}
