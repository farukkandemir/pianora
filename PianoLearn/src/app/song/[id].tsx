/**
 * Practice screen: sheet + on-screen keyboard + Wait Mode driven by MIDI.
 */
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { PianoKeyboard } from '@/components/PianoKeyboard';
import { getProgress, getSong, openSong, saveProgress, type SongRecord } from '@/data/songs';
import { useSettings } from '@/data/useSettings';
import type { HandMode, MeasureRange, Score } from '@/engine/model';
import { PracticeTitleCard } from '@/practice/PracticeTitleCard';
import { PracticeTopBar } from '@/practice/PracticeTopBar';
import { useListen } from '@/practice/useListen';
import { useMidiStatus } from '@/practice/useMidiStatus';
import { usePracticeSession } from '@/practice/usePracticeSession';
import { positionAtMs } from '@/engine/timeline';
import { SheetView, type SheetMessage, type SheetViewHandle } from '@/sheet/SheetView';

interface Loaded {
  song: SongRecord;
  xml: string;
  score: Score;
  startMeasure: number;
  handMode: HandMode;
  loop: MeasureRange | null;
}

export default function PracticeScreen() {
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
        {error && cardGone ? <Text style={styles.error}>{error}</Text> : null}
        {data ? <Practice data={data} onReady={onReady} onError={setError} /> : null}
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

function Practice({ data, onReady, onError }: { data: Loaded; onReady: () => void; onError: (message: string) => void }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const sheet = useRef<SheetViewHandle>(null);
  const [sheetReady, setSheetReady] = useState(false);
  const [handMode, setHandMode] = useState<HandMode>(data.handMode);
  const [loop, setLoop] = useState<MeasureRange | null>(data.loop);
  const midiSources = useMidiStatus();
  const { settings } = useSettings();

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
  useEffect(() => {
    if (!sheetLoaded) return;
    sheet.current?.setLoop(loop);
  }, [loop, sheetLoaded]);

  // Listen: the sampler reports its position ~30x a second; the cursor follows it.
  const listen = useListen(score, (ms) => {
    const pos = positionAtMs(listenTimelineRef.current, ms);
    if (pos) sheet.current?.setCursor(pos.measureIndex, pos.beatInMeasure);
  });
  const listenTimelineRef = useRef(listen.timeline);
  listenTimelineRef.current = listen.timeline;
  const listening = listen.state.kind === 'playing';

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
      tempoPercent: 100,
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
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FCFBFD' },
  sheet: { flex: 1 },
  error: { padding: 16, color: '#b00020' },
});
