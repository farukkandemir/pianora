# Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A first run that gets a new user from install to their first correct note in four screens: Welcome, Pick a first piece, Practice with a one-time "Pair your piano" sheet, and a Connect tab that helps when the pairing list is empty.

**Architecture:** Two new Expo Router screens (`welcome`, `first-piece`) gated by `Stack.Protected` on a persisted `onboarded` setting, so the tab shell is unreachable until onboarding ends and the onboarding screens are unreachable after. The practice screen gains a self-contained animated sheet shown once when no MIDI piano is connected, gated by a second persisted setting. The Connect tab gains a checklist state that appears after a pairing attempt returns with no piano. No new dependencies; the hero washes are tiny generated PNGs, the same technique the Library card already uses for its scrim.

**Tech Stack:** Expo SDK 57, Expo Router (Stack.Protected), React Native Animated, expo-sqlite settings table, existing `@/ui` primitives and theme tokens.

**Spec:** The Paper file "xylophone", artboards *Welcome*, *Onboarding · first piece*, *Practice · first run · no piano sheet*, *Connect v2 · piano not in the list*. Research and rationale: https://claude.ai/code/artifact/4bd4af31-c9f0-40af-888e-57f4e2339fd0 (option B).

## Global Constraints

- Branch: `onboarding`. Never work on master. Commit only when the owner says so.
- Every screen reads colours, spacing, radii and type from `useTheme()`. No hard-coded colours except inside generated PNGs.
- Copy is exactly as on the Paper boards. No brand names of pianos anywhere.
- No new npm dependencies.
- Portrait for the two new screens (the root Stack already defaults to portrait). The sheet lives inside the landscape practice screen.
- `npm run typecheck`, `npm test`, `npx expo-doctor` stay green after every task.
- Metro may be serving the owner's phone. Say so before the first file save of every session; JS edits go live there instantly.
- The `onboarded` flag defaults to false, so the owner's existing install shows Welcome once after this ships. That is accepted; V1 has no other users.

---

### Task 1: Persisted onboarding flags

**Files:**
- Modify: `src/data/settings.ts:9-18` (the `Settings` interface) and `:33-40` (`DEFAULT_SETTINGS`)

**Interfaces:**
- Produces: `settings.onboarded: boolean` and `settings.pianoPromptSeen: boolean`, both default `false`, read and written through the existing `useSettings()` context (`settings`, `loaded`, `set(key, value)`). No schema migration: the settings table stores one JSON row per key and `loadSettings` only reads keys present in `DEFAULT_SETTINGS`.

- [ ] **Step 1: Add the two fields**

In `src/data/settings.ts`, extend the interface:

```ts
export interface Settings {
  showKeyboard: boolean;
  /** Reconnect remembered Bluetooth keyboards on launch and foreground. */
  autoReconnect: boolean;
  rightHand: HandColorKey;
  leftHand: HandColorKey;
  /** Listen plays the piece at this percentage of the score's tempo. */
  listenSpeed: ListenSpeed;
  /** Light or dark chrome; 'system' follows the phone. */
  theme: ThemeSetting;
  /** True once the user has finished or skipped the first-run screens. Gates the tab shell. */
  onboarded: boolean;
  /** True once the "Pair your piano" sheet has been shown on the practice screen. It shows once, ever. */
  pianoPromptSeen: boolean;
}
```

And the defaults:

