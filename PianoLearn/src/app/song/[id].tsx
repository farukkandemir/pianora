/**
 * Song screen. For now: load the file, render the sheet, step through
 * events. Becomes the practice screen (Wait Mode + keyboard) next.
 */
import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getSong, openSong, type SongRecord } from '@/data/songs';
import { buildEvents, type PracticeEvent } from '@/engine/events';
import type { Score } from '@/engine/model';
import { SheetView, type SheetMessage, type SheetViewHandle } from '@/sheet/SheetView';

interface Loaded {
  song: SongRecord;
  xml: string;
  score: Score;
  events: PracticeEvent[];
}

export default function SongScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const sheet = useRef<SheetViewHandle>(null);
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [idx, setIdx] = useState(0);
  const [sheetReady, setSheetReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const song = await getSong(id);
        if (!song) throw new Error('Song not found');
        const { xml, score } = await openSong(song);
        if (!cancelled) setData({ song, xml, score, events: buildEvents(score, 'both') });
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  // Load into the sheet once both the file and the WebView are ready.
  useEffect(() => {
    if (data && sheetReady) sheet.current?.load(data.xml, 0.7);
  }, [data, sheetReady]);

  const showEvent = useCallback((i: number) => {
    if (!data) return;
    const e = data.events[i];
    if (!e) return;
    const m = data.score.measures[e.measureIndex];
    sheet.current?.setCursor(e.measureIndex, e.startBeat - m.startBeat);
    setIdx(i);
  }, [data]);

  const onMessage = useCallback((msg: SheetMessage) => {
    switch (msg.type) {
      case 'ready': setSheetReady(true); break;
      case 'loaded': showEvent(0); break;
      case 'measureTap': {
        const i = data?.events.findIndex((e) => e.measureIndex >= msg.measureIndex) ?? -1;
        if (i >= 0) showEvent(i);
        break;
      }
      case 'error': setError(msg.message); break;
      default: break;
    }
  }, [data, showEvent]);

  const cur = data?.events[idx];
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: data?.song.title ?? 'Song' }} />
      <SheetView ref={sheet} onMessage={onMessage} />
      <View style={styles.bar}>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Text style={styles.status}>
          {data ? `Event ${idx + 1}/${data.events.length}: ${cur?.notes.map((n) => n.pitch).join(' ') ?? ''}` : 'Loading…'}
        </Text>
        <View style={styles.row}>
          <Btn label="Prev" onPress={() => showEvent(Math.max(0, idx - 1))} />
          <Btn label="Next" onPress={() => showEvent(Math.min((data?.events.length ?? 1) - 1, idx + 1))} />
          <Btn label="Restart" onPress={() => showEvent(0)} />
        </View>
      </View>
    </View>
  );
}

function Btn({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.btn}>
      <Text style={styles.btnText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bar: { padding: 12, gap: 6, borderTopWidth: StyleSheet.hairlineWidth, borderColor: '#ccc', backgroundColor: '#fafafa' },
  status: { fontSize: 13, color: '#333' },
  error: { color: '#b00020' },
  row: { flexDirection: 'row', gap: 8, marginTop: 4 },
  btn: { flex: 1, backgroundColor: '#2f80ed', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '600' },
});
