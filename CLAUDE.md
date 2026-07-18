# Kaaktaal Playbook — Project Memory

(Renamed from "Kaaktaal Stage Book" to "Kaaktaal Playbook" — display name only:
`<title>`, `manifest.json` name/short_name, the share-sheet title. The repo name,
live URL, `stagebook_*` storage keys, and `stagebook-*.json` export filenames were
deliberately left alone — renaming those would break the already-installed home-screen
icon and existing storage/exports for no visible benefit. If old notes below say
"Stage Book," that's why.)

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
- **No external network calls at runtime**, with exactly one sanctioned exception: a same-origin
  network-first fetch of `notice.json` (the band-notice banner — see Features). No CDN fonts, no
  analytics, no third-party APIs, ever. The app must work fully offline once loaded; the notice
  fetch fails silently offline and falls back to the last cached notice.
- **localStorage is the primary persistence layer**, under these keys:
  - `stagebook_songs_v1` — array of song objects (see schema below)
  - `stagebook_setlists_v1` — array of setlist objects (setlists may carry a local `color` field)
  - `stagebook_editor_name` — last-used editor name string
  - `stagebook_metro_sound` — '1' or '0', metronome click on/off
  - `stagebook_metro_flash` — '1' or '0', full-screen edge-flash metronome on/off
  - `stagebook_prefs_v1` — **personal, per-phone prefs, never shared and never version-bumping**:
    per-song default scroll speed (`secPerLine`) and key offset (`semitone`), per-song color tags,
    linked reference-track names (`audioName`) plus their A-B practice loop points in seconds
    (`loopStart`/`loopEnd` — NOT whether looping is active; that always resets to off, see
    Features), custom library order (`songOrder`), and the cached notice banner (`noticeCache`).
    Everything in here is deliberately outside the song schema so it can't churn versions or leak
    into share files.
  - Plus one IndexedDB database, `stagebook-audio` (store `tracks`, keyed by song id) — reference
    audio blobs are far too large for localStorage. This is the only IndexedDB use; don't add more
    without cause.
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
  **Only the pause button (or leaving the view) stops the scroll.** Slider changes apply live —
  the loop reads `perf.secPerLine` every frame. Touching the lyrics does NOT stop scrolling
  (an earlier tap-to-pause was removed after live testing: thumb drags near the slider kept
  killing the scroll mid-song); instead `perf.holdScroll` makes the loop follow the user's finger
  and resume from wherever they let go, and a >24px jump (momentum fling) is adopted rather than
  fought.
  **Implementation note:** `scrollTop` only ever reports whole pixels, so the per-frame progress
  is tracked in a separate float (`scrollAccum` in `startAutoscroll`) rather than accumulated by
  reading `container.scrollTop` back each frame — at slow speeds the per-frame delta is well under
  1px, and `scrollTop += fraction` silently never moves because every read rounds back to the same
  integer. This broke auto-scroll entirely once the slow end got genuinely slow; don't revert to
  the read-back pattern.
- **Per-song personal defaults (speed + key)** — `renderPerform` loads `prefs.songs[id]`'s
  `secPerLine`/`semitone` on open; the ★ button in the scroll row saves the CURRENT speed and key
  as that song's default, ↺ reverts to it. On-the-fly changes never write anywhere on their own.
  Stored in `stagebook_prefs_v1`, per phone — deliberately not in the song object.
- **Metronome** — small toggle-able dot row, beat count driven by `timeSig`, stays static if no
  BPM is set, sound is off by default (live mic'd performance — an audible click would bleed into
  the recording/PA), generated via Web Audio, no audio file asset.
- **Search** (`matchesSearch`) — multi-word AND matching across title/artist/aliases, so an
  English phonetic spelling in `aliases` makes a Bangla-titled song findable.
  **Implementation note:** typing must only rebuild the song list (`updateList` inside
  `renderLibrary`), never re-render the whole view — a full re-render destroys the focused input,
  which closes the phone keyboard after every letter. This shipped broken once; don't regress it.
- **Library order & color tags (personal)** — custom song order via select-mode → "Reorder"
  (up/down buttons, saved to `prefs.songOrder`; songs not in the list sort alphabetically after).
  Per-song color tags (5 colors + none) set in the editor, shown as a left border on library rows;
  setlists have the same picker (stored on the setlist object, which is local anyway). All
  per-phone, never shared — deliberate, so tag/order churn can't bump versions.
- **Hardware back button** — every `go()` to a non-library view pushes a History API state; a
  `popstate` listener re-renders from the popped state, so the phone's system back gesture works.
  In-app back buttons are amber (`.iconbtn.back`) for stage visibility.
- **Library scroll thumb** — a thin amber position indicator (`.scrollThumb`) fades in on the right
  while the library scrolls. Long-press-to-edit on song rows was REMOVED (it kept triggering during
  scroll attempts); editing is only via the pencil inside the song view now — don't re-add it.
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
- **Section color coding** (`sectionColor`) — each `{Section}` label's left border is colored by
  type: verse green `#6FBF8B`, bridge blue `#58B4E0`, pre-chorus orange `#F08A4B` (matched BEFORE
  chorus — order matters), chorus red `#E35D6A`, anything else yellow `#F0DE8A`. This REPLACED the
  sticky "you are here" section bar, which was removed after live testing (its show/hide made the
  lyrics visibly jitter). Don't re-add the sticky bar.
- **Panic view was REMOVED at the person's request** (it existed briefly: a lyrics-only max-size
  overlay). They decided it was unnecessary — don't rebuild it unless asked.