```ts
export const DEFAULT_SETTINGS: Settings = {
  showKeyboard: true,
  autoReconnect: true,
  rightHand: 'cobalt',
  leftHand: 'amber',
  listenSpeed: 100,
  theme: 'system',
  onboarded: false,
  pianoPromptSeen: false,
};
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: clean. Nothing reads the new keys yet.

- [ ] **Step 3: Verify the flag round-trips on the simulator**

Run the app on the simulator (`npx expo start`, press `i`). In the Metro terminal nothing changes yet; that is fine. Open the simulator's SQLite file and confirm no `onboarded` row exists until something writes it:

```bash
DB=$(find ~/Library/Developer/CoreSimulator/Devices -path '*pianolearn*' -name pianolearn.db 2>/dev/null | head -1); sqlite3 "$DB" "SELECT key, value FROM settings;"
```

Expected: existing keys only. The flags are absent, which `loadSettings` treats as the defaults.

---

### Task 2: Hero wash PNGs

**Files:**
- Create: `scripts/make-wash-png.mjs`
- Create: `assets/images/wash-top-light.png`, `assets/images/wash-bottom-light.png`, `assets/images/wash-top-dark.png`, `assets/images/wash-bottom-dark.png`

**Interfaces:**
- Produces: four 1×64 PNGs. Top washes go from the page colour at 97 % alpha (row 0) to 0 % (row 63); bottom washes the reverse. Light uses `#FCFBFD` (theme `colors.bg` light), dark uses `#26292E` (theme `colors.bg` dark). Stretched over the hero image with `resizeMode="stretch"`, the same way `ContinueCard` stretches `scrim-ink.png`.

- [ ] **Step 1: Write the generator**

`scripts/make-wash-png.mjs`, Node only, no dependencies:

```js
// Writes 1x64 vertical alpha washes of the page colour, for the Welcome hero.
// Same trick as assets/images/scrim-ink.png: a tiny PNG stretched by <Image resizeMode="stretch">.
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

const HEIGHT = 64;

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function png([r, g, b], alphaAt) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(1, 0); ihdr.writeUInt32BE(HEIGHT, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0; // 8-bit RGBA
  const raw = Buffer.alloc(HEIGHT * 5);
  for (let y = 0; y < HEIGHT; y++) {
    raw[y * 5] = 0; // filter: none
    raw[y * 5 + 1] = r; raw[y * 5 + 2] = g; raw[y * 5 + 3] = b;
    raw[y * 5 + 4] = Math.round(255 * alphaAt(y / (HEIGHT - 1)));
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ]);
}

const hex = (s) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
const top = (t) => 0.97 * (1 - t);   // page colour at the top, clear at the bottom
const bottom = (t) => 0.97 * t;      // clear at the top, page colour at the bottom

for (const [name, color] of [['light', '#FCFBFD'], ['dark', '#26292E']]) {
  writeFileSync(`assets/images/wash-top-${name}.png`, png(hex(color), top));
  writeFileSync(`assets/images/wash-bottom-${name}.png`, png(hex(color), bottom));
}
console.log('wrote 4 wash PNGs');
```

- [ ] **Step 2: Run it**

Run: `node scripts/make-wash-png.mjs`
Expected: `wrote 4 wash PNGs`, four files under 200 bytes each in `assets/images/`.

- [ ] **Step 3: Sanity-check one**

Run: `file assets/images/wash-top-light.png`
Expected: `PNG image data, 1 x 64, 8-bit/color RGBA, non-interlaced`.

---

### Task 3: Welcome screen and the onboarding gate

**Files:**
- Create: `src/app/welcome.tsx`
- Modify: `src/app/_layout.tsx:55-85` (the `Navigator` function)

**Interfaces:**
- Consumes: `settings.onboarded` from Task 1; `assets/images/hero-piano.jpg` (already in the repo, the same illustration as the Paper Welcome board); the wash PNGs from Task 2.
- Produces: route `/welcome`, reachable only while `onboarded` is false; route `/first-piece` declared in the same protected group (built in Task 4). The tab shell and Add music are reachable only while `onboarded` is true. `song/[id]` stays reachable in both states so the first piece can open straight into practice.

- [ ] **Step 1: Gate the routes**

Replace the `<Stack>` in `Navigator` in `src/app/_layout.tsx` with:

