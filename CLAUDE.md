# Kaaktaal Stage Book — Project Memory

Read this fully before making any change. This file exists so nothing built so far gets lost,
reinvented, or accidentally broken by a future session that doesn't have this context.

## What this is

A single-file web app for live performance: chord/lyric charts with transpose, auto-scroll,
chord-shape diagrams, a metronome, setlists, and a version-aware song-sharing system. Built for
one band (Kaaktaal) to use on stage from their phones. The person you're working with (Aia) is
the band's designer/architect/songwriter — technical, detail-oriented, cares about both craft and
function. Performance and reliability during a live gig are the top priority, always. When in
doubt, favor the option that is less likely to break on stage over the one that looks nicer.

## Non-negotiable architecture constraints

- **Single HTML file, vanilla JS. No framework, no build step, no bundler, no npm dependencies
  in the shipped app.** This is deliberate: it must open and work with zero setup, forever, even
  if tooling around it goes stale. Do not introduce React/Vue/webpack/etc. into the core app.
- **No external network calls at runtime.** No CDN fonts, no analytics, no remote API calls. The
  app must work fully offline once loaded — that's the whole point of it existing.
- **localStorage is the only persistence layer**, under these keys:
  - `stagebook_songs_v1` — array of song objects (see schema below)
  - `stagebook_setlists_v1` — array of setlist objects
  - `stagebook_editor_name` — last-used editor name string
  - `stagebook_metro_sound` — '1' or '0', metronome click on/off
  - `stagebook_metro_flash` — '1' or '0', full-screen edge-flash metronome on/off
- The person explicitly does **not** want band-wide real-time sync or a backend. Song sharing
  between band members is deliberately file-based (export/import a `.json`), not networked. Don't
  propose adding a server for this without being asked.

## The song schema

```json
{
  "id": "s-golokdhadha",
  "title": "গোলোকধাঁধা",
  "artist": "Kaaktaal",
  "key": "Em",
  "capo": "",
  "bpm": "",
  "timeSig": "4/4",
  "duration": "",
  "aliases": "golokdhadha, confusion song",
  "version": 1,
  "updatedAt": "2026-07-15T00:00:00.000Z",
  "updatedBy": "Aia",
  "body": "...(see notation format)..."
}
```

- **duration** (new) — optional rough song length, `"mm:ss"` (e.g. `"3:45"`) or a plain number of
  minutes. Summed across a setlist to show "~38 min" at the top of setlist detail. Blank/unparseable
  values are silently skipped in the sum. This field IS part of the shared schema (round-trips
  through export/import), unlike `prevBody` below.
- A song object may also carry a **`prevBody`** field at runtime — a silent one-step-undo backup of
  the body text from before the last save (see "Features already built" below). It is **not** part
  of the documented/shared schema: `shareOrDownload()` strips it before writing any exported/shared
  JSON, so it never appears in files handed to bandmates or produced by the song-conversion project.
  Don't add it when hand-authoring song JSON.

`body` uses a three-bracket notation, parsed by `tokenizeLine()`/`renderBody()`:

| Syntax | Meaning | Color |
|---|---|---|
| `[G]` | chord, immediately before the syllable it's played on | red `--red` (#E30613, the band's actual brand red — don't change this) |
| `<<note>>` | instruction/note, inline mid-lyric or alone on its own line | blue `--blue` |
| `{Section}` | section label, own line | muted amber-bordered caps |
| blank line | spacing | — |
| anything else | plain lyric | `--ink` |

Do not change this notation format — it's documented externally too (see
`kaaktaal-song-format-guide.md`, used in a separate Claude Project for converting songs from
photos/docs, which depends on this exact syntax staying stable).

## Features already built and tested — do not silently rewrite these

- **Chord transposition** (`transposeChord`, `parseChord`) — handles sharps/flats/slash
  chords/7ths correctly. Compound annotated chords like `D(C/D)` or `Em (shell chord)` intentionally
  don't transpose (the parser can't understand free-text inside brackets) — this is accepted,
  known, documented behavior, not a bug to silently "fix" by changing parsing rules.
- **Chord diagrams** (`getChordShape`, `chordDiagramSVG`) — open-position shapes for common
  chords, computed barre shapes (E-shape/A-shape) for everything else, clearly labeled
  "approximate" when it's not an exact voicing.