- **Bare chords** (instrumental runs like `[C]  [G]  [Am]`) — a chord segment with no lyric text
  gets `.seg.bare`: an invisible copy of the chord name sits in the lyric slot so each chord
  reserves its own width, plus `margin-right`, instead of stacking on the next chord.
- **Full-screen lyric view** — `#btnFS` (fixed, bottom-right, above safe-area) toggles `.fs` on
  `.stage`, hiding the header/controls/slider rows; lyrics + metronome row (if open) remain. Also
  requests real browser fullscreen where available; `fullscreenchange` keeps the class in sync when
  the user exits via system UI.
- **Reference track per song** (`♬` in the stage header, personal per phone) — tap with no track
  linked opens a file picker; the chosen audio file is COPIED into IndexedDB (`stagebook-audio`),
  so playback is instant/offline and survives the original file moving. Tap = play/stop; long-press,
  right-click, or the always-visible `⋮` in the playback row all open the same change/remove
  dialog — removal must be easy to find, not just a long-press secret. No hard limit on file count,
  size, or format: just checks `file.type.startsWith('audio/')` and shows a non-blocking toast above
  ~20MB. There is no server here (static GitHub Pages) so there was never a storage-cost reason for
  caps — don't reintroduce a 5-song/10MB/mp3-only rule without being asked; it was deliberately
  removed. While playing: metronome is stopped and disabled. Linking/changing a track touches only
  `prefs.songs[id].audioName` (+ loop fields below) — never the song object, never the version.
- **A-B practice loop** (`refRow`, shown while a reference track is playing) — a seek scrubber
  (`refSeek`, drag-to-preview via `input`, actually seeks on `change`) plus "A"/"B" buttons that
  capture the current playback position as loop start/end. Once both are set (`end > start`), the
  LOOP toggle enables; toggling it on/off is the only thing that flips `refLoop.active` — always
  resets to **off** (full-song) each time the track is (re)started, even though the A/B points
  themselves persist per song in prefs indefinitely. The audio jump-back is a plain `timeupdate`
  check (`currentTime >= loopEnd` → `currentTime = loopStart`); scroll is kept in sync by
  `startAudioScroll`'s `getBounds()` callback switching from `[0, duration]` to `[loopStart,
  loopEnd]` while active, so **the lyrics snap back through the same scroll range every repeat** —
  this was an explicit choice (the person considered pausing scroll during a loop and rejected it).
  Removing the track also clears its loop points.
- **Notice banner** (`notice.json` + `refreshNotice`) — a pastel-red banner above the library
  search box showing e.g. "Next: Friday 7pm rehearsal" with an optional Open-calendar button. The
  single source of truth is **`notice.json` in the repo root**: edit `text`/`link` on github.com
  (or ask a Claude session to push it) and every phone picks it up automatically when online —
  band members do nothing. Empty `text` hides the banner. Served network-first by `sw.js`
  (cache-first would freeze it); the app caches the last-seen notice in prefs for offline. This is
  the app's ONE sanctioned runtime network call, same-origin only.
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

**Softened Neo-Brutalist Dark Mode.** The original Neo-Brutalist pass (pure black, 0-radius sharp
rectangles, thick 3px borders, hard offset drop-shadows) was directly revised afterward to a warmer,
rounder version — same bones (heavy borders, uppercase nav, solid-fill press states, SVG icon set),
softer execution (rounded corners, no shadows, muted-black canvas, an earth-toned palette instead of
neon). `kaaktaal-design-direction.md` describes an even older four-color system and is kept only for
its non-palette guidance. For anything about color, shape, or button behavior, this section and the
code are the only source of truth — if it disagrees with either older doc, this section wins.

**5-color palette**, on a muted-black canvas:
- `--bg` (`#1D1D1B`, Muted Black — NOT pure black) — canvas only.
- `--white` (`#EAE4DA`, Seashell) / `--silver` (`#9ED6DF`, Sky) — lyric text, resting-state button
  borders/text, section-tag color-coding (`sectionColor()`: seashell for chorus, sky for everything
  else). Note `--silver` is also every untagged card/row's default border color, so untagged rows
  read with a visible sky-blue outline now, not a neutral grey — that's an intentional side effect
  of the color swap, not a bug.