```tsx
function Navigator({ dark }: { dark: boolean }) {
  const { colors } = useTheme();
  const { settings } = useSettings();
  const base = dark ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    dark,
    colors: { ...base.colors, background: colors.bg, card: colors.surface, text: colors.ink, border: colors.border, primary: colors.accent, notification: colors.wrong },
  };

  // The window colour that peeks during the landscape rotation and modal dismissal.
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.bg).catch(() => {});
  }, [colors.bg]);

  // First run: only the two onboarding screens exist until `onboarded` is set;
  // after that only the app does. Web analogy: a route guard that redirects
  // /app to /welcome for a new visitor and /welcome to /app for a returning one.
  // Practice stays outside both groups so the first piece can open into it.
  return (
    <NavigationThemeProvider value={navTheme}>
      <Stack screenOptions={{ orientation: 'portrait', contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Protected guard={settings.onboarded}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="add-music" options={{ headerShown: false, presentation: 'modal' }} />
        </Stack.Protected>
        <Stack.Protected guard={!settings.onboarded}>
          <Stack.Screen name="welcome" options={{ headerShown: false }} />
          <Stack.Screen name="first-piece" options={{ headerShown: false }} />
        </Stack.Protected>
        {/*
          Practice is the one landscape screen. It is presented as a
          full-screen modal, not pushed: iOS only honours a screen's own
          orientation for the root or a full-screen modal, so this is the
          native way to open a screen already rotated. Cross-fade instead of
          slide; the curtain (see ui/Curtain) hides the rotation itself.
        */}
        <Stack.Screen
          name="song/[id]"
          options={{ headerShown: false, presentation: 'fullScreenModal', animation: 'fade', orientation: 'landscape' }}
        />
      </Stack>
    </NavigationThemeProvider>
  );
}
```

`useSettings` is already imported in this file. The splash screen is held until settings are loaded (see `App` above `Navigator`), so the guard never flips while the user is looking.

- [ ] **Step 2: Build the Welcome screen**

`src/app/welcome.tsx`, laid out from the Paper *Welcome* board (390 × 844: wordmark, two-line headline, two-line subline, full-bleed hero with washes, plum Get Started, compatibility line):

```tsx
/**
 * Welcome, from the Paper "Welcome" artboard. Shown once, on the first launch.
 * The hero fills the screen; two washes in the page colour keep the type and
 * the button readable over it (same stretched-PNG trick as the Library card).
 */
import { useRouter } from 'expo-router';
import { Image, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { darkTheme, useTheme } from '@/theme';
import { Button, Icon, Text } from '@/ui';

const HERO = require('../../assets/images/hero-piano.jpg');
const WASH = {
  light: { top: require('../../assets/images/wash-top-light.png'), bottom: require('../../assets/images/wash-bottom-light.png') },
  dark: { top: require('../../assets/images/wash-top-dark.png'), bottom: require('../../assets/images/wash-bottom-dark.png') },
};

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, spacing } = useTheme();
  const { width, height } = useWindowDimensions();
  // The theme carries no scheme flag; the page colour is the tell (see Navigator in _layout.tsx).
  const wash = colors.bg === darkTheme.colors.bg ? WASH.dark : WASH.light;

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      {/* Hero, wider than the screen and centred, as on the board (634 wide on a 390 frame). */}
      <Image
        source={HERO}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
        style={{ position: 'absolute', top: 0, left: (width - width * 1.63) / 2, width: width * 1.63, height }}
      />
      <Image source={wash.top} resizeMode="stretch" style={{ position: 'absolute', top: 0, left: 0, width, height: height * 0.545 }} accessibilityIgnoresInvertColors />
      <Image source={wash.bottom} resizeMode="stretch" style={{ position: 'absolute', bottom: 0, left: 0, width, height: height * 0.336 }} accessibilityIgnoresInvertColors />

      <View style={[styles.content, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + spacing.xxxl, paddingHorizontal: 28, gap: 14 }]}>
        <View style={styles.wordmark}>
          <Text variant="heading">piano</Text>
          <Text variant="heading">.</Text>
          <Text variant="heading" tone="accent">learn</Text>
        </View>
        <View style={{ alignItems: 'center', paddingTop: 6 }}>
          <Text variant="display" center>Your piano.</Text>
          <Text variant="display" center>Your music.</Text>
        </View>
        <Text tone="muted" center>{'Bring any sheet music. Connect your piano.\nThe score waits for every note you play.'}</Text>
        <View style={styles.spacer} />
        <Button
          label="Get Started"
          variant="accent"
          block
          iconRight={<Icon name="arrow-right" size={18} tone="onAccent" />}
          onPress={() => router.push('/first-piece')}
        />
        <View style={[styles.compat, { gap: spacing.sm }]}>
          <Icon name="bluetooth" size={14} tone="muted" />
          <Text variant="caption" tone="muted">Works with Bluetooth and USB MIDI pianos</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1, alignItems: 'center' },
  wordmark: { flexDirection: 'row', alignItems: 'baseline' },
  spacer: { flex: 1 },
  compat: { flexDirection: 'row', alignItems: 'center', paddingTop: 2 },
});
```

