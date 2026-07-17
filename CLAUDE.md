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
| `[G]` | chord, immediately before the syllable it's played on | pastel chrome yellow `--chord` (#F0DE8A), sized a bit larger than lyric text for on-stage visibility |
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
- **Chord diagrams** (`getChordShapes`, `getChordNotes`, `chordPopupHTML`) — tapping a chord shows
  up to 3 shapes at once: open position (if this exact chord has one), E-shape barre, A-shape barre,
  and a D-shape barre (top-4-string movable form) filling in as a 3rd/alternate option — plus the
  chord's note names (root/3rd/5th/[7th]) above the diagrams. Barre variants are skipped when their
  reference root would land on fret 0 (degenerate with the open shape, not a distinct option) and
  results are deduped by fret pattern. E/A-shape barre forms approximate `maj7` as `maj` (no accurate
  6-string movable maj7 pattern is wired in); the D-shape form has a real maj7 pattern instead.
  Clearly labeled "approximate" whenever a shape isn't an exact voicing, same as before.
- **Auto-scroll** — slider is **seconds per line** (`perf.secPerLine`, 0.5–15s/line), measured
  against actual rendered line height (`measureLineHeight`), not raw pixels, and not BPM-linked
  (that was a deliberate choice, confirmed with the person — don't silently link it to BPM). This
  unit replaced an earlier "lines per second" framing: at the slow end (ballads/rubato), fractional
  lines/sec values were too coarse to fine-tune and still felt too fast even at the slider's floor;
  seconds-per-line gives real, extendable numbers at the slow end instead.
  **Implementation note:** `scrollTop` only ever reports whole pixels, so the per-frame progress
  is tracked in a separate float (`scrollAccum` in `startAutoscroll`) rather than accumulated by
  reading `container.scrollTop` back each frame — at slow speeds the per-frame delta is well under
  1px, and `scrollTop += fraction` silently never moves because every read rounds back to the same
  integer. This broke auto-scroll entirely once the slow end got genuinely slow; don't revert to
  the read-back pattern.
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

1. **Hosting**: done — live on GitHub Pages, deployed from `master` / root. Repo has a `.nojekyll`
   file at the root: without it, GitHub Pages runs everything through Jekyll by default (even a
   plain static site), which tried to render `CLAUDE.md` as a page and once failed outright on a
   transient GitHub API 503 during metadata lookup — Pages does **not** auto-retry a failed build,
   so it can sit silently 404ing indefinitely until the next push. If Pages ever looks stuck again,
   check the repo's Actions tab for a failed "pages build and deployment" run before assuming it's
   just slow.

## Real song content stays out of the repo — decided, don't revisit silently

`seedSongs()` still ships just the placeholder demo entry, on purpose. A real first set (25 songs,
`kaaktaal-songs.json` in this same folder) exists, but was deliberately **not** baked into
`seedSongs()`/committed, because the GitHub repo is public (required for free Pages hosting) and
hardcoding real original lyrics/chords into `index.html` would publish them in that public repo's
source. That cuts against this project's own design principle — song content is meant to move
between band members via file-based export/import, never committed to a networked/public place.

Instead: `kaaktaal-songs.json` and `kaaktaal-song-format-guide.md` are both listed in `.gitignore`.
The person shares the JSON file with the band directly (however they choose — it's their call, not
this repo's concern), and each band member imports it once via the app's own Import button after
installing. If asked to "add the real songs to the app," don't put them in `seedSongs()` or commit
them — point back to this note and the Import flow instead, unless the person explicitly says they
want the repo's visibility/privacy tradeoff reconsidered.

## Style

Dark, near-black stage palette (`--bg: #0B0B0C`), warm off-white lyric text, pastel chrome yellow
(`--chord: #F0DE8A`) for chords, blue for notes, amber (`#E8A33D`) for interactive UI/brand chrome,
system font stack only (no web fonts — reliability over polish). The band's brand red (`--red:
#E30613`) is still used for non-chord accents (metronome downbeat, danger states) — don't repurpose
it back onto chord text. Keep this. Any new UI should read as an extension of it, not a
departure.

## Files in this handoff

- `index.html` — the current app, single source of truth. Was named `kaaktaal-stage-book.html`
  before hosting setup; renamed so GitHub Pages serves it at the domain root — if older notes
  mention the old filename, that rename is why.
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
  project; reference only, don't duplicate/fork this content into the app repo. Gitignored.
- `kaaktaal-songs.json` — the band's real first 25-song set. Gitignored on purpose — see "Real song
  content stays out of the repo" above. Not a source file for the app itself; it's the payload the
  person shares with the band for each person to Import locally.