- `--yellow` (`#EAC119`, Mustard Yellow) — chords, primary buttons, the play icon, key/font pill
  accents, star/save icons, slider thumbs.
- `--cyan` (`#329C64`, Emerald Green) — "this is currently selected/live" states: multi-select rows,
  setpos badge, progress strip, active loop toggle, `<<note>>` annotations. Distinct from yellow's
  "this is a button you can press."
- `--magenta` (`#C63F3E`, Red Passion) — danger/destructive actions, the muted-string chord-diagram
  marker, and the `notice.json` reminder banner background.
- `--radius: 15px` everywhere (`border-radius:var(--radius)`) — cards, buttons, inputs, chord
  diagrams, slider tracks. Small fixed-size elements (checkboxes, color dots, metronome dots) end up
  fully circular at this radius since it exceeds half their box size — expected, not a bug.
- `--border-w: 2px` on every interactive element (bumped down from an earlier 3px); the app's
  hairline dividers (`stagehead`/`ctrlbar`/`subrow`/`toast`/etc, previously 1px `var(--line)`) were
  bumped up to 2px to match — "make all the borders 2px" was applied literally, everywhere.
  **No box-shadows anywhere** — the earlier hard offset drop-shadows (`6px 6px 0 <color>` on the FAB,
  selected rows, tagged cards) were removed outright. The one exception is `.edgeFlash`'s
  `box-shadow`, which is the full-screen metronome flash *effect* (an actual feature, animated via
  JS in `triggerEdgeFlash()`), not a decorative card shadow — leave that alone.

**Button/card fill pattern** (unchanged from the brutalist pass — still the one place opacity is
intentional):
- Resting buttons: transparent or a 10%-alpha tint of their accent color (`--yellow-10`/`--cyan-10`/
  `--magenta-10`, via `hexToRgba()`), colored border, colored text.
- Pressed/active buttons: full solid accent fill, black text.
- Library/setlist cards with a color tag: 25%-alpha tint of the tag color as background, tag-colored
  border (`songRowHTML()` / setlist row rendering in `renderSetlists()`, both via
  `hexToRgba(color, 0.25)`). Untagged cards stay the plain `--surface` fill (sky-tinted, see above).
  Selection state (cyan) always wins over a card's own tag color while multi-selecting.
- `TAG_COLORS` — the color-tag picker options for both songs and setlists — is now a distinct
  7-color coding palette (plus blank/none), separate from the 5 UI accent colors:
  `['', '#EAC119' /*Mustard*/, '#808BC5' /*Lavender*/, '#EAA7C7' /*Pink Quartz*/,
  '#9ED6DF' /*Sky*/, '#245E55' /*Tea*/, '#ED773C' /*Tangerine*/, '#C63F3E' /*Red Passion*/]`.

**Icons** (`ICON_STROKE`/`ICON_FILL`/`icon(name, size)` helper, defined near the top of the script) —
a hand-drawn SVG set replacing every unicode/emoji glyph the toolbars used to use: bold 2.5px
strokes, `stroke="currentColor"` so a button's own resting/active/pressed color drives the icon with
zero extra JS. Filled icons (play, pause, flash, kebab, star) use `fill="currentColor"` instead. When
wiring a click handler that toggles an icon button's own class or innerHTML, always use
`e.currentTarget`, never `e.target` — a click can land on the inner `<svg>`/`<path>`. A few
single-glyph controls (key transpose `-`/`+`, font size `A-`/`A+`, the multi-select checkbox tick)
were deliberately left as plain characters.

**Typography**: still the system serif/sans/monospace stacks only (no web fonts). `--font-display`
is now a bold-slab-serif-first stack (`'Roboto Slab', Rockwell, 'Bookman Old Style',
'American Typewriter', Georgia, serif`) — actual rendered font depends on what's installed (Rockwell
on Windows, American Typewriter on iOS/macOS, falls back to bold Georgia elsewhere). Applied to
headers (`.topbar h1`, `.stagehead .t1`, `.resultCard h2`) AND now to button text (`.btn`,
`.smallbtn`, `.tapbtn` — covers Cancel/Save/Delete song/Reorder/TAP/etc). Nav microcopy (`.count`,
`.colorHint`) is uppercase with tracked letter-spacing. Data/metadata (`.ver` version badges,
timestamps, speed/time readouts) uses the monospace `--font-chord` stack.

