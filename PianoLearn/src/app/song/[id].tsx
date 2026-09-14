/**
 * Practice screen: sheet + on-screen keyboard + Wait Mode driven by MIDI.
 */
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { PianoKeyboard } from '@/components/PianoKeyboard';
import { LISTEN_SPEEDS } from '@/data/settings';
import { getProgress, getSong, openSong, saveProgress, type SongRecord } from '@/data/songs';
import { useSettings } from '@/data/useSettings';
import type { HandMode, MeasureRange, Score } from '@/engine/model';
import { NoPianoSheet } from '@/practice/NoPianoSheet';
import { PracticeTitleCard } from '@/practice/PracticeTitleCard';
import { PracticeTopBar } from '@/practice/PracticeTopBar';
import { useListen } from '@/practice/useListen';
import { useMidiStatus } from '@/practice/useMidiStatus';
import { usePracticeSession } from '@/practice/usePracticeSession';
import { soundingNoteAtMs } from '@/engine/timeline';
import { SheetView, type SheetMessage, type SheetViewHandle } from '@/sheet/SheetView';
import { useTheme } from '@/theme';
import { showBluetoothPairing } from '../../../modules/piano-midi';

interface Loaded {
  song: SongRecord;
  xml: string;
  score: Score;
  startMeasure: number;
  handMode: HandMode;
  loop: MeasureRange | null;
}

export default function PracticeScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [song, setSong] = useState<SongRecord | null>(null);
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const song = await getSong(id);
        if (!song) throw new Error('Song not found');
        if (cancelled) return;
        setSong(song); // title card can name the piece before the score is parsed
        const [{ xml, score }, progress] = await Promise.all([openSong(song), getProgress(id)]);
        if (cancelled) return;
        const loop = progress?.loopStart != null && progress.loopEnd != null
          ? { start: progress.loopStart, end: progress.loopEnd }
          : null;
        setData({ song, xml, score, startMeasure: progress?.lastMeasure ?? 0, handMode: progress?.handMode ?? 'both', loop });
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  // The title card covers the screen from the first frame (same colour as the
  // Library curtain) and fades out only once the sheet has actually rendered,
  // so practice appears finished: sheet, keyboard and controls together.
  const [cardGone, setCardGone] = useState(false);
  const cardOpacity = useRef(new Animated.Value(1)).current;
  const onReady = useCallback(() => {
    Animated.timing(cardOpacity, { toValue: 0, duration: 350, useNativeDriver: true }).start(({ finished }) => {
      if (finished) setCardGone(true);
    });
  }, [cardOpacity]);

  // Own SafeAreaProvider: this screen is a native modal, and the root provider
  // under it keeps the presenting screen's (portrait) insets while covered.
  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        {error && cardGone ? <Text style={[styles.error, { color: colors.wrong }]}>{error}</Text> : null}
        {data ? <Practice data={data} onReady={onReady} onError={setError} cardGone={cardGone} /> : null}
        {!cardGone ? (
          <PracticeTitleCard
            opacity={cardOpacity}
            title={song?.title}
            composer={song?.composer}
            resumeBar={data ? data.startMeasure + 1 : null}
            totalMeasures={song?.totalMeasures}
            error={error}
            onBack={() => router.back()}
          />
        ) : null}
      </View>
    </SafeAreaProvider>
  );
}