`darkTheme` is exported from `@/theme` (the root layout already imports it from there). `Icon` accepts `tone="onAccent"` and `tone="muted"` (see the tone map in `src/ui/Icon.tsx:18`).

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 4: Verify on the simulator**

Fresh state is needed: delete the app from the simulator so the settings table is empty.

```bash
xcrun simctl uninstall booted com.farukkandemir.pianolearn
```

Then `npx expo run:ios --device "iPhone 17"`. Expected on launch: the Welcome screen, no tab bar, hero visible with the type readable over it, plum Get Started at the bottom. Tapping Get Started errors with "unmatched route" until Task 4 exists; that is expected here. Switch the simulator to dark appearance (Features › Toggle Appearance) and confirm the washes are the dark page colour, not white.

---

### Task 4: Pick a first piece

**Files:**
- Create: `src/app/first-piece.tsx`
- Modify: `src/ui/Button.tsx:7` (the `Variant` type) and `:26-27` (background and label tone per variant)

**Interfaces:**
- Consumes: `CATALOG`, `CatalogLevel`, `LEVEL_LABEL` from `@/catalog/catalog`; `useAddFromCatalog().add(entry): Promise<SongRecord | null>`; `useImportSong().importFromPicker(): Promise<SongRecord | null>`; `useCurtain().raise(): Promise<void>`; `useSettings().set('onboarded', true)`; `composerSurname` from `@/lib/format`.
- Produces: route `/first-piece`. Ends onboarding by writing `onboarded = true`, then opens practice for the chosen piece. Also a `tint` Button variant (plum tint background, plum label), the treatment the Browse Add pills already use, now available as a full-size button.

- [ ] **Step 1: Add the `tint` Button variant**

In `src/ui/Button.tsx`:

```ts
type Variant = 'accent' | 'ink' | 'muted' | 'tint';
```

and the two lines that pick background and label tone:

```ts
  const bg = variant === 'accent' ? colors.accent : variant === 'ink' ? colors.ink : variant === 'tint' ? colors.accentTint : colors.surfaceMuted;
  const tone = variant === 'muted' ? 'ink' : variant === 'accent' ? 'onAccent' : variant === 'tint' ? 'accent' : 'onInk';
```

- [ ] **Step 2: Build the screen**

From the Paper *Onboarding · first piece* board: title with Skip, one line of guidance, three level chips (Beginner selected), every catalogue piece for that level as a tappable row (art, title, composer · bars · level, chevron), and a pinned plum-tint button "I have my own sheet music" with the file types under it.

