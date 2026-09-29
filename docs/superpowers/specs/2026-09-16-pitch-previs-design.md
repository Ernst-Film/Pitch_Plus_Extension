# Pitch Previs Extension – Design

Datum: 2026-09-16

## Ziel

Chrome-Extension für app.pitch.com: Ist ein Video auf einer Folie ausgewählt, erscheint
ein Button "Previs Frame". Ein Klick zeigt First/Mid/Last-Frame des Videos; nach
Bestätigung wird der gewählte Frame als Bild deckungsgleich und **direkt eine Ebene
hinter** dem Video eingefügt. Zweck: Zuschauer mit langsamer Verbindung sehen ein
passendes Standbild statt einer leeren Fläche, während das Video nachlädt.

## Ansatz

Pitch's eigene Bedienwege werden ferngesteuert (kein Nachbau der Sync-API):

| Schritt | Mechanismus (am 16.09.2026 in Pitch verifiziert) |
|---|---|
| Video-Auswahl erkennen | `.slide.editable .position.video.selected` |
| Geometrie lesen | `style` des Blocks: `translate(Xpx, Ypx)`, `width`, `height` – Folienkoordinaten 1920×1080 |
| Frames ziehen | Player-`<video>` im Block pausieren, `currentTime` setzen, `seeked` abwarten, auf Canvas zeichnen (Blob ist MediaSource, nicht separat ladbar) |
| Bild einfügen | `DragEvent` `dragenter/dragover/drop` mit `DataTransfer`-File auf `[data-test-id="slide-interaction-layer"]` |
| Neues Bild erkennen | MutationObserver: neuer `.position.image` mit Klasse `selected` |
| Position/Größe setzen | Panel "Size & position" (Pfeil rechts aufklappen), Felder `input.small[type=text]` in Reihenfolge W, H, X, Y; setzen per nativem Value-Setter + `input`-Event + Enter |
| Ebene | Tastenkürzel `⌘[` (Mac) / `Ctrl+[` als `keydown` auf `document`, wiederholen bis `zIndex(Bild) < zIndex(Video)`; jeder Schritt wird geprüft |
| Abschluss | Video-Block anklicken, damit die Auswahl wieder auf dem Video liegt |

## Extension-Struktur

```
extension/
  manifest.json          MV3, content_script auf https://app.pitch.com/*, keine weiteren Rechte
  content.js             Verdrahtung: Auswahl beobachten, Button ein-/ausblenden, Ablauf starten
  lib/pitch-dom.js       ALLE Selektoren + Funktionen: selectedVideoBlock(), blockGeometry(),
                         waitForNewImageBlock(), openSizePanel(), setGeometry(), sendBackward(),
                         zIndex(), clickBlock()
  lib/frames.js          grabFrames(videoEl) -> [{label, time, blob, dataUrl}] (first/mid/last),
                         stellt Pause/Zeit danach wieder her
  lib/insert.js          insertFrameBehind(videoBlock, blob, onProgress) – Schrittkette mit
                         Wartebedingungen (waitFor(pred, timeout)) statt festen Sleeps
  lib/ui.js              Button + Popup im Shadow DOM (Thumbnails, Auswahl, Confirm, Fortschritt, Fehler)
  ui.css                 Styles für Shadow DOM (als Text in ui.js eingebettet)
  icons/
tests/                   node --test: Geometrie-Parsing, z-Order-Logik (reine Funktionen)
```

## Ablauf im Detail

1. `content.js` beobachtet `document.body` per MutationObserver (Attribut `class`, Subtree).
   Sobald ein `.position.video.selected` existiert, wird der Button an der Pitch-Toolbar
   (Element mit Buttons "Replace"/"Playback") angehängt; verschwindet die Auswahl,
   wird der Button entfernt. Fallback, wenn die Toolbar nicht gefunden wird: Button
   oben rechts am Video-Block positioniert.
2. Klick auf "Previs Frame": Popup öffnet, `grabFrames()` läuft (Times: 0.05 s,
   duration/2, duration−0.1 s). Ist `video.readyState < 2`, zeigt das Popup
   "Video lädt noch …" und versucht es alle 500 ms erneut (max 15 s).
3. Nutzer wählt ein Thumbnail (Standard: First), klickt Confirm.
4. `insertFrameBehind()`:
   a. Geometrie des Video-Blocks merken (x, y, w, h, zIndex, testId).
   b. JPEG (Qualität 0.9, volle Videoauflösung) als `File` `previs-<testId>.jpg` droppen.
   c. Auf neuen `.position.image.selected` warten (Timeout 20 s – Upload).
   d. Size-Panel öffnen (falls zu), W/H/X/Y setzen (gerundet auf 2 Nachkommastellen),
      nach jedem Feld 150 ms warten; danach Blockstyle prüfen (Toleranz 1 px), sonst
      ein zweiter Versuch.
   e. `⌘[` senden, bis `zIndex(Bild) < zIndex(Video)`; max. 60 Schritte; keine
      Änderung nach 2 Schritten → Fehler.
   f. Video-Block anklicken (Auswahl zurück auf das Video).
5. Popup zeigt Schrittstatus und schließt 1,5 s nach Erfolg. Bei Fehler bleibt es
   offen mit Meldung und Hinweis "Bild ggf. manuell prüfen/löschen (⌘Z)".

## Fehlerfälle

- Kein Video ausgewählt → kein Button.
- Frame-Grab wirft (z. B. tainted canvas) → Meldung "Frame konnte nicht gelesen werden".
- Kein neues Bild nach Drop → "Pitch hat das Bild nicht angelegt".
- Panel/Felder nicht gefunden → "Pitch-Oberfläche hat sich geändert (Size-Panel)".
- Ebene ändert sich nicht → "Ebenen-Shortcut wirkt nicht".

## Nicht enthalten (YAGNI)

Freie Frame-Wahl per Scrubber, Batch über mehrere Folien/Videos, eigener Undo,
Einstellungen.

## Tests

- `node --test`: `parseGeometry(style)`, `needsBackward(zImg, zVideo)`, `frameTimes(duration)`.
- Manuell im Chrome-Tab (Deck "Wow clients at every step", Folie 7): kompletter Ablauf,
  danach Ebenenliste im Pitch-Panel prüfen (Bild direkt unter Video), Bild wieder löschen.