- **Auto-scroll** — slider is 0.5–5 **lines per second**, measured against actual rendered line
  height (`measureLineHeight`), not raw pixels, and not BPM-linked (that was a deliberate choice,
  confirmed with the person — don't silently link it to BPM).
- **Metronome** — small toggle-able dot row, beat count driven by `timeSig`, stays static if no
  BPM is set, sound is off by default (live mic'd performance — an audible click would bleed into
  the recording/PA), generated via Web Audio, no audio file asset.
- **Search** (`matchesSearch`) — multi-word AND matching across title/artist/aliases, so an
  English phonetic spelling in `aliases` makes a Bangla-titled song findable.
- **Setlists** — ordered list of song IDs per gig, reorder via up/down (not drag — deliberate,
  drag-and-drop reorder is unreliable on touch without a real library and wasn't worth the
  dependency), swipe left/right in performance view to move through the active setlist, no
  extra on-screen chrome for this by design (see UI priority note above).
- **Version-aware sharing** (`performImport`, `shareOrDownload`) — export one song, several
  selected songs, or a full backup, all as the same JSON array shape. Import does an **upsert by
  id**: higher version replaces, equal is left alone, lower is skipped with a warning (protects
  against an old shared file clobbering a newer local edit). Every save bumps `version` and
  stamps `updatedAt`/`updatedBy`. The song ID is shown (tap-to-copy) in the editor specifically so
  it can be referenced from other conversations/devices.
- **Kaaktaal branding** — wordmark (recolored to `--ink` for the dark header) and a favicon from the
  red badge logo, now linked files (`kaaktaal-wordmark.png`, `kaaktaal-favicon.png`) referenced via
  normal `<img src>` / `<link href>` rather than embedded base64 (see "Asset extraction" below).
  Original source files are `kaaktaal-wordmark-source.png` and `kaaktaal-badge-source.png`, provided
  separately — full-resolution, untouched.
- **PWA**: `manifest.json` + `sw.js` (cache-first service worker, app-shell precache) + an amber
  "New version ready — Refresh" banner (`#updateBar`) that only reloads once the new worker actually
  takes control (`controllerchange`), driven by a `postMessage('SKIP_WAITING')` handshake — never a
  silent auto-reload. **Bump `CACHE_NAME` in `sw.js` on every deploy** or returning users never see
  the update prompt.
- **App icons**: `kaaktaal-badge-192.png` / `-512.png` (transparent, ~18% padding so Android's
  adaptive-icon mask doesn't clip the mark) and `kaaktaal-apple-touch-icon.png` (180×180, flattened
  onto `--bg` since iOS doesn't want alpha), all generated from `kaaktaal-badge-source.png`.
- **Asset extraction** — the wordmark and favicon that used to be base64-embedded in the HTML are
  now their own PNG files (`kaaktaal-wordmark.png`, `kaaktaal-favicon.png`), referenced normally.
  Keeps the HTML file readable; no behavior change.
- **Tap tempo** (`renderPerform`'s metronome section) — tap the "TAP" button 4+ times to a beat to
  compute a live BPM. This overrides the metronome for the current session only (`liveBpm`) and
  **never writes to `s.bpm`** — a tapped tempo can't silently drift a song's saved/shared BPM.
- **One-step undo per song** (editor) — saving stashes the pre-save body into `s.prevBody` (see
  schema note above). "Undo last edit" swaps `body`/`prevBody`, bumps version, and saves through the
  exact same path as any other save — it doesn't special-case the version-sharing logic at all.
- **Set-length estimate** — optional `duration` field per song (`"mm:ss"` or plain minutes), summed
  and shown as "~NN min" at the top of setlist detail (`parseDurationToSeconds`). Skips untimed songs.
- **Panic view** (`showPanicView`/`stripToLyricsOnly`) — one tap ("Aa" in the stage header) strips
  chords, notes, and section tags to just the sung words at maximum size; tap anywhere to return.
- **Sticky current-section indicator** (`updateSectionBar`) — a small "you are here" label appears
  only once the actual `{Section}` header has scrolled out of view, so it adds no chrome most of the
  time. Recomputed on scroll and after transpose re-renders the lyrics DOM.
- **Setlist progress strip** (`.progressStrip`) — thin amber fill bar under the stage header, sized
  to `(index+1)/total`, next to the existing "3 of 8" text badge.
- **Full-screen edge-flash metronome** (`triggerEdgeFlash`, `#edgeFlash`) — optional alternative to
  the dot row for a loud/bright stage: flashes the screen edges on each beat (red on beat 1, amber
  otherwise). Toggle state persists via `stagebook_metro_flash`.

## What's NOT built yet — this is the actual work

1. **30-song starter package**: replace the single demo `seedSongs()` entry with a real 30-song
   library, each with `version`/`updatedAt`/`updatedBy` already set, so anyone who opens a fresh
   copy of the app gets the band's actual repertoire pre-loaded.
2. **Hosting**: a GitHub repo, deployed to GitHub Pages, so there's a stable URL for "Add to Home
   Screen" to produce a real installable icon (this also fixes reliable auto-update, which a
   locally-saved HTML file can't do on its own). PWA conversion, icons, and asset extraction are
   done — this is the last step, and it's the person's call when to actually create/push the repo.

## Style

Dark, near-black stage palette (`--bg: #0B0B0C`), warm off-white lyric text, red for chords, blue
for notes, amber (`#E8A33D`) for interactive UI/brand chrome, system font stack only (no web
fonts — reliability over polish). Keep this. Any new UI should read as an extension of it, not a
departure.

## Files in this handoff

- `kaaktaal-stage-book.html` — the current app, single source of truth. Gets renamed to `index.html`
  when hosted on GitHub Pages (Pages serves that filename at the domain root) — if you see both
  names mentioned across sessions, that rename is why.
- `manifest.json` — PWA manifest, references the icon files below
- `sw.js` — service worker (app-shell cache-first + update-prompt handshake). **Bump `CACHE_NAME`
  on every deploy.**
- `kaaktaal-badge-192.png` / `kaaktaal-badge-512.png` / `kaaktaal-apple-touch-icon.png` — generated
  PWA/home-screen icons (see "Features already built" above for padding rationale)
- `kaaktaal-favicon.png` / `kaaktaal-wordmark.png` — linked assets extracted from what used to be
  base64 embeds in the HTML
- `kaaktaal-wordmark-source.png` / `kaaktaal-badge-source.png` — original logo files, full-res,
  untouched — source material for the generated icons above, not used directly by the app
- `kaaktaal-song-format-guide.md` — the song-notation spec, shared with a separate song-conversion
  project; reference only, don't duplicate/fork this content into the app repo
