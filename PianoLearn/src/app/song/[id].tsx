/**
 * Practice screen: sheet + on-screen keyboard + Wait Mode driven by MIDI.
 */
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PianoKeyboard, noteLabel } from '@/components/PianoKeyboard';
import { getProgress, getSong, openSong, saveProgress, type SongRecord } from '@/data/songs';
import type { HandMode, MeasureRange, Score } from '@/engine/model';
import { PracticeControls, type LoopSelection } from '@/practice/PracticeControls';
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
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const song = await getSong(id);
        if (!song) throw new Error('Song not found');
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

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {data ? <Practice data={data} /> : <Text style={styles.loading}>Loading…</Text>}
    </View>
  );
}

function Practice({ data }: { data: Loaded }) {
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
    if (sheetReady) sheet.current?.load(data.xml, 0.6);
  }, [data.xml, sheetReady]);

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
      case 'loaded': setSheetLoaded(true); break;
      case 'measureTap': onMeasureTap(msg.measureIndex); break;
      default: break;
    }
  }, [onMeasureTap]);

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

  const statusText = session.state.finished
    ? 'Finished! Tap restart to play again.'
    : cur
      ? `Play: ${session.state.remaining.map(noteLabel).join(' + ')}`
      : 'No notes for this hand selection.';

  return (
    <View style={[styles.container, { paddingLeft: insets.left, paddingRight: insets.right, paddingBottom: insets.bottom }]}>
      <View style={styles.sheet}>
        <SheetView ref={sheet} onMessage={onMessage} />
        <View style={styles.overlay} pointerEvents="none">
          <Text style={[styles.status, session.lastResult?.verdict === 'wrong' && styles.statusWrong]}>{statusText}</Text>
          <View style={styles.midiPill}>
            <View style={[styles.dot, { backgroundColor: midiSources.length ? '#30a46c' : '#e5484d' }]} />
            <Text style={styles.midi}>{midiSources.length ? midiSources[0].name : 'No keyboard'}</Text>
          </View>
        </View>
      </View>
      <PracticeControls
        title={data.song.title}
        onBack={() => router.back()}
        handMode={handMode}
        onHandMode={setHandMode}
        loop={loop}
        loopSel={loopSel}
        onStartLoopPick={() => setLoopSel({ picking: true, start: null })}
        onClearLoop={() => { setLoop(null); setLoopSel({ picking: false, start: null }); }}
        onRestart={session.restart}
        measureNumber={cur ? score.measures[cur.measureIndex].number : ''}
        totalMeasures={score.measures.length}
      />
      <PianoKeyboard
        range={keyRange}
        expected={session.state.remaining}
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
  overlay: { position: 'absolute', top: 4, left: 8, right: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  status: { fontSize: 13, fontWeight: '600', color: '#2f80ed', backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  statusWrong: { color: '#e5484d' },
  midiPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  midi: { fontSize: 11, color: '#666' },
  loading: { padding: 16, color: '#777' },
  error: { padding: 16, color: '#b00020' },
});
