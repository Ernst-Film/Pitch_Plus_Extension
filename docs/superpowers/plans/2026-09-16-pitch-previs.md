# Pitch Previs Extension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chrome-Extension, die in Pitch bei ausgewähltem Video einen "Previs Frame"-Button zeigt und den gewählten First/Mid/Last-Frame deckungsgleich eine Ebene hinter das Video legt.

**Architecture:** Nur ein Content-Script auf app.pitch.com. Es steuert Pitch's eigene UI: Frame per Canvas vom Player, Bild per simuliertem Drop einfügen, Geometrie über das "Size & position"-Panel setzen, Ebene per ⌘[ bis unter das Video. Alle Selektoren leben in `lib/pitch-dom.js`.

**Tech Stack:** MV3, Vanilla-JS ES-Module (Content-Script lädt Module per dynamischem `import(chrome.runtime.getURL(...))`), `node --test` für reine Funktionen. Kein Build.

## Global Constraints

- Nur `https://app.pitch.com/*`, keine weiteren Rechte außer `web_accessible_resources` für die Module.
- Folienkoordinaten 1920×1080; Geometrie aus `style` (`translate(Xpx, Ypx)`, `width`, `height`).
- Frame-Zeiten: 0.05 s, duration/2, duration−0.1 s; JPEG Qualität 0.9, volle Videoauflösung.
- Wartebedingungen mit Timeout statt fester Sleeps (Upload-Timeout 20 s, Ebene max. 60 Schritte).
- UI im Shadow DOM.
- Player nach Frame-Grab exakt wiederherstellen (Zeit + Play/Pause).

---

### Task 1: Reine Hilfsfunktionen (TDD)
**Files:** `extension/lib/geometry.js`, `tests/geometry.test.mjs`
**Produces:** `parseGeometry(style) -> {x,y,w,h}|null`, `frameTimes(duration) -> [{label:'First'|'Mid'|'Last', time}]`, `needsBackward(zImg, zVideo) -> boolean`, `fmt(n) -> string` (2 Nachkommastellen ohne Trailing-Zeros).
- [ ] Tests, rot, implementieren, grün, Commit.

### Task 2: pitch-dom.js
**Files:** `extension/lib/pitch-dom.js`
**Produces:** `selectedVideoBlock()`, `videoElement(block)`, `blockGeometry(block)`, `zIndex(block)`, `toolbar()` (Element mit Button-Text "Replace"), `interactionLayer()`, `imageBlocks()`, `waitFor(pred, timeoutMs, intervalMs=100)`, `waitForNewSelectedImage(knownIds, timeoutMs)`, `openSizePanel()` (Pfeil neben "Size & position" klicken, falls W-Feld fehlt), `sizeInputs() -> {W,H,X,Y}`, `setInput(el, value)` (nativer Setter + input + Enter + change + blur), `sendBackward()` (keydown Meta+[ bzw. Ctrl+[ auf document.activeElement||document), `clickBlock(block)`.
- [ ] Implementieren; im Chrome-Tab per JS-Snippet gegen die echte Seite prüfen (`selectedVideoBlock()` liefert Block, `sizeInputs()` liefert 4 Felder). Commit.

### Task 3: frames.js
**Files:** `extension/lib/frames.js`
**Produces:** `grabFrames(video) -> Promise<[{label,time,blob,url}]>`; wirft `Error('Video lädt noch')` bei readyState<2; stellt `currentTime` und Play-Zustand in `finally` wieder her; `revokeFrames(frames)`.
- [ ] Implementieren, im Tab testen (3 Blobs > 50 KB, Video läuft danach weiter). Commit.

### Task 4: insert.js
**Files:** `extension/lib/insert.js`
**Produces:** `insertFrameBehind(videoBlock, blob, onProgress(step:string))` – Schritte: `geometry` → `drop` → `wait-image` → `position` → `layer` → `reselect`. Fehler als `Error` mit deutschen Meldungen aus der Spec.
- [ ] Implementieren, im Tab mit einem echten Blob testen, Ergebnis prüfen (Bild z = Video z − 1, Geometrie ±1 px), Testbild löschen. Commit.

### Task 5: ui.js + content.js + manifest
**Files:** `extension/manifest.json`, `extension/content.js`, `extension/lib/ui.js`, `extension/icons/*`
- manifest: `content_scripts` [{matches: ["https://app.pitch.com/*"], js: ["content.js"], run_at: "document_idle"}], `web_accessible_resources` [{resources:["lib/*"], matches:["https://app.pitch.com/*"]}].
- content.js: `import()` der Module; MutationObserver (attributes+childList+subtree, gedrosselt per rAF) → `ui.showButton(toolbar, onClick)` / `ui.hideButton()`.
- ui.js: `showButton`, `hideButton`, `openPopup({frames, onConfirm, onCancel})`, `setProgress(text)`, `setError(text)`, `closePopup()`. Shadow DOM, Thumbnails als `<img src=blobUrl>`, Radio-Auswahl, Confirm/Abbrechen.
- [ ] Extension in Chrome laden (User), Ablauf auf Folie 7 durchspielen, Ebenenliste prüfen, Testbild löschen. Commit.

### Task 6: README + ZIP
- [ ] README (Installation, Bedienung, Grenzen, Selektoren-Pflege), `dist/` + `Pitch-Previs.zip`. Commit.
