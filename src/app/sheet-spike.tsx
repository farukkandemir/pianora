/**
 * Feasibility spike: render MusicXML with OSMD, drive the cursor from our own
 * parsed event list, tap a measure to jump. If this works, rendering is solved.
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { buildEvents } from '@/engine/events';
import { parseMusicXml } from '@/engine/musicxml/parse';
import { PIANO_XML } from '@/engine/testdata/fixtures';
import { SheetView, type SheetMessage, type SheetViewHandle } from '@/sheet/SheetView';

export default function SheetSpike() {
  const sheet = useRef<SheetViewHandle>(null);
  const score = useMemo(() => parseMusicXml(PIANO_XML), []);
  const events = useMemo(() => buildEvents(score, 'both'), [score]);
  const [idx, setIdx] = useState(0);
  const [status, setStatus] = useState('starting');

  const showEvent = useCallback((i: number) => {
    const e = events[i];
    if (!e) return;
    const m = score.measures[e.measureIndex];
    sheet.current?.setCursor(e.measureIndex, e.startBeat - m.startBeat);
    setIdx(i);
  }, [events, score]);

  const onMessage = useCallback((msg: SheetMessage) => {
    switch (msg.type) {
      case 'ready':
        sheet.current?.load(PIANO_XML, 0.7);
        setStatus('loading');
        break;
      case 'loaded':
        setStatus(`loaded: ${msg.measures} measures (parser says ${score.measures.length})`);
        sheet.current?.highlightRange(2, 2);
        showEvent(0);
        break;
      case 'cursor':
        setStatus(`cursor at measure ${msg.measureIndex}`);
        break;
      case 'measureTap': {
        const i = events.findIndex((e) => e.measureIndex >= msg.measureIndex);
        if (i >= 0) showEvent(i);
        break;
      }
      case 'error':
        setStatus(`ERROR: ${msg.message}`);
        break;
    }
  }, [events, score, showEvent]);

  const cur = events[idx];
  return (
    <View style={styles.container}>
      <SheetView ref={sheet} onMessage={onMessage} />
      <View style={styles.bar}>
        <Text style={styles.status}>{status}</Text>
        <Text style={styles.status}>
          event {idx + 1}/{events.length}: {cur?.notes.map((n) => n.pitch).join(' ')}
        </Text>
        <View style={styles.row}>
          <Btn label="Prev" onPress={() => showEvent(Math.max(0, idx - 1))} />
          <Btn label="Next" onPress={() => showEvent(Math.min(events.length - 1, idx + 1))} />
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
  row: { flexDirection: 'row', gap: 8, marginTop: 4 },
  btn: { flex: 1, backgroundColor: '#2f80ed', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '600' },
});
