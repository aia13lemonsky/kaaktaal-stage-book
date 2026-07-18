# Kaaktaal Stage Book — Visual Direction

A creative brief, not a corporate style guide. Read this alongside `CLAUDE.md` — that file still
governs architecture and behavior; this one governs how it should *feel*. Where the two would
conflict on anything functional (offline-first, no web fonts, no build step, lyrics-view
legibility), CLAUDE.md wins. This document is about giving the thing a pulse, not about
touching what already works.

## The thesis

Right now the app is well-built and a little anonymous — it could be any dark-mode utility. The
fix isn't "add more color," it's "make the color mean the band." Two moves get us there: a real
illustrated motif (the crow, pulled straight from your own logo instead of a stock icon), and a
sharper, more deliberate palette that still obeys the same discipline that's made the app reliable
so far — color marks *specific things*, the canvas stays out of the way, nothing slows down a
show.

## Palette

Keep the black. It's correct — it's why this thing is readable in a dark room and doesn't burn a
hole in someone's retina between songs. Everything else gets sharpened:

| Token | Hex | Role | Change from current |
|---|---|---|---|
| `--bg` | `#0B0B0C` | canvas | unchanged |
| `--surface` / `--surface-2` | `#17161A` / `#1F1E22` | cards, rows | unchanged |
| `--ink` | `#F2EFE9` | lyric text | unchanged |
| `--red` | `#E30613` | **chords** | unchanged — this is the actual brand red pulled from the badge logo, don't touch it |
| `--note` | `#5B6EFF` | **notes/instructions** | shifted from the old soft sky-blue to a genuinely electric indigo — same hue family (still reads as "blue" against red, still colorblind-sound), just alive instead of muted |
| `--amber` | `#E8A33D` | interactive UI (buttons, FAB) | unchanged |
| `--volt` | `#C6FF3D` | **new** — rare, loud, reserved for brand/energy moments | new addition |

`--volt` is the one genuinely new color in the system and it should stay rare on purpose — the
CRM reference image loses discipline by running five accent colors on one screen at once; we're
stealing its confidence, not its clutter. Volt shows up in maybe three or four specific places
(below), never as a general-purpose accent, never inside the chord/note system itself.

One specific fix while we're in here: the metronome's downbeat dot currently uses `--red`. Move it
to `--volt`. Red now means "chord" specifically enough that it shouldn't moonlight elsewhere.

## The crow

This is the actual identity move. The crow already exists on the wordmark — the job now is
letting it live in more places than the header, at a level of restraint that reads as confidence
rather than clip art.

- **Performance view watermark.** A single large crow silhouette, traced clean as an SVG from the
  existing logo art, sitting fixed in the corner of the lyrics view at something like 4–6%
  opacity. Present enough to feel like the room has a name on it, invisible enough that it never
  competes with a lyric line for attention. This is the one place the motif touches the screen
  you actually read off during a show, and it should be boring to notice, not exciting to notice.
- **Empty states.** Empty library, empty setlist, empty search results — a small line-art crow
  (perched, a little annoyed to have nothing to do) instead of plain gray text. Low-stakes screens,
  full personality budget.
- **Async waits that are actually waits.** The app is fast enough that there's barely any loading
  to decorate — be honest about that rather than inventing a spinner for its own sake. The one
  real moment is the beat before a reference track starts (waiting on `loadedmetadata`) — a brief
  wing-tension-to-flap motion on a small crow mark works there and is the kind of detail a
  musician actually notices.
- **Section tags, optional.** Consider a tiny crow-footprint or wing mark in place of the current
  plain-text section label border — only if it reads clearly at 12px and doesn't slow down
  scanning. If it's not instantly legible at a glance mid-song, it's not worth it; kill it rather
  than force it.