```tsx
/**
 * Pick a first piece, from the Paper "Onboarding · first piece" artboard.
 * Second and last onboarding screen. Tapping a row adds the catalogue piece
 * and opens it in practice; the pinned button imports a file instead. Both
 * end onboarding. Skip ends it with an empty library.
 */
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CATALOG, LEVEL_LABEL, type CatalogEntry, type CatalogLevel } from '@/catalog/catalog';
import { useAddFromCatalog } from '@/catalog/useAddFromCatalog';
import { SongArt } from '@/components/library/SongArt';
import { useImportSong } from '@/data/useImportSong';
import { useSettings } from '@/data/useSettings';
import { composerSurname } from '@/lib/format';
import { useTheme } from '@/theme';
import { Button, Chip, Icon, Text, useCurtain } from '@/ui';

const ART = 56;
const LEVELS: CatalogLevel[] = ['beginner', 'intermediate', 'advanced'];

export default function FirstPieceScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const curtain = useCurtain();
  const { colors, spacing, radius } = useTheme();
  const { set } = useSettings();
  const { add, busyId } = useAddFromCatalog();
  const { importFromPicker, busy: importing } = useImportSong();
  const [level, setLevel] = useState<CatalogLevel>('beginner');

  const entries = CATALOG.filter((e) => e.level === level);

  // Ending onboarding flips the route guard: the onboarding screens leave the
  // history and the tab shell becomes the base. Practice is pushed on top of
  // it, so Back from practice lands on the Library, same as any other open.
  const finish = useCallback(async (songId: string | null) => {
    set('onboarded', true);
    if (!songId) return;
    await curtain.raise();
    router.replace('/');
    router.push({ pathname: '/song/[id]', params: { id: songId } });
  }, [set, curtain, router]);

  const onPick = useCallback(async (entry: CatalogEntry) => {
    const song = await add(entry);
    if (song) await finish(song.id);
  }, [add, finish]);

  const onImport = useCallback(async () => {
    const song = await importFromPicker();
    if (song) await finish(song.id);
  }, [importFromPicker, finish]);

  const disabled = busyId !== null || importing;

  return (
    <View style={[styles.root, { backgroundColor: colors.bg, paddingTop: insets.top + 8 }]}>
      <View style={[styles.header, { paddingHorizontal: spacing.screen }]}>
        <Text variant="title">Pick a first piece</Text>
        <Pressable onPress={() => finish(null)} hitSlop={12} accessibilityRole="button" disabled={disabled}>
          <Text variant="bodyStrong" tone="muted">Skip</Text>
        </Pressable>
      </View>
      <View style={{ paddingHorizontal: spacing.screen, paddingTop: spacing.lg, gap: spacing.lg }}>
        <Text tone="muted">Something you already know by ear works best. You can add more from Browse any time.</Text>
        <View style={[styles.chips, { gap: spacing.sm }]}>
          {LEVELS.map((l) => (
            <Chip key={l} label={LEVEL_LABEL[l]} selected={level === l} onPress={() => setLevel(l)} />
          ))}
        </View>
      </View>

      <ScrollView style={styles.list} contentContainerStyle={{ paddingHorizontal: spacing.screen, paddingTop: spacing.lg, paddingBottom: spacing.lg, gap: spacing.xs }}>
        {entries.map((entry) => (
          <Pressable
            key={entry.id}
            onPress={() => onPick(entry)}
            disabled={disabled}
            accessibilityLabel={`${entry.title}, ${entry.composer}`}
            accessibilityHint="Adds the piece and opens it in practice"
            style={({ pressed }) => [styles.row, { gap: spacing.lg, paddingVertical: spacing.sm }, pressed && styles.pressed]}
          >
            <SongArt songId={entry.id} width={ART} height={ART} radius={radius.md} />
            <View style={styles.rowText}>
              <Text variant="bodyLarge" numberOfLines={1}>{entry.title}</Text>
              <Text variant="caption" tone="muted" numberOfLines={1}>
                {composerSurname(entry.composer)} · {entry.bars} bars · {LEVEL_LABEL[entry.level]}
              </Text>
            </View>
            {busyId === entry.id ? <ActivityIndicator color={colors.accentInk} /> : <Icon name="chevron-right" size={18} tone="faint" />}
          </Pressable>
        ))}
      </ScrollView>

      {/* Pinned over the list, on the page colour, so it never scrolls away. */}
      <View style={{ paddingHorizontal: spacing.screen, paddingTop: spacing.lg, paddingBottom: insets.bottom + spacing.xl, gap: spacing.sm, alignItems: 'center', backgroundColor: colors.bg }}>
        <Button
          label="I have my own sheet music"
          variant="tint"
          block
          iconLeft={<Icon name="file" size={18} tone="accent" />}
          onPress={onImport}
          disabled={disabled}
        />
        <Text variant="caption" tone="faint">.musicxml · .xml · .mxl</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  chips: { flexDirection: 'row' },
  list: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowText: { flex: 1, gap: 3 },
  pressed: { opacity: 0.85 },
});
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 4: Verify the whole first run on the simulator**

Uninstall, rebuild, launch. Expected in order:

1. Welcome. Get Started opens Pick a first piece with a slide.
2. Beginner selected, 7 rows. Tap Intermediate: 13 rows. Advanced: 4.
3. Tap Ode to Joy. Expected: curtain rises, practice opens in landscape on Ode to Joy at bar 1. Back from practice lands on the Library with Ode to Joy in it and the tab bar visible. Welcome and first-piece are gone from the back stack (swiping back does nothing).
4. Kill and relaunch: straight to Library. Confirm in SQLite:

```bash
DB=$(find ~/Library/Developer/CoreSimulator/Devices -path '*pianolearn*' -name pianolearn.db 2>/dev/null | head -1); sqlite3 "$DB" "SELECT key, value FROM settings WHERE key='onboarded';"
```

Expected: `onboarded|true`.

5. Uninstall, relaunch, Get Started, Skip. Expected: Library empty state with the tab bar. Relaunch: Library again.
6. Uninstall, relaunch, Get Started, "I have my own sheet music", cancel the picker. Expected: still on Pick a first piece. Pick a file from `../scores/` (drag one onto the simulator first). Expected: practice opens on it.

If step 3 lands on the Library without practice on top, the guard's history rewrite raced the push. Then change `finish` to push practice first and set the flag from inside practice's first render instead: pass `?onboarding=1` as a route param, and in `src/app/song/[id].tsx` read it with `useLocalSearchParams` and call `set('onboarded', true)` in a `useEffect` on mount. Verify again from step 3.

---

### Task 5: "Pair your piano" sheet on first practice

**Files:**
- Create: `src/practice/NoPianoSheet.tsx`
- Modify: `src/app/song/[id].tsx:109-121` (the `Practice` component, where `midiSources` and `settings` are already read) and `:229-247` (the JSX return)

**Interfaces:**
- Consumes: `settings.pianoPromptSeen` and `set('pianoPromptSeen', true)`; `useMidiStatus(): MidiSource[]`; `showBluetoothPairing(): Promise<void>` from `modules/piano-midi`; the `sheetLoaded` state the practice screen already keeps.
- Produces: `NoPianoSheet({ visible, onPair, onDismiss })`, a self-contained animated overlay. It is not a route: a native form sheet on an iPhone in landscape presents nearly full height, which would hide the score the board keeps visible.

- [ ] **Step 1: Build the sheet**

From the Paper *Practice · first run · no piano sheet* board: light scrim over the score, sheet on the page colour with 24 px top corners, grabber, "Pair your piano", one line, plum "Pair a Bluetooth piano" and a muted text link "Play on screen for now". Slide up over 320 ms with the scrim fading in; slide down on dismiss.

```tsx
/**
 * One-time sheet on the practice screen when no MIDI piano is connected.
 * From the Paper "Practice · first run · no piano sheet" artboard. Not a
 * route: an iPhone in landscape turns a native form sheet almost full
 * height, and the score has to stay visible above this one.
 */
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';
import { Button, Icon, Text } from '@/ui';