**Sliders** (`input[type=range]`, one shared rule block covers every range input in the app): thin
1px `--silver`-bordered pill track (4px tall) and a small rounded mustard thumb (16px circle, 2px
`--bg`-colored border for contrast) via `::-webkit-slider-thumb`/`::-moz-range-thumb`. This replaced
an earlier thick-track/oversized-rectangular-thumb brutalist design — don't reintroduce that geometry
without being asked.

**Grain/grit texture** (`.grain`, a single fixed full-viewport `div` in the static body markup, after
`.edgeFlash`): a tiny inline SVG `feTurbulence` noise tile as a `background-image` data URI (no
image asset, no network call), `mix-blend-mode:overlay` at `opacity:0.05`, `z-index:95` (above
everything, `pointer-events:none`). Because it's a blend, not a paint, one element textures the
canvas AND every card/button fill beneath it simultaneously — don't duplicate the noise per-surface.
Keep the opacity low; this is meant to read as "depth and character," not visible static, and must
never compromise the at-a-glance legibility a performer needs mid-song.

**The crow mark** (`kaaktaal-crow-mark.png`, extracted from `logo black.png` — see git history for
the alpha-cutout extraction approach if regenerating). Used as a watermark (`.crowWatermark`,
`position:fixed`, `opacity:0.2`, cropped off the right edge) in every screen with open empty space:
the performance view (sibling of `.lyricsArea` inside `.stage`, z-index kept below `.lyricsWrap`'s
explicit `z-index:2` so lyric text always stacks above it), the library view, and the setlists view.
20% is louder than the original brutalist pass's 5% — a deliberate, explicit revision, don't quietly
dial it back down. A separate, more visible (~32% opacity) small mark still appears in true
empty-state screens (`emptyStateHTML()` — no songs yet, no setlists yet, no search matches, etc.) —
that's a distinct, earlier "personality on a low-stakes screen" feature, not the watermark, and keeps
its own opacity. The one animated moment is a brief settle/pulse (`.crowWatermark.pulse`, respects
`prefers-reduced-motion`) during the real wait on a reference track's `loadedmetadata`.

**Brandmark logo** (`.brandmark`, top-left of the library view) is `height:38px` (bumped up from an
earlier 28px — explicit "make the logo a little bigger" request). **Search-to-library spacing**:
`.search`'s bottom margin is `24px` (bumped from 8px) for visible breathing room before the song
count line / list — an explicit, deliberate gap, don't shrink it back down to tighten the layout.

**Motion**: screen transitions use the native View Transitions API (`render()`/`renderNow()` in the
boot section) — a ~150ms fade+rise on entering content, feature-detected with an instant-swap
fallback, and fully disabled via `prefers-reduced-motion` in CSS alone (no JS branching needed). The
actual DOM update happens synchronously inside the transition callback either way, so this never
delays the app becoming interactive — only the decorative cross-fade layers on top. The FAB has a
quick squash-on-press + spring-back-with-overshoot release (`cubic-bezier(0.34, 1.56, 0.64, 1)`)
instead of a flat opacity dim.

Any new UI should read as an extension of all this, not a departure.

## Files in this handoff

- `index.html` — the current app, single source of truth. Was named `kaaktaal-stage-book.html`
  before hosting setup; renamed so GitHub Pages serves it at the domain root — if older notes
  mention the old filename, that rename is why.
- `manifest.json` — PWA manifest, references the icon files below
- `notice.json` — the band-notice banner content (`{"text": "...", "link": "..."}`); edit this on
  GitHub to change the banner on every phone. Empty text = banner hidden.
- `kaaktaal-design-direction.md` — the ORIGINAL four-color visual brief. Its palette section is
  fully superseded by the Neo-Brutalist system described in "Style" above; its non-palette guidance
  (motion discipline, crow-as-restrained-watermark concept) is still conceptually relevant. Not
  gitignored — no privacy concern, unlike the real song content.
- `kaaktaal-crow-mark.png` — the crow/mark silhouette (white glyph, transparent background) used for
  the watermarks and empty-state illustrations. Re-extracted from `logo black.png` (see "Style"
  above) — regenerate from that file, not `kaaktaal-badge-source.png`, if it ever needs redoing.
- `logo black.png` — current source art for the crow mark: a black circle with the glyph as
  transparent alpha cutouts. Keep on disk; don't delete even though nothing loads it at runtime.
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
