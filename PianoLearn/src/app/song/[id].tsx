/**
 * Practice screen: sheet + on-screen keyboard + Wait Mode driven by MIDI.
 */
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { PianoKeyboard, noteLabel } from '@/components/PianoKeyboard';
import { getProgress, getSong, openSong, saveProgress, type SongRecord } from '@/data/songs';
import type { HandMode, MeasureRange, Score } from '@/engine/model';
import { PracticeControls, type LoopSelection } from '@/practice/PracticeControls';
import { PracticeTitleCard } from '@/practice/PracticeTitleCard';
import { PracticeTopBar } from '@/practice/PracticeTopBar';
import { useMidiStatus } from '@/practice/useMidiStatus';
import { usePracticeSession } from '@/practice/usePracticeSession';
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
  const [loopSel, setLoopSel] = useState<LoopSelection>({ picking: false, start: null });
  const midiSources = useMidiStatus();

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
    sheet.current?.highlightRange(loop?.start ?? null, loop?.end ?? null);
  }, [loop, sheetLoaded]);

  // Move the cursor whenever the current event changes.
  const cur = session.current;
  useEffect(() => {
    if (!sheetLoaded || !cur) return;
    const m = score.measures[cur.measureIndex];
    sheet.current?.setCursor(cur.measureIndex, cur.startBeat - m.startBeat);
  }, [cur, score, sheetLoaded]);

  const onMeasureTap = useCallback((measureIndex: number) => {
    if (loopSel.picking) {
      if (loopSel.start === null) {
        setLoopSel({ picking: true, start: measureIndex });
      } else {
        const a = Math.min(loopSel.start, measureIndex);
        const b = Math.max(loopSel.start, measureIndex);
        setLoop({ start: a, end: b });
        setLoopSel({ picking: false, start: null });
      }
      return;
    }
    session.jumpToMeasure(measureIndex);
  }, [loopSel, session]);

  const onMessage = useCallback((msg: SheetMessage) => {
    switch (msg.type) {
      case 'ready': setSheetReady(true); break;
      case 'loaded': setSheetLoaded(true); onReady(); break;
      case 'measureTap': onMeasureTap(msg.measureIndex); break;
      case 'error': onError(msg.message); break;
      default: break;
    }
  }, [onMeasureTap, onReady, onError]);

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

  const statusText = session.state.finished
    ? 'Finished! Restart to play again.'
    : cur
      ? `Play: ${session.state.remaining.map(noteLabel).join(' + ')}`
      : 'No notes for this hand selection.';
  const statusTone = session.state.finished ? 'done' : session.lastResult?.verdict === 'wrong' ? 'wrong' : 'normal';

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <PracticeTopBar
        insetLeft={insets.left}
        insetRight={insets.right}
        title={data.song.title}
        onBack={() => router.back()}
        status={statusText}
        statusTone={statusTone}
        midiName={midiSources[0]?.name ?? null}
      />
      <View style={styles.sheet}>
        <SheetView ref={sheet} onMessage={onMessage} />
      </View>
      <PracticeControls
        insetLeft={insets.left}
        insetRight={insets.right}
        handMode={handMode}
        onHandMode={setHandMode}
        loop={loop}
        loopSel={loopSel}
        onStartLoopPick={() => setLoopSel({ picking: true, start: null })}
        onClearLoop={() => { setLoop(null); setLoopSel({ picking: false, start: null }); }}
        onRestart={session.restart}
        measureNumber={cur ? score.measures[cur.measureIndex].number : ''}
        totalMeasures={score.measures.length}
        pass={cur?.pass}
      />
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  sheet: { flex: 1 },
  error: { padding: 16, color: '#b00020' },
});