const SHEET_HEIGHT = 206;

type Props = {
  visible: boolean;
  onPair: () => void;
  onDismiss: () => void;
};

export function NoPianoSheet({ visible, onPair, onDismiss }: Props) {
  const { colors, radius, spacing, shadows } = useTheme();
  const insets = useSafeAreaInsets();
  const progress = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) setMounted(true);
    Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: 320,
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => { if (finished && !visible) setMounted(false); });
  }, [visible, progress]);

  if (!mounted) return null;

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [SHEET_HEIGHT + insets.bottom, 0] });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.curtain, opacity: Animated.multiply(progress, 0.28) }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} accessibilityLabel="Play on screen for now" />
      </Animated.View>
      <Animated.View
        style={[
          styles.sheet,
          shadows.card,
          {
            backgroundColor: colors.bg,
            borderTopLeftRadius: radius.xl,
            borderTopRightRadius: radius.xl,
            paddingBottom: insets.bottom + 30,
            paddingHorizontal: 56,
            gap: 18,
            transform: [{ translateY }],
          },
        ]}
      >
        <View style={[styles.grabber, { backgroundColor: colors.border }]} />
        <View style={{ alignItems: 'center', gap: 6 }}>
          <Text variant="heading" center>Pair your piano</Text>
          <Text tone="muted" center style={{ maxWidth: 560 }}>
            Turn on Bluetooth on the piano, then pick it from the list. USB works too, plug in and it connects on its own.
          </Text>
        </View>
        <View style={[styles.actions, { gap: 22, paddingTop: spacing.md }]}>
          <Button
            label="Pair a Bluetooth piano"
            variant="accent"
            iconLeft={<Icon name="bluetooth" size={16} tone="onAccent" />}
            onPress={onPair}
          />
          <Pressable onPress={onDismiss} hitSlop={12} accessibilityRole="button">
            <Text variant="bodyStrong" tone="muted">Play on screen for now</Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', paddingTop: 10 },
  grabber: { width: 36, height: 4, borderRadius: 2 },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
});
```

Add `useState` to the React import. `shadows.card` is the theme's card shadow, defined in `src/theme/tokens.ts:197`.

- [ ] **Step 2: Wire it into practice**

In `src/app/song/[id].tsx`, inside `Practice`, after the existing `const { settings, set: setSetting } = useSettings();` line:

```tsx
  // First run: offer pairing once, after the score has rendered, only when
  // no piano is connected. Closing it or connecting a piano ends it for good.
  const [promptOpen, setPromptOpen] = useState(false);
  useEffect(() => {
    if (sheetLoaded && midiSources.length === 0 && !settings.pianoPromptSeen) setPromptOpen(true);
  }, [sheetLoaded, midiSources.length, settings.pianoPromptSeen]);
  useEffect(() => {
    if (midiSources.length > 0 && promptOpen) { setPromptOpen(false); setSetting('pianoPromptSeen', true); }
  }, [midiSources.length, promptOpen, setSetting]);
  const dismissPrompt = useCallback(() => { setPromptOpen(false); setSetting('pianoPromptSeen', true); }, [setSetting]);
  const pairFromPrompt = useCallback(async () => {
    dismissPrompt();
    try { await showBluetoothPairing(); } catch { Alert.alert('Bluetooth is off', 'Turn on Bluetooth in Settings, then try again.'); }
  }, [dismissPrompt]);