function Practice({ data, onReady, onError, cardGone }: { data: Loaded; onReady: () => void; onError: (message: string) => void; cardGone: boolean }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const sheet = useRef<SheetViewHandle>(null);
  const [sheetReady, setSheetReady] = useState(false);
  const [handMode, setHandMode] = useState<HandMode>(data.handMode);
  const [loop, setLoop] = useState<MeasureRange | null>(data.loop);
  const midiSources = useMidiStatus();
  const { settings, set: setSetting } = useSettings();

  const session = usePracticeSession(data.score, { handMode, loop }, data.startMeasure);
  const { score } = data;

  const keyRange = useMemo(() => {
    const midis = score.notes.map((n) => n.midi);
    return { low: Math.min(...midis), high: Math.max(...midis) };
  }, [score]);

  // Sheet lifecycle
  useEffect(() => {
    if (!sheetReady) return;
    sheet.current?.setPadding(insets.left, insets.right);
    sheet.current?.load(data.xml, 1);
  }, [data.xml, sheetReady, insets.left, insets.right]);

  const [sheetLoaded, setSheetLoaded] = useState(false);

  // First run: offer pairing once, after the score has rendered, only when
  // no piano is connected. Closing it or connecting a piano ends it for good.
  const [promptOpen, setPromptOpen] = useState(false);
  useEffect(() => {
    if (cardGone && midiSources.length === 0 && !settings.pianoPromptSeen) setPromptOpen(true);
  }, [cardGone, midiSources.length, settings.pianoPromptSeen]);
  useEffect(() => {
    if (midiSources.length > 0 && promptOpen) { setPromptOpen(false); setSetting('pianoPromptSeen', true); }
  }, [midiSources.length, promptOpen, setSetting]);
  const dismissPrompt = useCallback(() => { setPromptOpen(false); setSetting('pianoPromptSeen', true); }, [setSetting]);
  const pairFromPrompt = useCallback(async () => {
    dismissPrompt();
    try { await showBluetoothPairing(); } catch { Alert.alert('Bluetooth is off', 'Turn on Bluetooth in Settings, then try again.'); }
  }, [dismissPrompt]);

  useEffect(() => {
    if (!sheetLoaded) return;
    sheet.current?.setLoop(loop);
  }, [loop, sheetLoaded]);

  // Listen: the sampler reports its position ~30x a second. The cursor moves
  // only when the sounding note changes, so the viewer does one placement per
  // note instead of thirty a second, and it sits on the note you hear.
  const listenNote = useRef(-1);
  const listen = useListen(score, settings.listenSpeed, (ms) => {
    const at = soundingNoteAtMs(listenTimelineRef.current, ms);
    if (!at || at.index === listenNote.current) return;
    listenNote.current = at.index;
    sheet.current?.setCursor(at.measureIndex, at.beatInMeasure);
  });
  const listenTimelineRef = useRef(listen.timeline);
  listenTimelineRef.current = listen.timeline;
  const listening = listen.state.kind === 'playing';
  useEffect(() => { listenNote.current = -1; }, [listening]);

  // Move the cursor whenever the current event changes (and back to it after Listen ends).
  const cur = session.current;
  useEffect(() => {
    if (!sheetLoaded || !cur || listening) return;
    const m = score.measures[cur.measureIndex];
    sheet.current?.setCursor(cur.measureIndex, cur.startBeat - m.startBeat);
  }, [cur, score, sheetLoaded, listening]);

  const onMessage = useCallback((msg: SheetMessage) => {
    switch (msg.type) {
      case 'ready': setSheetReady(true); break;
      case 'loaded': setSheetLoaded(true); onReady(); break;
      case 'measureTap': session.jumpToMeasure(msg.measureIndex); break;
      case 'loop': setLoop({ start: msg.start, end: msg.end }); break;
      case 'error': onError(msg.message); break;
      default: break;
    }
  }, [session, onReady, onError]);

  // Loop starts as the current bar and the next; the score's grips take it from there.
  const toggleLoop = () => {
    if (loop) { setLoop(null); return; }
    const start = cur?.measureIndex ?? 0;
    setLoop({ start, end: Math.min(start + 1, score.measures.length - 1) });
  };

  // Persist progress on unmount and whenever the measure/settings change.
  const latest = useRef({ measure: cur?.measureIndex ?? 0, handMode, loop });
  latest.current = { measure: cur?.measureIndex ?? latest.current.measure, handMode, loop };
  useEffect(() => {
    const save = () => saveProgress({
      songId: data.song.id,
      lastMeasure: latest.current.measure,
      handMode: latest.current.handMode,
      loopStart: latest.current.loop?.start ?? null,
      loopEnd: latest.current.loop?.end ?? null,
    }).catch(() => {});
    save();
    return () => { save(); };
  }, [data.song.id, cur?.measureIndex, handMode, loop]);

  const remainingSet = new Set(session.state.remaining);
  const expectedKeys = cur ? cur.notes.filter((n) => remainingSet.has(n.midi)).map((n) => ({ midi: n.midi, hand: n.hand })) : [];

  // The keyboard shows what to play (tinted keys) and what went wrong (red);
  // the header subtitle carries the bar counter and the rare status words.
  const barNumber = cur ? score.measures[cur.measureIndex].number : '';
  const pass = cur?.pass && cur.pass > 1 ? ` · ${cur.pass}×` : '';
  const status = session.state.finished ? ' · Finished, restart to play again' : !cur ? ' · No notes for this hand' : '';
  const midi = midiSources.length === 0 ? ' · No keyboard' : '';
  const subtitle = `${data.song.composer ?? 'Unknown composer'} · Bar ${barNumber} of ${score.measures.length}${pass}${status}${midi}`;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg, paddingBottom: insets.bottom }]}>
      <PracticeTopBar
        insetLeft={insets.left}
        insetRight={insets.right}
        title={data.song.title}
        subtitle={subtitle}
        onBack={() => { listen.stop(); router.back(); }}
        handMode={handMode}
        onHandMode={setHandMode}
        loopLabel={loop ? `${score.measures[loop.start].number}–${score.measures[loop.end].number}` : null}
        onToggleLoop={toggleLoop}
        onRestart={session.restart}
        listen={listen.state}
        onToggleListen={listen.toggle}
        listenSpeed={settings.listenSpeed}
        onCycleListenSpeed={() => {
          const i = LISTEN_SPEEDS.indexOf(settings.listenSpeed);
          setSetting('listenSpeed', LISTEN_SPEEDS[(i + 1) % LISTEN_SPEEDS.length]);
        }}
      />
      <View style={styles.sheet}>
        <SheetView ref={sheet} onMessage={onMessage} />
      </View>
      {settings.showKeyboard ? (
        <PianoKeyboard
          range={keyRange}
          expected={expectedKeys}
          satisfied={session.state.satisfied}
          wrong={session.state.wrongHeld}
          held={session.state.held}
          onKeyDown={session.noteOn}
          onKeyUp={session.noteOff}
          height={84}
        />
      ) : null}
      <NoPianoSheet visible={promptOpen} onPair={pairFromPrompt} onDismiss={dismissPrompt} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  /** The score sits on the page like a sheet on a stand: inset from the chrome, rounded. */
  sheet: { flex: 1, marginHorizontal: 12, marginVertical: 10, borderRadius: 14, overflow: 'hidden' },
  error: { padding: 16 },
});