Keep every instance of the crow as SVG, not raster — it needs to stay crisp at wildly different
sizes (a 6% opacity full-screen watermark vs. a 12px section mark) without multiplying image
assets or file weight. If a clean trace isn't fast to produce, fall back to the existing PNG at
low opacity rather than blocking on it — better a slightly-soft watermark than a stalled build.

## The lyrics view specifically

Layout, type size, and spacing stay exactly as they are — that was the one hard line, and it's
the right one; the reading mechanics have been tuned across a lot of iteration and aren't part of
this brief. What changes is color and the one watermark above:

- Chord tags: `--red`, unchanged position/size, just confirm it's the updated hex.
- Notes: move to `--note` (the new indigo).
- Section tags: consider `--volt` for the left border instead of the current muted amber-dim —
  louder wayfinding is a genuine usability win here, not just decoration, since spotting "where's
  the bridge" fast matters mid-song.
- **New, functional, not just pretty:** a thin progress line down one edge of the screen during
  autoscroll, showing how far through the song you are (`scrollTop / (scrollHeight - clientHeight)`).
  Render it in `--volt`. This is the kind of "unorthodox but earns its place" addition worth
  prioritizing over purely decorative ones — it's genuinely useful information a performer doesn't
  currently have, and it costs almost nothing to build.

## Library, editor, setlists — more room to play

These are browsing/admin screens, not stage-critical, so they can carry more of the new palette's
energy without a legibility tax:

- FAB and buttons stay `--amber`, but give the FAB's tap feedback some character — a quick
  squash-and-settle on press instead of a flat opacity dim, more like a plucked string than a
  Material ripple.
- Selected/active states (multi-select mode, active setlist, current setlist position badge) move
  to `--volt` instead of amber, so "this is the thing that's currently live" has its own distinct
  visual language from "this is a button you can press."
- Song rows could take a thin `--volt` or `--note` left-edge accent on selection instead of the
  current border-color swap — small change, reads as more considered.
- Screen transitions: a fast fade + slight rise (~150ms, never more) instead of a hard cut.
  Respect `prefers-reduced-motion` and make sure it never adds perceptible lag to opening a song —
  if there's ever a tradeoff between "feels nice" and "feels instant," instant wins, always.

## Typography

No new fonts — that's a hard line from CLAUDE.md (no web fonts, no network dependency) and it's
correct regardless of this brief. The existing serif (Georgia-family) for song titles and the
system sans for everything else already does real work; lean into it rather than replacing it —
slightly bolder weights or tighter letter-spacing on screen headers and empty-state text would add
presence without violating the no-custom-fonts rule or touching the lyrics view's protected
typography.

## Guardrails — what this brief is not asking for

- Not a rainbow. Four accent colors total (`red`, `note`, `amber`, `volt`), each with a specific
  job, `volt` used sparingly on purpose.
- Not a lyrics-view redesign. Color changes; size, spacing, and layout do not.
- Not slower. Every motion/transition idea here has an explicit time ceiling and a
  reduced-motion escape hatch. If anything here is measurably slowing down opening a song or
  starting autoscroll, cut it — that instruction outranks every aesthetic note in this document.
- Not new dependencies. SVG and CSS only, same single-file/no-build-step/no-network constraints
  as the rest of the app.

## What to actually tell Claude Code

> Read CLAUDE.md and kaaktaal-design-direction.md fully before making changes. Apply the visual
> direction in the design doc: update the color tokens (red stays, note becomes electric indigo,
> add a new sparingly-used volt accent, metronome downbeat moves off red and onto volt), trace the
> existing crow logo into a clean SVG and use it as a low-opacity watermark in performance view
> plus in empty states, add the autoscroll progress line, and give the FAB and selected-states a
> bit more character per the doc. Leave the lyrics view's font sizes, spacing, and layout
> completely untouched — only its colors change. Keep every existing constraint from CLAUDE.md:
> single file, no build step, no web fonts, no network calls, and nothing here should add
> perceptible delay to opening a song or starting autoscroll.