```

Note: `sheetLoaded` is declared a few lines below `useSettings` in the current file; move these hooks after its declaration. Add `Alert` to the `react-native` import, `NoPianoSheet` to the imports, and `showBluetoothPairing` from `'../../../modules/piano-midi'` (the Connect tab imports it the same way).

In the JSX, after the `PianoKeyboard` block and before the closing `</View>`:

```tsx
      <NoPianoSheet visible={promptOpen} onPair={pairFromPrompt} onDismiss={dismissPrompt} />
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 4: Verify on the simulator**

The simulator has no MIDI, so the sheet shows on the first practice of a fresh install. Expected:

1. Fresh install, Welcome, Get Started, pick Ode to Joy. Practice fades in finished, then the sheet slides up over the keyboard with the score still visible above the scrim.
2. Tap "Play on screen for now". Sheet slides down. Tap keys on screen: Wait Mode advances as before.
3. Back to Library, open another piece. No sheet. Kill, relaunch, open a piece. No sheet. SQLite shows `pianoPromptSeen|true`.
4. Uninstall, run the first run again, this time tap "Pair a Bluetooth piano". Expected: the sheet closes and the alert "Bluetooth is off" appears (the simulator has no Bluetooth). Dismiss it; practice is usable; the sheet does not come back.

- [ ] **Step 5: Verify on the phone**

Delete the app from the phone (the owner does this or asks for it; it wipes their pieces). `npm run ios:device`. First run to Ode to Joy with the Casio off. Expected: sheet appears. Tap Pair: the Bluetooth permission alert appears now, then Apple's pairing list. Turn the Casio on, pick it. Expected: the pairing list is dismissed by Done, practice is live, the sheet is gone, keys pressed on the Casio light the on-screen keyboard. Kill, relaunch, open a piece: no sheet, Casio reconnects.

---

### Task 6: Connect tab, "Piano not in the list?"

