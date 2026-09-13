# PianoLearn — working agreements

Expo SDK 57. Read the versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing Expo-specific code.

## Product
Piano practice app: import MusicXML, connect a MIDI keyboard, learn songs in Wait Mode.
Audience is NOT only beginners. Beginners are the first users, but the owner intends this for
players at every level, so don't justify decisions with "beginners won't need it" or soften
behavior for beginners by default. Prefer accurate, musician-grade behavior with options.
- Wait Mode chords are STRICT by default: all notes of a chord must be held at the same time.
  A lenient "accumulate" mode may exist as an option, never as the default.
- On-screen keyboard colors notes by hand (right vs left).
Full spec: `../PianoLearn_V1_Spec.md`. Target: iOS App Store first. Playback is silent for now (cursor only).
Test device: iPhone 16 Pro. Keyboard: Casio, Bluetooth MIDI preferred.

## Feel: simple and lively
The app should feel simple and alive at the same time. Screens stay plain and calm: no
decoration, one plum accent per screen, quiet type, nothing that moves on its own. Every
interaction answers with a small, physical response: the pressed dip on a button, the SF Symbol
bounce when a tab is selected, the curtain fade into practice. Motion explains a state change
(press, select, arrive, leave); it is never ornament.
- When adding or restyling any interaction, ask what its small honest response is, and add it with
  restraint: short, eased, tied to the change.
- Prefer the platform's own responses (SF Symbol effects, native pressed states) over invented ones.
- Keep the surface simple so the motion reads. Motion that draws attention to itself is wrong here;
  the native iOS 26 glass tab bar was rejected for exactly that.

## How we work
- The owner is an experienced web developer new to mobile. Explain mobile concepts in web terms, briefly.
- Do one chunk of work, then stop and summarize what changed and where. No long write-ups.
- Every change starts on its own branch, before the first file is touched. Never work on master. "Commit" means commit on the branch; merge or push only when the owner asks.
- Owner runs system-level installs (brew, Xcode, simulators) themselves. Give the command, don't run it.
- Research every dependency before adding it: maintenance, license, native code, production use. No speculative installs. Remove unused packages promptly.
- Keep `npx expo-doctor`, `npm run typecheck`, and `npm test` green.

## Workflow for a feature request
Every step below ends with a stop. Do not run two steps in one go.
1. **Brief.** The owner states the goal, the constraints, and what not to touch.
2. **Research.** Search the docs and vet the options: stability (stable over beta or preview),
   maintenance, licence, cost per use. Come back with two or three choices and one
   recommendation. Stop.
3. **Decide.** The owner picks. Nothing that was not picked gets built.
4. **Plan.** In plan mode: branch name, files, chunks, how each chunk is verified, what it costs.
   Stop for approval.
5. **Implement one chunk.** Typecheck, tests, and a real run on the simulator or device.
   Summarise what changed and where. Stop.
6. **Review.** `/code-review` on the diff before the owner reads it.
7. **Commit, merge, push only when the owner says so.**

Changing a library, a runtime pattern, or a dependency mid-implementation is a new decision:
name the options and wait, even when a template or a doc pushes the new thing.

### Superpowers, adjusted for this project
The Superpowers plugin drives the steps above (brainstorming, writing-plans, executing-plans,
code review, finishing a branch). Where its defaults differ from ours, ours win:
- **Plain branches, never git worktrees.** Metro and the simulator run from this folder; a
  second checkout breaks that.
- **Tests where they earn their keep, not test-first everywhere.** Pure logic (`src/engine/`,
  key normalisation in the backend) gets unit tests. I/O glue over fetch, the file system and
  SQLite gets a real run on the simulator or device instead. No tests written to satisfy a
  process.
- **Plans live in the repo** at `docs/superpowers/plans/`, the plugin default. The owner reads
  them later.

## Architecture
- `src/engine/` is pure TypeScript with no React or native imports. Parser, event builder, Wait Mode. Unit-tested with Jest.
- `src/sheet/` renders notation with OpenSheetMusicDisplay inside a WebView. `viewer.html` is the page; `SheetView.tsx` is the RN wrapper. The OSMD bundle is inlined into `viewerHtml.generated.ts` by `scripts/build-sheet-html.mjs` (runs on postinstall, file is gitignored).
- `src/theme/` holds the design tokens (`tokens.ts`: colors, spacing, radius, type scale, fonts, shadows),
  the `ThemeProvider`/`useTheme()` context, and `useAppFonts()` (Outfit via @expo-google-fonts/outfit,
  system font until loaded). Screens never hard-code a color, size, or radius; they read the theme.
- `src/ui/` holds the app's own primitives (Text, Button, Chip, Card, Toggle...). No third-party UI kit;
  we own the components (shadcn spirit). Design source of truth: the Paper file "xylophone".
- `src/app/` is Expo Router. One file per screen.
- `ios/` is generated by `expo prebuild` and gitignored. Native changes go in `app.json`, not in `ios/`.

## Commands
- `npm test` — engine tests
- `npm run typecheck`
- `npx expo start` — Metro dev server
- `npx expo run:ios --device "iPhone 17"` — native build to simulator (only needed after native deps change)

## Launch readiness (keep current)
Hardened, with tests:
- Parser conformance: all 181 files of the unofficial MusicXML test suite parse and pass score
  invariants (`src/engine/__tests__/corpus.test.ts`); hand-verified expectations for pitches,
  durations, tuplets, chords, voices, grace notes, piano staves, repeats/endings, pickups,
  additive time signatures, transposing instruments, score-timewise.
- Import: parse-validated, invariant-checked, user-facing error kinds, no half-saved songs.
Not yet hardened:
- Exporter quirks (Finale, Sibelius, Dorico, Flat, Noteflight, scanning apps): need real sample files.
- MIDI edge cases (device drops mid-session, multiple keyboards), storage-full, very long scores
  (renderer performance), backgrounding during practice.