**Files:**
- Modify: `src/app/(tabs)/connect.tsx:33-44` (the `pair` callback) and `:66-81` (`NotConnected`)

**Interfaces:**
- Consumes: the existing `pair()` flow and `useMidiStatus()`.
- Produces: a `help` state on the Connect tab that renders the four-line checklist under the pair button after a pairing attempt ends with no piano connected. `Linking.openSettings()` on the last line.

- [ ] **Step 1: Track a failed attempt**

In `ConnectTab`, add state and set it from `pair`:

```tsx
  const [help, setHelp] = useState(false);

  const pair = useCallback(async () => {
    try {
      await showBluetoothPairing();
    } catch {
      Alert.alert('Bluetooth is off', 'Turn on Bluetooth in Settings, then try again.');
    }
    setKnown(safeKnownDevices());
    // The list was dismissed with nothing connected: show the checklist.
    setHelp(true);
  }, []);
  useEffect(() => { if (piano) setHelp(false); }, [piano]);
```

And pass it down: `<NotConnected onPair={pair} help={help} />`.

- [ ] **Step 2: Render the checklist**

Replace `NotConnected` with:

```tsx
function NotConnected({ onPair, help }: { onPair: () => void; help: boolean }) {
  const { spacing, colors } = useTheme();
  return (
    <>
      <View style={{ gap: spacing.sm }}>
        <Text variant="heading">Pair your piano</Text>
        <Text tone="muted">Turn on Bluetooth on the piano, then pick it from the list.</Text>
      </View>
      <View style={{ gap: spacing.lg }}>
        <Button label="Pair a Bluetooth piano" variant="accent" block iconLeft={<Icon name="bluetooth" size={18} tone="onAccent" />} onPress={onPair} />
        {help ? (
          <View style={{ gap: spacing.md, paddingTop: spacing.sm }}>
            <Text variant="subheading">Piano not in the list?</Text>
            <ChecklistItem>Turn on Bluetooth MIDI on the piano.</ChecklistItem>
            <ChecklistItem>Close other music apps.</ChecklistItem>
            <ChecklistItem>Pair here, not in iOS Settings.</ChecklistItem>
            <Pressable onPress={() => Linking.openSettings()} accessibilityRole="link">
              <ChecklistItem>Allow Bluetooth for piano.learn in Settings.</ChecklistItem>
            </Pressable>
          </View>
        ) : (
          <Text variant="caption" tone="faint" center>USB works too. Plug in and it connects on its own.</Text>
        )}
      </View>
    </>
  );
}

function ChecklistItem({ children }: { children: string }) {
  const { colors, spacing } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, marginTop: 8, backgroundColor: colors.accentInk }} />
      <Text tone="muted" style={{ flex: 1 }}>{children}</Text>
    </View>
  );
}
```

Add `Linking` and `useEffect` to the imports.

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 4: Verify**

Simulator: Connect tab, tap Pair. Expected: "Bluetooth is off" alert, then after dismissing it the checklist appears under the button and the USB line is gone. Tap the last item: iOS Settings for the app opens. Phone: with the Casio off, tap Pair, Done on the empty list. Expected: checklist. Turn the Casio on, Pair again, pick it. Expected: the connected card, checklist gone.

---

### Task 7: Final checks

- [ ] **Step 1: The three checks**

```bash
npm run typecheck && npm test && npx expo-doctor
```

Expected: clean, 253 tests pass, 21/21 checks.

- [ ] **Step 2: Existing flows untouched**

On the simulator after onboarding: Library grid, search, context menu, Browse Add and open, Add music modal, Settings toggles, practice loop and hands, Listen. All as before this branch.

- [ ] **Step 3: Review**

Run `/code-review` on the branch diff before the owner reads it. Commit, merge and push only when the owner says so.

---

## Not in this plan

- "Show welcome again" in Settings. Nothing on the boards asks for it; add when wanted.
- Registering MusicXML file types so "Copy to piano.learn" works from Files and AirDrop. Separate change, separate decision.
- Skipping Welcome for an install that already has pieces. V1 has no such installs besides the owner's.
